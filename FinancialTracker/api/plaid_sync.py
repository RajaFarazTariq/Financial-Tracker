"""Orchestration between Plaid and our domain models.

``link_item``  — exchange a public_token, persist the item, import accounts.
``sync_item``  — refresh balances + run cursor-based /transactions/sync.

Both are safe to call from a request, a Celery task, or a management command.
"""

from __future__ import annotations

import json
import logging
from decimal import Decimal, InvalidOperation

import plaid
from django.utils import timezone

from accounts.models import Account, Category, PlaidItem, Transaction

from . import plaid_client

logger = logging.getLogger(__name__)


# --- mapping helpers -------------------------------------------------------

def _enum(value) -> str:
    return (getattr(value, "value", None) or (str(value) if value is not None else "")).lower()


def _account_kind(acct) -> str:
    t = _enum(acct.type)
    sub = _enum(acct.subtype)
    if t == "credit":
        return Account.Kind.CREDIT
    if t in ("investment", "brokerage"):
        return Account.Kind.INVESTMENT
    if t == "loan":
        return Account.Kind.CREDIT
    if t == "depository":
        if sub == "savings" or sub in ("cd", "money market"):
            return Account.Kind.SAVINGS
        if sub in ("cash management", "prepaid", "ebt"):
            return Account.Kind.CASH
        return Account.Kind.CHECKING
    return Account.Kind.CHECKING


def _money(value) -> Decimal:
    try:
        return Decimal(str(value if value is not None else 0))
    except (InvalidOperation, ValueError):
        return Decimal("0")


def _currency(balances) -> str:
    code = balances.iso_currency_code or balances.unofficial_currency_code or "USD"
    return str(code)[:3].upper()


def _category_for(user, plaid_txn, kind: str):
    pfc = getattr(plaid_txn, "personal_finance_category", None)
    primary = getattr(pfc, "primary", None) if pfc else None
    if not primary:
        return None
    name = str(primary).replace("_", " ").title()[:80]
    category, _ = Category.objects.get_or_create(user=user, name=name, kind=kind)
    return category


# --- linking ---------------------------------------------------------------

def link_item(user, public_token: str) -> PlaidItem:
    access_token, item_id = plaid_client.exchange_public_token(public_token)
    try:
        institution_id, institution_name = plaid_client.get_institution(access_token)
    except plaid.ApiException:
        institution_id, institution_name = "", ""

    item, _ = PlaidItem.objects.update_or_create(
        item_id=item_id,
        defaults={
            "user": user,
            "access_token": access_token,
            "institution_id": institution_id,
            "institution_name": institution_name,
            "status": PlaidItem.Status.ACTIVE,
            "error_message": "",
        },
    )
    _import_accounts(item, access_token)
    sync_item(item)
    return item


def _import_accounts(item: PlaidItem, access_token: str) -> None:
    for a in plaid_client.get_accounts(access_token):
        Account.objects.update_or_create(
            plaid_item=item,
            plaid_account_id=a.account_id,
            defaults={
                "user": item.user,
                "name": (a.name or a.official_name or "Account")[:100],
                "kind": _account_kind(a),
                "currency": _currency(a.balances),
                "balance": _money(
                    a.balances.current
                    if a.balances.current is not None
                    else a.balances.available
                ),
                "mask": (a.mask or "")[:8],
                "last_synced_at": timezone.now(),
            },
        )


# --- syncing ---------------------------------------------------------------

def sync_item(item: PlaidItem) -> dict:
    """Refresh balances and transactions for one linked institution."""
    token = item.access_token
    try:
        _refresh_balances(item, token)
        counts = _sync_transactions(item, token)
    except plaid.ApiException as exc:
        _record_item_error(item, exc)
        logger.warning("Plaid sync failed for item %s: %s", item.pk, item.error_message)
        return {"ok": False, "status": item.status, "error": item.error_message}

    item.status = PlaidItem.Status.ACTIVE
    item.error_message = ""
    item.last_synced_at = timezone.now()
    item.save(
        update_fields=["status", "error_message", "last_synced_at", "transactions_cursor"]
    )
    return {"ok": True, **counts}


def _account_map(item: PlaidItem) -> dict[str, Account]:
    return {a.plaid_account_id: a for a in item.accounts.all()}


def _refresh_balances(item: PlaidItem, token: str) -> None:
    accounts = _account_map(item)
    for a in plaid_client.get_balances(token):
        acct = accounts.get(a.account_id)
        if not acct:
            continue
        acct.balance = _money(
            a.balances.current if a.balances.current is not None else a.balances.available
        )
        acct.currency = _currency(a.balances)
        acct.last_synced_at = timezone.now()
        acct.save(update_fields=["balance", "currency", "last_synced_at"])


def _sync_transactions(item: PlaidItem, token: str) -> dict:
    accounts = _account_map(item)
    cursor = item.transactions_cursor or None
    added = modified = removed = 0

    while True:
        resp = plaid_client.transactions_sync(token, cursor)
        for txn in resp.added:
            if _upsert_txn(item, accounts, txn):
                added += 1
        for txn in resp.modified:
            if _upsert_txn(item, accounts, txn):
                modified += 1
        for txn in resp.removed:
            removed += Transaction.objects.filter(
                plaid_transaction_id=txn.transaction_id
            ).delete()[0]
        cursor = resp.next_cursor
        if not resp.has_more:
            break

    item.transactions_cursor = cursor or ""
    return {"added": added, "modified": modified, "removed": removed}


def _upsert_txn(item: PlaidItem, accounts: dict[str, Account], txn) -> bool:
    acct = accounts.get(txn.account_id)
    if acct is None:
        return False
    amount = _money(txn.amount)
    # Plaid convention: positive = money out of the account.
    txn_type = Transaction.Type.EXPENSE if amount >= 0 else Transaction.Type.INCOME
    description = (getattr(txn, "merchant_name", None) or txn.name or "Transaction")[:255]
    Transaction.objects.update_or_create(
        plaid_transaction_id=txn.transaction_id,
        defaults={
            "account": acct,
            "category": _category_for(item.user, txn, txn_type),
            "type": txn_type,
            "amount": abs(amount),
            "description": description,
            "date": txn.date,
            "pending": bool(getattr(txn, "pending", False)),
        },
    )
    return True


def _record_item_error(item: PlaidItem, exc: plaid.ApiException) -> None:
    code = message = ""
    try:
        body = json.loads(exc.body or "{}")
        code = body.get("error_code", "")
        message = body.get("error_message", "")
    except (ValueError, TypeError):
        pass
    if code == "ITEM_LOGIN_REQUIRED":
        item.status = PlaidItem.Status.LOGIN_REQUIRED
    else:
        item.status = PlaidItem.Status.ERROR
    item.error_message = (message or code or "Plaid error")[:255]
    item.save(update_fields=["status", "error_message"])
