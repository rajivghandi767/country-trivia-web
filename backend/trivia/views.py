import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Country, CountryFunFact, ReportedIssue
from .serializers import CountrySerializer, ReportedIssueSerializer
from . import ai_service

logger = logging.getLogger(__name__)


class CountryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Standard viewset for Country data. Handles the main trivia game logic.
    """
    # Explicit ordering satisfies DRF pagination requirements
    queryset = Country.objects.all().order_by('id')
    serializer_class = CountrySerializer

    def get_queryset(self):
        """
        Dynamically limits and shuffles the queryset based on API parameters.
        20-question quiz length while ensuring a fresh 
        set of questions every time a user starts a new game.
        """
        queryset = super().get_queryset()
        shuffle = self.request.query_params.get(
            'shuffle', 'false').lower() == 'true'

        if shuffle:
            # Order randomly ('?') and slice to exactly 20 results
            return queryset.order_by('?')[:20]

        return queryset

    @action(detail=True, methods=['post'], url_path='check-answer')
    def check_answer(self, request, pk=None):
        """
        Grades user answers and harvests AI-generated feedback into the database.
        """
        country = self.get_object()
        user_answer = request.data.get('user_answer', '').strip()
        game_mode = request.data.get('game_mode', 'capital')

        if not user_answer:
            return Response({"error": "No answer provided."}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Dispatch grading based on mode
        if game_mode == 'capital':
            result = ai_service.grade_capital_answer(
                country.name, country.capital, user_answer)
        elif game_mode == 'country':
            result = ai_service.grade_country_answer(
                country.name, country.capital, user_answer)
        else:
            return Response({"error": "Invalid game mode."}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Harvesting Logic: Save AI feedback as facts for future use
        if result.get('grading_method') == 'ai':
            if result.get('is_correct') and result.get('feedback_message'):
                CountryFunFact.objects.get_or_create(
                    country=country,
                    fact_text=result['feedback_message'],
                    defaults={'is_ai_generated': True, 'source': 'user'}
                )

            if result.get('extra_facts'):
                harvest_count = 0
                for fact_text in result['extra_facts']:
                    _, created = CountryFunFact.objects.get_or_create(
                        country=country,
                        fact_text=fact_text,
                        defaults={'is_ai_generated': True, 'source': 'user'}
                    )
                    if created:
                        harvest_count += 1

                if harvest_count > 0:
                    logger.info(
                        f"Harvested {harvest_count} new facts for {country.name} from live user.")

            # Remove extra_facts from response before sending to frontend
            result.pop('extra_facts', None)

        return Response(result)

    @action(detail=True, methods=['get'], url_path='fun-fact')
    def fun_fact(self, request, pk=None):
        """
        Retrieves a fun fact for a specific country, triggering JIT harvesting if needed.
        """
        country = self.get_object()
        fact_text = ai_service.get_fun_fact(country.name)

        return Response({
            "fact": fact_text,
            "fun_fact": fact_text,
            "funFact": fact_text
        })


class AIQuizViewSet(viewsets.ViewSet):
    """
    Handles fetching pre-generated AI quizzes (F1, EPL, Caribbean History) from the DB.
    """
    @action(detail=False, methods=['get'])
    def generate(self, request):
        topic = request.query_params.get('topic', 'World Geography')
        quiz_data = ai_service.generate_ai_quiz(topic)

        if isinstance(quiz_data, dict) and "error" in quiz_data:
            return Response(quiz_data, status=status.HTTP_400_BAD_REQUEST)

        return Response(quiz_data)


class ReportedIssueViewSet(viewsets.ModelViewSet):
    """
    Handles the user bug reporting system.
    """
    queryset = ReportedIssue.objects.all().order_by('-created_at')
    serializer_class = ReportedIssueSerializer
