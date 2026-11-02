from __future__ import annotations
import logging
from typing import Any
from django.db.models import QuerySet
from django.shortcuts import get_object_or_404
from rest_framework import mixins, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.throttling import ScopedRateThrottle
from .constants import SHUFFLE_COUNTRY_LIMIT
from .models import Country, CountryFunFact, QuizQuestion, ReportedIssue
from .serializers import CountrySerializer, ReportedIssueSerializer
from . import ai_service

logger = logging.getLogger(__name__)


class CountryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Standard viewset for Country data. Handles the main trivia game logic.
    """

    # Explicit ordering satisfies DRF pagination requirements
    queryset = Country.objects.all().order_by("id")
    serializer_class = CountrySerializer

    def get_serializer_context(self) -> dict[str, Any]:
        context: dict[str, Any] = dict(super().get_serializer_context())
        context["game_mode"] = self.request.query_params.get("mode")
        return context

    def get_queryset(self) -> QuerySet[Country]:
        """
        Dynamically limits and shuffles the queryset based on API parameters.
        
        Why we shuffle here instead of the frontend:
        - Security & Fairness: Sending all 190+ countries to the client makes it trivial to cheat by inspecting network traffic.
        - Performance: Transferring only 20 records reduces payload size drastically, improving load times on mobile connections.
        
        How the shuffle works:
        - The `order_by("?")` translates to `ORDER BY RANDOM()` in Postgres.
        - While `ORDER BY RANDOM()` can be slow on very large tables, our Country table is small (~190 rows), 
          making this approach acceptable and efficient enough for our use case without needing complex caching.
        """
        queryset = super().get_queryset()
        shuffle = self.request.query_params.get("shuffle", "false").lower() == "true"

        if shuffle:
            # Order randomly ('?') and slice to exactly SHUFFLE_COUNTRY_LIMIT results for a standard quiz length
            return queryset.order_by("?")[:SHUFFLE_COUNTRY_LIMIT]

        return queryset

    @action(detail=True, methods=["post"], url_path="check-answer")
    def check_answer(self, request: Request, pk: str | None = None) -> Response:
        """
        Grades user answers (or handles skipped turns) and harvests AI-generated
        feedback into the database, returning the fun fact in the same round-trip.
        
        This is a complex endpoint that acts as a bridge between the user's input, 
        the AI grading service, and our persistence layer.
        
        Why this is a POST request:
        - State Change: It potentially creates new `CountryFunFact` records (JIT harvesting).
        - Security: User answers might contain sensitive or complex strings that are safer in a POST body than a GET URL.
        
        Architecture Flow:
        1. Extract the user answer (or skip flag) and determine the current game mode.
        2. Delegate the grading logic to the isolated `ai_service` module.
        3. If the AI graded the answer, intercept any extra facts it generated and save them asynchronously.
        4. Strip the extra facts from the response, attach a fun fact, and return the unified result.
        """
        country = self.get_object()
        payload = request.data if isinstance(request.data, dict) else {}
        user_answer = str(payload.get("user_answer", "")).strip()
        game_mode = str(payload.get("game_mode", "capital"))
        is_skipped = bool(payload.get("is_skipped", False))

        if game_mode not in ("capital", "country"):
            return Response(
                {"error": "Invalid game mode."}, status=status.HTTP_400_BAD_REQUEST
            )

        if is_skipped:
            primary_capital = country.capital.split("|")[0]
            feedback_message = (
                f"The capital of {country.name} is {primary_capital}"
                if game_mode == "capital"
                else f"{primary_capital} is the capital of {country.name}"
            )
            return Response(
                {
                    "is_correct": False,
                    "is_skipped": True,
                    "feedback_message": feedback_message,
                    "fun_fact": ai_service.get_fun_fact(country.name),
                    "country_name": country.name,
                }
            )

        if not user_answer:
            return Response(
                {"error": "No answer provided."}, status=status.HTTP_400_BAD_REQUEST
            )

        # 1. Dispatch grading based on mode. This keeps the view thin and delegates business logic.
        if game_mode == "capital":
            result = ai_service.grade_capital_answer(
                country.name, country.capital, user_answer
            )
        else:
            result = ai_service.grade_country_answer(
                country.name, country.capital, user_answer
            )

        # 2. Harvesting Logic: Save AI feedback as facts for future use
        if result.get("grading_method") == "ai":
            if result.get("is_correct") and result.get("feedback_message"):
                CountryFunFact.objects.get_or_create(
                    country=country,
                    fact_text=result["feedback_message"],
                    defaults={
                        "is_ai_generated": True,
                        "source": CountryFunFact.SourceChoices.USER,
                    },
                )

            if result.get("extra_facts"):
                harvest_count = 0
                for fact_text in result["extra_facts"]:
                    _, created = CountryFunFact.objects.get_or_create(
                        country=country,
                        fact_text=fact_text,
                        defaults={
                            "is_ai_generated": True,
                            "source": CountryFunFact.SourceChoices.USER,
                        },
                    )
                    if created:
                        harvest_count += 1

                if harvest_count > 0:
                    logger.info(
                        f"Harvested {harvest_count} new facts for {country.name} from live user."
                    )

            # Remove extra_facts from response before sending to frontend
            result.pop("extra_facts", None)

        result["fun_fact"] = ai_service.get_fun_fact(country.name)
        result["country_name"] = country.name
        return Response(result)

    @action(detail=True, methods=["get"], url_path="fun-fact")
    def fun_fact(self, request: Request, pk: str | None = None) -> Response:
        """
        Retrieves a fun fact for a specific country, triggering JIT harvesting if needed.
        """
        country = self.get_object()
        fact_text = ai_service.get_fun_fact(country.name)

        return Response(
            {"fact": fact_text, "fun_fact": fact_text}
        )


class AIQuizViewSet(viewsets.ViewSet):
    """
    Handles fetching pre-generated AI quizzes (F1, EPL, Caribbean History) from the DB.
    """

    @action(detail=False, methods=["get"])
    def generate(self, request: Request) -> Response:
        topic = request.query_params.get("topic", "World Geography")
        quiz_data = ai_service.generate_ai_quiz(topic)

        if isinstance(quiz_data, dict) and "error" in quiz_data:
            return Response(quiz_data, status=status.HTTP_400_BAD_REQUEST)

        return Response(quiz_data)

    @action(detail=True, methods=["post"], url_path="check-answer")
    def check_answer(self, request: Request, pk: str | None = None) -> Response:
        question = get_object_or_404(QuizQuestion, pk=pk)
        payload = request.data if isinstance(request.data, dict) else {}
        user_answer = str(payload.get("user_answer", "")).strip().lower()
        correct_answer = question.correct_answer.strip().lower()
        
        is_correct = user_answer == correct_answer
        
        return Response({
            "is_correct": is_correct,
            "correct_answer": question.correct_answer,
            "fun_fact": question.fun_fact,
        })


class ReportedIssueViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    """
    Handles the user bug reporting system (POST-only with rate limiting).
    """

    http_method_names = ["post", "options"]
    queryset = ReportedIssue.objects.all().order_by("-created_at")
    serializer_class = ReportedIssueSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "contact"

