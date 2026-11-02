from __future__ import annotations

import csv
import os
from typing import Any

from django.core.cache import cache
from django.core.management.base import BaseCommand
from trivia.models import Country


class Command(BaseCommand):
    help = "Loads Country Data from a CSV file into the database"

    def handle(self, *args: Any, **kwargs: Any) -> None:
        file_path = os.path.join("data", "country_capitals.csv")

        if Country.objects.exists():
            self.stdout.write(
                self.style.SUCCESS("Country data already exists. Skipping load.")
            )
            return

        with open(file_path, mode="r", encoding="utf-8") as file:
            reader = csv.DictReader(file)
            countries_to_create: list[Country] = []
            for row in reader:
                if not row["Country"] or not row["Capital"]:
                    continue

                country = Country(
                    name=row["Country"].strip(),
                    capital=row["Capital"].strip(),
                    continent=row["Continent"].strip(),
                )
                countries_to_create.append(country)

            Country.objects.bulk_create(countries_to_create)

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully loaded {len(countries_to_create)} countries."
            )
        )

        cache.clear()
        self.stdout.write(self.style.SUCCESS("Cleared Redis cache."))

