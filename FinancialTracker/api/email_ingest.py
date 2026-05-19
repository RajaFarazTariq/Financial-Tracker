"""IMAP ingestion: poll a mailbox for bank-alert emails and create transactions.

Idempotent — every row is keyed by the email Message-ID (or a stable
inbox+UID fallback), so re-scans never duplicate. Safe from a request,
Celery task, or management command.
"""

from __future__ import annotations

import imaplib
import logging
from datetime import date
from decimal import Decimal
from email import message_from_bytes
from email.header import decode_header, make_header

from django.db import models
from django.utils import timezone

from accounts.models import Account, EmailInbox, Transaction

from .bank_email_parser import parse_alert
from .email_categorize import categorize

logger = logging.getLogger(__name__)


class InboxAuthError(Exception):
    pass


def _decode(value: str | None) -> str:
    if not value:
        return ""
    try:
        return str(make_header(decode_header(value)))
    except Exception:  # noqa: BLE001
        return value


def _body_text(msg) -> str:
    if msg.is_multipart():
        plain = html = ""
        for part in msg.walk():
            ctype = part.get_content_type()
            if part.get("Content-Disposition", "").startswith("attachment"):
                continue
            try:
                payload = part.get_payload(decode=True)
            except Exception:  # noqa: BLE001
                continue
            if not payload:
                continue
            charset = part.get_content_charset() or "utf-8"
            text = payload.decode(charset, errors="replace")
            if ctype == "text/plain":
                plain += text
            elif ctype == "text/html":
                html += text
        return plain or html
    payload = msg.get_payload(decode=True)
    if payload:
        return payload.decode(msg.get_content_charset() or "utf-8", errors="replace")
    return msg.get_payload() or ""


def _resolve_account(inbox: EmailInbox) -> Account:
    if inbox.account_id:
        return inbox.account
    account, _ = Account.objects.get_or_create(
        user=inbox.user,
        name="UBL (email alerts)",
        defaults={"kind": Account.Kind.CHECKING, "currency": "PKR"},
    )
    # Persist so future scans (and the UI) point at the same account.
    inbox.account = account
    inbox.save(update_fields=["account"])
    return account


def recompute_alert_balance(account: Account) -> Decimal:
    """Recompute ``account.balance`` from scratch: opening + sum of deltas.

    UBL alert emails never state a running balance, so the only correct figure
    is the user-set ``opening_balance`` plus the signed sum of every (deduped)
    transaction on the account. Recomputing wholesale — rather than nudging the
    balance per transaction — is what keeps re-scans idempotent.

    Uses a queryset ``.update()`` so it overwrites, rather than stacks on top
    of, the per-transaction deltas the live-balance signal also applies.
    """
    agg = Transaction.objects.filter(account=account).aggregate(
        income=models.Sum("amount", filter=models.Q(type=Transaction.Type.INCOME)),
        expense=models.Sum("amount", filter=models.Q(type=Transaction.Type.EXPENSE)),
    )
    delta = (agg["income"] or Decimal("0")) - (agg["expense"] or Decimal("0"))
    balance = (account.opening_balance or Decimal("0")) + delta
    Account.objects.filter(pk=account.pk).update(balance=balance)
    return balance


def scan_inbox(inbox: EmailInbox, since: date | None = None) -> dict:
    """Poll the mailbox and ingest alert emails.

    ``since`` bounds a backfill to alerts on/after that date (server-side IMAP
    SINCE plus a parsed-date guard). Default None keeps the normal incremental
    behaviour (everything newer than ``last_seen_uid``).
    """
    try:
        conn = imaplib.IMAP4_SSL(inbox.imap_host, inbox.imap_port)
    except OSError as exc:
        _fail(inbox, EmailInbox.Status.ERROR, f"Connection failed: {exc}")
        return {"ok": False, "error": inbox.error_message}

    try:
        try:
            conn.login(inbox.email_address, inbox.app_password)
        except imaplib.IMAP4.error as exc:
            _fail(inbox, EmailInbox.Status.AUTH_ERROR, f"Login failed: {exc}")
            return {"ok": False, "error": inbox.error_message}

        conn.select(inbox.folder, readonly=True)
        criteria = ["FROM", inbox.sender_filter]
        if since is not None:
            # IMAP SINCE wants DD-Mon-YYYY and is inclusive (received date).
            criteria += ["SINCE", since.strftime("%d-%b-%Y")]
        typ, data = conn.uid("SEARCH", None, *criteria)
        if typ != "OK":
            _fail(inbox, EmailInbox.Status.ERROR, "IMAP search failed")
            return {"ok": False, "error": inbox.error_message}

        uids = sorted(int(u) for u in data[0].split()) if data and data[0] else []
        new_uids = [u for u in uids if u > inbox.last_seen_uid]
        account = _resolve_account(inbox)
        created = skipped = 0
        max_uid = inbox.last_seen_uid

        for uid in new_uids:
            max_uid = max(max_uid, uid)
            typ, fetched = conn.uid("FETCH", str(uid), "(RFC822)")
            if typ != "OK" or not fetched or not fetched[0]:
                continue
            msg = message_from_bytes(fetched[0][1])
            subject = _decode(msg.get("Subject"))
            parsed = parse_alert(subject, _body_text(msg))
            if parsed is None:
                skipped += 1
                continue
            if since is not None and parsed.txn_date < since:
                skipped += 1
                continue

            msg_id = (msg.get("Message-ID") or f"{inbox.id}:{uid}").strip()[:255]
            txn_type = (
                Transaction.Type.INCOME
                if parsed.direction == "credit"
                else Transaction.Type.EXPENSE
            )
            note = "Imported from bank email alert."
            if not parsed.confident:
                note += " Low-confidence parse — please review."
            _, was_created = Transaction.objects.update_or_create(
                email_message_id=msg_id,
                defaults={
                    "account": account,
                    "category": categorize(inbox.user, parsed.description, parsed.direction),
                    "type": txn_type,
                    "amount": parsed.amount,
                    "description": parsed.description[:255],
                    "date": parsed.txn_date,
                    "notes": note,
                    "reported_balance": parsed.balance,
                    "pending": not parsed.confident,
                },
            )
            created += int(was_created)

        # Recompute balance = opening_balance + sum of (deduped) deltas.
        recompute_alert_balance(account)

        inbox.last_seen_uid = max_uid
        inbox.status = EmailInbox.Status.ACTIVE
        inbox.error_message = ""
        inbox.last_scanned_at = timezone.now()
        inbox.save(
            update_fields=["last_seen_uid", "status", "error_message", "last_scanned_at"]
        )
        return {"ok": True, "created": created, "skipped": skipped, "scanned": len(new_uids)}
    finally:
        try:
            conn.logout()
        except Exception:  # noqa: BLE001
            pass


def test_connection(inbox: EmailInbox) -> None:
    """Raise InboxAuthError if IMAP login fails; used by the 'Test' action."""
    try:
        conn = imaplib.IMAP4_SSL(inbox.imap_host, inbox.imap_port)
    except OSError as exc:
        raise InboxAuthError(f"Connection failed: {exc}") from exc
    try:
        try:
            conn.login(inbox.email_address, inbox.app_password)
        except imaplib.IMAP4.error as exc:
            raise InboxAuthError(f"Login failed: {exc}") from exc
    finally:
        try:
            conn.logout()
        except Exception:  # noqa: BLE001
            pass


def _fail(inbox: EmailInbox, status: str, message: str) -> None:
    inbox.status = status
    inbox.error_message = message[:255]
    inbox.last_scanned_at = timezone.now()
    inbox.save(update_fields=["status", "error_message", "last_scanned_at"])
    logger.warning("Email inbox %s scan failed: %s", inbox.pk, message)
