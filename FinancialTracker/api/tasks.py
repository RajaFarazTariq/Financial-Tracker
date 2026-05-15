"""Celery tasks for background bank sync.

Triggered by Plaid webhooks (real-time) and the scheduled fallback command.
With CELERY_TASK_ALWAYS_EAGER=true these run inline (no Redis/worker needed).
"""

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def sync_plaid_item(self, item_id: int) -> dict:
    from accounts.models import PlaidItem

    from .plaid_sync import sync_item

    try:
        item = PlaidItem.objects.get(pk=item_id)
    except PlaidItem.DoesNotExist:
        logger.info("sync_plaid_item: item %s no longer exists", item_id)
        return {"ok": False, "error": "item_not_found"}
    return sync_item(item)


@shared_task
def sync_all_plaid_items() -> dict:
    """Scheduled fallback — refresh every active linked institution."""
    from accounts.models import PlaidItem

    ids = list(
        PlaidItem.objects.exclude(status=PlaidItem.Status.ERROR).values_list(
            "id", flat=True
        )
    )
    for item_id in ids:
        sync_plaid_item.delay(item_id)
    return {"queued": len(ids)}


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def scan_email_inbox(self, inbox_id: int) -> dict:
    from accounts.models import EmailInbox

    from .email_ingest import scan_inbox

    try:
        inbox = EmailInbox.objects.get(pk=inbox_id)
    except EmailInbox.DoesNotExist:
        return {"ok": False, "error": "inbox_not_found"}
    return scan_inbox(inbox)


@shared_task
def scan_all_email_inboxes() -> dict:
    """Celery Beat entrypoint — poll every active inbox for new alert emails."""
    from accounts.models import EmailInbox

    ids = list(
        EmailInbox.objects.exclude(status=EmailInbox.Status.AUTH_ERROR).values_list(
            "id", flat=True
        )
    )
    for inbox_id in ids:
        scan_email_inbox.delay(inbox_id)
    return {"queued": len(ids)}
