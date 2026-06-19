from django.test import TestCase
from rest_framework.test import APIClient
from django.urls import reverse
from trivia.models import QuizTopic, QuizQuestion

class AIQuizTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.topic = QuizTopic.objects.create(name="World Geography")
        self.question = QuizQuestion.objects.create(
            topic=self.topic,
            question_text="What is the capital of France?",
            options=["Paris", "London", "Berlin", "Madrid"],
            correct_answer="Paris",
            fun_fact="Paris is known as the city of light."
        )
        for i in range(9):
            QuizQuestion.objects.create(
                topic=self.topic,
                question_text=f"Question {i}",
                options=["A", "B", "C", "D"],
                correct_answer="A",
                fun_fact="Fact"
            )

    def test_generate_quiz(self) -> None:
        response = self.client.get('/api/ai-quiz/generate/?topic=World Geography')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 10)
        self.assertNotIn('correctAnswer', data[0])
        self.assertNotIn('funFact', data[0])
        self.assertIn('options', data[0])

    def test_check_answer_correct(self) -> None:
        response = self.client.post(f'/api/ai-quiz/{self.question.id}/check-answer/', {'user_answer': 'Paris'})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['is_correct'])
        self.assertEqual(data['correct_answer'], 'Paris')
        self.assertEqual(data['fun_fact'], 'Paris is known as the city of light.')

    def test_check_answer_incorrect(self) -> None:
        response = self.client.post(f'/api/ai-quiz/{self.question.id}/check-answer/', {'user_answer': 'London'})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data['is_correct'])
        self.assertEqual(data['correct_answer'], 'Paris')
        self.assertEqual(data['fun_fact'], 'Paris is known as the city of light.')
