from __future__ import annotations

from django.test import TestCase
from rest_framework.test import APIClient
from trivia.constants import MAX_ISSUE_NOTE_LENGTH
from trivia.models import Country, CountryFunFact, QuizQuestion, QuizTopic, ReportedIssue


class AIQuizTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.topic = QuizTopic.objects.create(name="World Geography")
        self.question = QuizQuestion.objects.create(
            topic=self.topic,
            question_text="What is the capital of France?",
            options=["Paris", "London", "Berlin", "Madrid"],
            correct_answer="Paris",
            fun_fact="Paris is known as the city of light.",
        )
        for i in range(9):
            QuizQuestion.objects.create(
                topic=self.topic,
                question_text=f"Question {i}",
                options=["A", "B", "C", "D"],
                correct_answer="A",
                fun_fact="Fact",
            )

    def test_generate_quiz(self) -> None:
        response = self.client.get("/api/ai-quiz/generate/?topic=World Geography")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 10)
        self.assertNotIn("correctAnswer", data[0])
        self.assertNotIn("funFact", data[0])
        self.assertIn("options", data[0])

    def test_check_answer_correct(self) -> None:
        response = self.client.post(
            f"/api/ai-quiz/{self.question.id}/check-answer/",
            {"user_answer": "Paris"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["is_correct"])
        self.assertEqual(data["correct_answer"], "Paris")
        self.assertEqual(data["fun_fact"], "Paris is known as the city of light.")

    def test_check_answer_incorrect(self) -> None:
        response = self.client.post(
            f"/api/ai-quiz/{self.question.id}/check-answer/",
            {"user_answer": "London"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["is_correct"])
        self.assertEqual(data["correct_answer"], "Paris")
        self.assertEqual(data["fun_fact"], "Paris is known as the city of light.")


class CountryTriviaTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.country = Country.objects.create(
            name="South Africa",
            capital="Pretoria|Cape Town|Bloemfontein",
            continent="Africa",
        )
        self.uk = Country.objects.create(
            name="United Kingdom",
            capital="London",
            continent="Europe",
        )
        CountryFunFact.objects.create(
            country=self.country,
            fact_text="Did you know South Africa has three capital cities?",
            is_ai_generated=False,
            source=CountryFunFact.SourceChoices.JENKINS,
        )

    def test_shuffled_countries_masks_capital_in_capital_mode(self) -> None:
        response = self.client.get("/api/trivia/?shuffle=true&mode=capital")
        self.assertEqual(response.status_code, 200)
        results = response.json()["results"]
        self.assertEqual(len(results), 2)
        for item in results:
            self.assertTrue(item["name"])
            self.assertEqual(item["capital"], "")

    def test_shuffled_countries_masks_name_and_normalizes_capital_in_country_mode(
        self,
    ) -> None:
        response = self.client.get("/api/trivia/?shuffle=true&mode=country")
        self.assertEqual(response.status_code, 200)
        results = response.json()["results"]
        sa_item = next(item for item in results if item["id"] == self.country.id)
        self.assertEqual(sa_item["name"], "")
        self.assertEqual(sa_item["capital"], "Pretoria")

    def test_check_answer_deterministic_and_fuzzy_with_fun_fact(self) -> None:
        response = self.client.post(
            f"/api/trivia/{self.country.id}/check-answer/",
            {"user_answer": "Pretoria", "game_mode": "capital"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["is_correct"])
        self.assertEqual(data["grading_method"], "deterministic")
        self.assertEqual(
            data["fun_fact"],
            "Did you know South Africa has three capital cities?",
        )
        self.assertEqual(data["country_name"], "South Africa")

    def test_check_answer_country_alias(self) -> None:
        response = self.client.post(
            f"/api/trivia/{self.uk.id}/check-answer/",
            {"user_answer": "UK", "game_mode": "country"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["is_correct"])
        self.assertEqual(data["grading_method"], "deterministic")

    def test_check_answer_skip_capital_and_country_modes(self) -> None:
        cap_skip = self.client.post(
            f"/api/trivia/{self.country.id}/check-answer/",
            {"user_answer": "", "game_mode": "capital", "is_skipped": True},
            format="json",
        )
        self.assertEqual(cap_skip.status_code, 200)
        cap_data = cap_skip.json()
        self.assertFalse(cap_data["is_correct"])
        self.assertTrue(cap_data["is_skipped"])
        self.assertEqual(
            cap_data["feedback_message"],
            "The capital of South Africa is Pretoria",
        )
        self.assertIn("fun_fact", cap_data)

        country_skip = self.client.post(
            f"/api/trivia/{self.country.id}/check-answer/",
            {"user_answer": "", "game_mode": "country", "is_skipped": True},
            format="json",
        )
        self.assertEqual(country_skip.status_code, 200)
        country_data = country_skip.json()
        self.assertEqual(
            country_data["feedback_message"],
            "Pretoria is the capital of South Africa",
        )

    def test_check_answer_missing_payload_returns_400(self) -> None:
        response = self.client.post(
            f"/api/trivia/{self.country.id}/check-answer/",
            {},
            format="json",
        )
        self.assertEqual(response.status_code, 400)


class ReportedIssueSecurityTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()

    def test_report_issue_post_ignores_readonly_fields(self) -> None:
        response = self.client.post(
            "/api/report-issue/",
            {
                "issue_type": "fact_error",
                "country_name": "France",
                "user_note": "Fact needs update",
                "resolved": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        issue = ReportedIssue.objects.get()
        self.assertFalse(issue.resolved)

    def test_report_issue_get_not_allowed(self) -> None:
        response = self.client.get("/api/report-issue/")
        self.assertEqual(response.status_code, 405)

    def test_report_issue_note_max_length(self) -> None:
        response = self.client.post(
            "/api/report-issue/",
            {
                "issue_type": "typo",
                "user_note": "x" * (MAX_ISSUE_NOTE_LENGTH + 1),
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

