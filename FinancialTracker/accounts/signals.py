"""Live account-balance maintenance.

Every time a Transaction is created, edited, or deleted, the owning
Account.balance is adjusted by the signed delta so the headline balance
always reflects reality without a manual refresh.

Plaid-linked accounts are skipped — their authoritative balance comes from
the bank via the Plaid sync, so applying transaction deltas too would
double-count.
"""

from decimal import Decimal

from django.db import models
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from .models import Account, Transaction


def _delta(amount, txn_type) -> Decimal:
    amount = amount or Decimal("0")
    return amount if txn_type == Transaction.Type.INCOME else -amount


def _adjust(account_id, delta: Decimal) -> None:
    if not account_id or not delta:
        return
    acc = Account.objects.filter(pk=account_id).only("id", "plaid_item_id").first()
    if acc is None or acc.plaid_item_id is not None:
        return
    Account.objects.filter(pk=account_id).update(balance=models.F("balance") + delta)


@receiver(pre_save, sender=Transaction)
def _capture_previous(sender, instance, **kwargs):
    if instance.pk:
        prev = (
            Transaction.objects.filter(pk=instance.pk)
            .only("amount", "type", "account_id")
            .first()
        )
        instance._prev = (prev.account_id, _delta(prev.amount, prev.type)) if prev else None
    else:
        instance._prev = None


@receiver(post_save, sender=Transaction)
def _apply(sender, instance, created, **kwargs):
    new = _delta(instance.amount, instance.type)
    prev = getattr(instance, "_prev", None)
    if created or prev is None:
        _adjust(instance.account_id, new)
        return
    prev_account_id, prev_delta = prev
    if prev_account_id == instance.account_id:
        _adjust(instance.account_id, new - prev_delta)
    else:  # transaction moved to a different account
        _adjust(prev_account_id, -prev_delta)
        _adjust(instance.account_id, new)


@receiver(post_delete, sender=Transaction)
def _reverse(sender, instance, **kwargs):
    _adjust(instance.account_id, -_delta(instance.amount, instance.type))
