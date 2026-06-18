from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seeds initial database data"

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding country data...")
        call_command("load_country_data")
        self.stdout.write(
            self.style.SUCCESS("Database seeding completed successfully.")
        )
