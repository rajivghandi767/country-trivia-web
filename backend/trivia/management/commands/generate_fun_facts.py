from __future__ import annotations

import json
from typing import Any

from django.core.management.base import BaseCommand
from django.db import models
from django.db.models import QuerySet
from trivia.ai_service import _generate_ai_json
from trivia.constants import FACT_BATCH_SIZE, FACT_STOCK_LIMIT
from trivia.models import Country, CountryFunFact


class Command(BaseCommand):
    help = "Generates fun facts using Gemini AI and saves them to the database"

    def handle(self, *args: Any, **kwargs: Any) -> None:
        # Prioritize countries that haven't reached the target limit
        countries_to_process: QuerySet[Country] = (
            Country.objects.annotate(fact_count=models.Count("fun_facts"))
            .filter(fact_count__lt=FACT_STOCK_LIMIT)
            .order_by("fact_count")[:FACT_BATCH_SIZE]
        )

        # Rolling Refresh: If all countries are full, pick a random batch to update
        if not countries_to_process:
            self.stdout.write(
                f"♻️ All countries at capacity ({FACT_STOCK_LIMIT}). Initiating rolling refresh..."
            )
            # Order by '?' picks random countries so the whole database refreshes evenly over time
            countries_to_process = Country.objects.order_by("?")[:FACT_BATCH_SIZE]
        else:
            self.stdout.write(
                f"📈 Filling stock. Target limit: {FACT_STOCK_LIMIT} per country."
            )

        country_names = [c.name for c in countries_to_process]
        self.stdout.write(f"Generating facts for: {', '.join(country_names)}")

        # Construct the generation prompt
        prompt = f"""
        You are a trivia host. Generate one unique, lesser-known, and interesting "Did you know?" fun fact for each of the following countries: {json.dumps(country_names)}.
        The fact must be related to geography, history, science, football (soccer), or Formula 1.
        The fact must be 1-2 sentences long. Start the fact with "Did you know".
        Return ONLY a JSON object where the keys are the exact country names, and the values are the facts.
        """

        try:
            result_json = _generate_ai_json(prompt, temperature=0.8)

            for country in countries_to_process:
                if country.name in result_json:
                    new_fact_text = result_json[country.name]

                    # Deduplication check
                    if not CountryFunFact.objects.filter(
                        country=country, fact_text=new_fact_text
                    ).exists():
                        # Rotation Logic: Delete the oldest fact if at capacity
                        if country.fun_facts.count() >= FACT_STOCK_LIMIT:
                            oldest_fact = country.fun_facts.order_by(
                                "created_at"
                            ).first()
                            if oldest_fact:
                                oldest_fact.delete()

                        # Save the new fact
                        CountryFunFact.objects.create(
                            country=country,
                            fact_text=new_fact_text,
                            is_ai_generated=True,
                            source=CountryFunFact.SourceChoices.JENKINS,
                        )
                        self.stdout.write(
                            self.style.SUCCESS(f"Saved new fact for {country.name}")
                        )
                    else:
                        self.stdout.write(
                            self.style.WARNING(
                                f"Duplicate fact skipped for {country.name}"
                            )
                        )

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Error generating facts: {e}"))

