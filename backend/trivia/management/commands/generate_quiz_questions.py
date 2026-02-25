import json
from django.core.management.base import BaseCommand
from trivia.models import QuizTopic, QuizQuestion
from trivia.ai_service import _generate_ai_json


class Command(BaseCommand):
    help = 'Generates AI quiz questions for the frontend topics.'

    def handle(self, *args, **kwargs):
        core_topics = [
            "Formula 1",
            "Caribbean History",
            "English Premier League"
        ]

        for topic_name in core_topics:
            # Add the defaults dictionary so Django knows what to name the new row!
            topic, _ = QuizTopic.objects.get_or_create(
                name__iexact=topic_name,
                defaults={'name': topic_name}
            )

            # Skip if we already have a healthy pool for this topic
            if topic.questions.count() >= 50:
                self.stdout.write(
                    f"⏭️ Skipping {topic_name}, already well-stocked.")
                continue

            self.stdout.write(f"🚀 Generating batch for: {topic_name}")

            prompt = f"""
            Generate a JSON list of EXACTLY 15 unique multiple-choice trivia questions for {topic_name}.
            STRICT QUALITY REQUIREMENTS:
            1. DIVERSITY: Mix easy, medium, and challenging questions. 
            2. FACT CHECK: Use historical/static data (Knowledge Cutoff Jan 2025).
            3. FORMAT: [{{"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "...", "funFact": "..."}}]
            
            CRITICAL: Ensure the JSON is perfectly formatted. Do not include stray characters or markdown blocks. 
            Ensure every opening quote has a matching closing quote.
            """

            try:

                quiz_data = _generate_ai_json(
                    prompt, temperature=0.7, max_tokens=6000)

                saved = 0
                for item in quiz_data:
                    # Deduplication check
                    if not QuizQuestion.objects.filter(topic=topic, question_text=item['question']).exists():
                        QuizQuestion.objects.create(
                            topic=topic,
                            question_text=item['question'],
                            options=item['options'],
                            correct_answer=item['correctAnswer'],
                            fun_fact=item['funFact']
                        )
                        saved += 1

                self.stdout.write(self.style.SUCCESS(
                    f"✅ Saved {saved} new questions for {topic_name}"))

            except Exception as e:
                self.stderr.write(self.style.ERROR(
                    f"❌ Error generating questions for {topic_name}: {e}"))
