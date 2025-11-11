from rest_framework import viewsets, status
from .models import Country
from .serializers import CountrySerializer
import random
from rest_framework.decorators import action
from rest_framework.response import Response
from . import ai_service
import logging

logger = logging.getLogger(__name__)


class CountryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    A simple ViewSet for viewing countries.
    """
    queryset = Country.objects.all()
    serializer_class = CountrySerializer

    def get_queryset(self):
        """
        Optionally shuffles the queryset if the 'shuffle' query param is set.
        """
        queryset = super().get_queryset()
        if self.request.query_params.get('shuffle'):
            # Convert queryset to a list to shuffle
            country_list = list(queryset)
            random.shuffle(country_list)
            return country_list[:20]
        return queryset

    @action(detail=True, methods=['post'], url_path='check-answer')
    def check_answer(self, request, pk=None):
        """
        Receives a user's answer for a specific country and grades it using AI.
        """
        try:
            country = self.get_object()
        except Country.DoesNotExist:
            return Response({"error": "Country not found"}, status=status.HTTP_404_NOT_FOUND)

        user_answer = request.data.get('user_answer', None)
        game_mode = request.data.get('game_mode', 'capital')  # Get game_mode

        if user_answer is None:
            return Response({"error": "user_answer is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if game_mode == 'country':
                # --- Call the country grader ---
                grading_result = ai_service.grade_country_answer(
                    correct_country_name=country.name,
                    correct_capitals_str=country.capital,
                    user_answer_str=user_answer
                )
            else:
                grading_result = ai_service.grade_capital_answer(
                    country_name=country.name,
                    correct_capitals_str=country.capital,
                    user_answer_str=user_answer
                )

            return Response(grading_result, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(
                f"Error in check_answer view for {country.name}: {e}", exc_info=True)
            return Response({"error": "An internal error occurred while grading the answer."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], url_path='fun-fact')
    def fun_fact(self, request, pk=None):
        """
        Generates a fun fact for a specific country.
        """
        try:
            country = self.get_object()
        except Country.DoesNotExist:
            return Response({"error": "Country not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            fact = ai_service.get_fun_fact(country.name)
            return Response({"fact": fact}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(
                f"Error in fun_fact view for {country.name}: {e}", exc_info=True)
            return Response({"error": "An internal error occurred while generating a fun fact."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AIQuizViewSet(viewsets.ViewSet):
    """
    A ViewSet for generating AI-powered quizzes.
    """

    @action(detail=False, methods=['get'], url_path='generate')
    def generate_quiz(self, request):
        """
        Generates a 5-question quiz based on a topic.
        e.g., /api/ai-quiz/generate/?topic=Formula 1
        """
        topic = request.query_params.get('topic', 'World Geography')
        fresh = request.query_params.get('fresh', 'false').lower() == 'true'

        try:
            quiz_data = ai_service.generate_ai_quiz(topic, fresh=fresh)
            if "error" in quiz_data:
                return Response(quiz_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response(quiz_data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(
                f"Error in generate_quiz view for {topic}: {e}", exc_info=True)
            return Response({"error": "An internal error occurred while generating the quiz."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
