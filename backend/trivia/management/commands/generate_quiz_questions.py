from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand
from trivia.ai_service import _generate_ai_json
from trivia.constants import CORE_QUIZ_TOPICS, QUIZ_BATCH_SIZE, QUIZ_STOCK_LIMIT
from trivia.models import QuizQuestion, QuizTopic


class Command(BaseCommand):
    help = "Generates AI quiz questions for the frontend topics."

    def handle(self, *args: Any, **kwargs: Any) -> None:
        for topic_name in CORE_QUIZ_TOPICS:
            topic, _ = QuizTopic.objects.get_or_create(
                name__iexact=topic_name, defaults={"name": topic_name}
            )

            current_count = topic.questions.count()

            # Rolling Refresh: If we are at or above the limit, delete the oldest batch
            if current_count >= QUIZ_STOCK_LIMIT:
                self.stdout.write(
                    f"♻️ Stock limit reached ({QUIZ_STOCK_LIMIT}) for {topic_name}. Rotating oldest {QUIZ_BATCH_SIZE} questions..."
                )

                # Fetch the IDs of the oldest questions
                oldest_questions = topic.questions.order_by("created_at").values_list(
                    "id", flat=True
                )[:QUIZ_BATCH_SIZE]

                # Delete them to make room for the new batch
                QuizQuestion.objects.filter(id__in=list(oldest_questions)).delete()
            else:
                self.stdout.write(
                    f"📈 {topic_name} stock at {current_count}/{QUIZ_STOCK_LIMIT}. Generating more..."
                )

            self.stdout.write(f"🚀 Generating batch of {QUIZ_BATCH_SIZE} for: {topic_name}")

            prompt = f"""
            Generate a JSON list of EXACTLY {QUIZ_BATCH_SIZE} unique multiple-choice trivia questions for {topic_name}.
            STRICT QUALITY REQUIREMENTS:
            1. DIVERSITY: Mix easy, medium, and challenging questions. 
            2. FACT CHECK: Use historical/static data (Knowledge Cutoff Jan 2025).
            3. FORMAT: [{{"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "...", "funFact": "..."}}]
            
            CRITICAL: Ensure the JSON is perfectly formatted. Do not include stray characters or markdown blocks. 
            Ensure every opening quote has a matching closing quote.
            """

            try:
                quiz_data = _generate_ai_json(prompt, temperature=0.7, max_tokens=6000)

                saved = 0
                for item in quiz_data:
                    if not isinstance(item, dict):
                        continue
                    # Deduplication check
                    if not QuizQuestion.objects.filter(
                        topic=topic, question_text=item["question"]
                    ).exists():
                        QuizQuestion.objects.create(
                            topic=topic,
                            question_text=item["question"],
                            options=item["options"],
                            correct_answer=item["correctAnswer"],
                            fun_fact=item["funFact"],
                        )
                        saved += 1

                self.stdout.write(
                    self.style.SUCCESS(
                        f"✅ Saved {saved} new questions for {topic_name}"
                    )
                )

            except Exception as e:
                self.stderr.write(
                    self.style.ERROR(
                        f"❌ Error generating questions for {topic_name}: {e}"
                    )
                )

