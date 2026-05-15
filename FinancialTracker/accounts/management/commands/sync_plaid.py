"""Scheduled fallback refresh for every linked institution.

Run periodically (Windows Task Scheduler / cron / Celery beat):
    python manage.py sync_plaid           # sync inline now
    python manage.py sync_plaid --async   # enqueue Celery tasks instead
"""

from django.core.management.base import BaseCommand

from accounts.models import PlaidItem


class Command(BaseCommand):
    help = "Refresh balances and transactions for all linked Plaid items."

    def add_arguments(self, parser):
        parser.add_argument(
            "--async",
            action="store_true",
            dest="use_async",
            help="Enqueue Celery tasks instead of syncing inline.",
        )

    def handle(self, *args, **options):
        items = PlaidItem.objects.exclude(status=PlaidItem.Status.ERROR)
        if not items:
            self.stdout.write("No linked institutions to sync.")
            return

        if options["use_async"]:
            from api.tasks import sync_plaid_item

            for item in items:
                sync_plaid_item.delay(item.id)
            self.stdout.write(self.style.SUCCESS(f"Queued {len(items)} sync task(s)."))
            return

        from api.plaid_sync import sync_item

        for item in items:
            result = sync_item(item)
            label = item.institution_name or item.item_id
            if result.get("ok"):
                self.stdout.write(
                    self.style.SUCCESS(
                        f"{label}: +{result.get('added', 0)} "
                        f"~{result.get('modified', 0)} -{result.get('removed', 0)}"
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f"{label}: {result.get('error', 'failed')}")
                )
