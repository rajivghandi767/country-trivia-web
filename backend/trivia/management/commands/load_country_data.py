import csv
from django.core.management.base import BaseCommand
from trivia.models import Country
import os


class Command(BaseCommand):
    help = 'Loads Country Data from a CSV file into the database'

    def handle(self, *args, **kwargs):
        # Path to the data file, assuming it's in a 'data' directory at the project root
        file_path = os.path.join('data', 'country_capitals.csv')

        Country.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(
            'Successfully cleared existing country data.'))

        with open(file_path, mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            countries_to_create = []
            for row in reader:

                if not row['Country'] or not row['Capital']:
                    continue

                country = Country(
                    name=row['Country'].strip(),
                    capital=row['Capital'].strip(),
                    continent=row['Continent'].strip()
                )
                countries_to_create.append(country)

            Country.objects.bulk_create(countries_to_create)

        self.stdout.write(self.style.SUCCESS(
            f'Successfully loaded {len(countries_to_create)} countries.'))
