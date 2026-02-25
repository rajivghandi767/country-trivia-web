import json
from django.core.management.base import BaseCommand
from trivia.models import QuizTopic, QuizQuestion
from trivia.ai_service import _generate_ai_json


class Command(BaseCommand):
    help = 'Generates batches of quiz questions using Gemini AI and saves them to the DB'

    def handle(self, *args, **kwargs):
        # Define the topics you want to support in your app
        core_topics = ["World Geography", "Formula 1", "Caribbean History"]

        for topic_name in core_topics:
            topic, created = QuizTopic.objects.get_or_create(name=topic_name)

            # Target pool size: Skip if we already have 50+ questions for this topic
            if topic.questions.count() >= 50:
                self.stdout.write(f"Topic '{topic_name}' is well stocked.")
                continue

            self.stdout.write(f"Generating 15 new questions for: {topic_name}")

            # The prompt includes the Knowledge Cutoff directive
            prompt = f"""
            You are a trivia game API. Generate a list of 15 multiple-choice trivia questions about {topic_name}.
            
            **CRITICAL Guiding Principles:**
            1. Knowledge Cutoff constraint: Do NOT generate questions about current events, active sports records, or political leaders that are subject to change after January 2025. Focus entirely on historical, geographical, or static facts.
            2. Single Correct Answer: Each question MUST have only one indisputably correct answer from the provided options.
            3. Unambiguous Options: Provide exactly 4 clear options.
            
            **JSON Output Format:** A single JSON list `[...]`.
            Each object must have exactly: "question" (str), "options" (list of 4 strs), "correctAnswer" (str), "funFact" (str).
            **CRITICAL: Respond ONLY with the raw JSON list.**
            """

            try:
                # Use a larger max_tokens since we are requesting 15 full question objects
                quiz_data = _generate_ai_json(
                    prompt, temperature=0.7, max_tokens=4096)

                saved_count = 0
                for item in quiz_data:
                    # Prevent duplicate questions
                    if not QuizQuestion.objects.filter(topic=topic, question_text=item['question']).exists():
                        QuizQuestion.objects.create(
                            topic=topic,
                            question_text=item['question'],
                            options=item['options'],
                            correct_answer=item['correctAnswer'],
                            fun_fact=item['funFact']
                        )
                        saved_count += 1

                self.stdout.write(self.style.SUCCESS(
                    f"Saved {saved_count} new questions for {topic_name}"))

                # Stop after generating one topic per run to conserve daily API requests
                break

            except Exception as e:
                self.stderr.write(self.style.ERROR(
                    f"Error generating questions for {topic_name}: {e}"))
