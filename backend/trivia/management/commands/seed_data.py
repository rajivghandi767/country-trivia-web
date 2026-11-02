from __future__ import annotations

from typing import Any

from django.core.management import call_command
from django.core.management.base import BaseCommand
from trivia.models import Country, QuizQuestion, QuizTopic


class Command(BaseCommand):
    help = "Seeds initial database data"

    def handle(self, *args: Any, **kwargs: Any) -> None:
        self.stdout.write("🧹 Wiping existing data to ensure a fresh state...")
        QuizQuestion.objects.all().delete()
        QuizTopic.objects.all().delete()
        Country.objects.all().delete()

        self.stdout.write("Seeding country data...")
        call_command("load_country_data")
        self.stdout.write(
            self.style.SUCCESS("Database seeding completed successfully.")
        )

