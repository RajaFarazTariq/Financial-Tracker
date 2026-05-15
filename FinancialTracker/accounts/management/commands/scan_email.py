"""Scheduled fallback: scan all configured inboxes for bank-alert emails.

Use this if you don't run Celery Beat. Schedule via Task Scheduler / cron:
    python manage.py scan_email
    python manage.py scan_email --async   # enqueue Celery tasks instead
"""

from django.core.management.base import BaseCommand

from accounts.models import EmailInbox


class Command(BaseCommand):
    help = "Poll every configured email inbox for new bank transaction alerts."

    def add_arguments(self, parser):
        parser.add_argument(
            "--async",
            action="store_true",
            dest="use_async",
            help="Enqueue Celery tasks instead of scanning inline.",
        )

    def handle(self, *args, **options):
        inboxes = EmailInbox.objects.exclude(status=EmailInbox.Status.AUTH_ERROR)
        if not inboxes:
            self.stdout.write("No configured inboxes to scan.")
            return

        if options["use_async"]:
            from api.tasks import scan_email_inbox

            for inbox in inboxes:
                scan_email_inbox.delay(inbox.id)
            self.stdout.write(self.style.SUCCESS(f"Queued {len(inboxes)} scan task(s)."))
            return

        from api.email_ingest import scan_inbox

        for inbox in inboxes:
            result = scan_inbox(inbox)
            if result.get("ok"):
                self.stdout.write(
                    self.style.SUCCESS(
                        f"{inbox.email_address}: +{result.get('created', 0)} new "
                        f"({result.get('skipped', 0)} skipped)"
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f"{inbox.email_address}: {result.get('error')}")
                )
