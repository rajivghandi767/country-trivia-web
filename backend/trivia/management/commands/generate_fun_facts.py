import json
from django.core.management.base import BaseCommand
from django.db import models
from trivia.models import Country, CountryFunFact
from trivia.ai_service import _generate_ai_json


class Command(BaseCommand):
    help = 'Generates fun facts using Gemini AI and saves them to the database'

    def handle(self, *args, **kwargs):
        # 1. Target 25 countries that have fewer than 10 facts.
        countries_needing_facts = Country.objects.annotate(
            fact_count=models.Count('fun_facts')
        ).filter(fact_count__lt=10).order_by('fact_count')[:25]

        if not countries_needing_facts:
            self.stdout.write(self.style.SUCCESS(
                'All countries have reached the target number of fun facts!'))
            return

        country_names = [c.name for c in countries_needing_facts]
        self.stdout.write(f"Generating facts for: {', '.join(country_names)}")

        # 2. The Prompt
        prompt = f"""
        You are a trivia host. Generate one unique, lesser-known, and interesting "Did you know?" fun fact for each of the following countries: {json.dumps(country_names)}.
        The fact must be related to geography, history, science, football (soccer), or Formula 1.
        The fact must be 1-2 sentences long. Start the fact with "Did you know".
        Return ONLY a JSON object where the keys are the exact country names, and the values are the facts.
        """

        try:
            result_json = _generate_ai_json(prompt, temperature=0.8)

            for country in countries_needing_facts:
                if country.name in result_json:
                    new_fact_text = result_json[country.name]

                    # 3. FIX: Changed 'fact' to 'fact_text' in the filter
                    if not CountryFunFact.objects.filter(country=country, fact_text=new_fact_text).exists():

                        # FIX: Changed 'fact' to 'fact_text' and added our tracking fields
                        CountryFunFact.objects.create(
                            country=country,
                            fact_text=new_fact_text,
                            is_ai_generated=True,
                            source='jenkins'
                        )
                        self.stdout.write(self.style.SUCCESS(
                            f"Saved new fact for {country.name}"))
                    else:
                        self.stdout.write(self.style.WARNING(
                            f"Duplicate fact skipped for {country.name}"))

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Error generating facts: {e}"))
