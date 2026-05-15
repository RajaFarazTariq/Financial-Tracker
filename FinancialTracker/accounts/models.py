from django.contrib.auth.models import User
from django.db import models
from django.utils.timezone import localdate

from .fields import EncryptedTextField


class Account(models.Model):
    class Kind(models.TextChoices):
        CASH = "cash", "Cash"
        CHECKING = "checking", "Checking"
        SAVINGS = "savings", "Savings"
        CREDIT = "credit", "Credit Card"
        INVESTMENT = "investment", "Investment"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="accounts")
    name = models.CharField(max_length=100)
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.CHECKING)
    currency = models.CharField(max_length=3, default="PKR")
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    # Bank-sync linkage (null for manually created accounts).
    plaid_item = models.ForeignKey(
        "PlaidItem", on_delete=models.CASCADE, null=True, blank=True, related_name="accounts"
    )
    plaid_account_id = models.CharField(max_length=128, blank=True)
    mask = models.CharField(max_length=8, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["plaid_item", "plaid_account_id"],
                name="uniq_plaid_account",
                condition=models.Q(plaid_item__isnull=False),
            )
        ]

    @property
    def is_synced(self) -> bool:
        return self.plaid_item_id is not None

    def __str__(self) -> str:
        return f"{self.user.username} - {self.name}"


class Category(models.Model):
    class Kind(models.TextChoices):
        INCOME = "Income", "Income"
        EXPENSE = "Expense", "Expense"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="categories")
    name = models.CharField(max_length=80)
    kind = models.CharField(max_length=10, choices=Kind.choices)
    color = models.CharField(max_length=9, default="#6366f1")
    icon = models.CharField(max_length=40, default="circle")

    class Meta:
        ordering = ["kind", "name"]
        constraints = [
            models.UniqueConstraint(fields=["user", "name", "kind"], name="uniq_user_category"),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.kind})"


class Transaction(models.Model):
    class Type(models.TextChoices):
        INCOME = "Income", "Income"
        EXPENSE = "Expense", "Expense"

    class Recurrence(models.TextChoices):
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"
        YEARLY = "yearly", "Yearly"

    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="transactions")
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="transactions"
    )
    type = models.CharField(max_length=10, choices=Type.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.CharField(max_length=255)
    notes = models.TextField(blank=True)
    date = models.DateField(default=localdate)
    is_recurring = models.BooleanField(default=False)
    recurrence = models.CharField(max_length=10, choices=Recurrence.choices, blank=True)
    # Set for bank-synced rows; used to dedupe across syncs.
    plaid_transaction_id = models.CharField(max_length=128, blank=True, db_index=True)
    # Set for rows ingested from a bank-alert email; dedupes re-scans.
    email_message_id = models.CharField(max_length=255, blank=True, db_index=True)
    pending = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        indexes = [models.Index(fields=["account", "-date"]), models.Index(fields=["type", "-date"])]
        constraints = [
            models.UniqueConstraint(
                fields=["plaid_transaction_id"],
                name="uniq_plaid_txn",
                condition=~models.Q(plaid_transaction_id=""),
            ),
            models.UniqueConstraint(
                fields=["email_message_id"],
                name="uniq_email_msg",
                condition=~models.Q(email_message_id=""),
            ),
        ]

    def __str__(self) -> str:
        return f"{self.type} {self.amount} ({self.description})"


class Goal(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="goals")
    title = models.CharField(max_length=200)
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    current_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    due_date = models.DateField(null=True, blank=True)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["completed", "due_date", "-created_at"]

    @property
    def progress(self) -> float:
        if not self.target_amount:
            return 0.0
        return min(100.0, float(self.current_amount) / float(self.target_amount) * 100)

    def __str__(self) -> str:
        return self.title


class Budget(models.Model):
    """Monthly spending cap. category=None means total expenses across all categories."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="budgets")
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="budgets",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.category.name if self.category else 'Overall'} — {self.amount}"


class Bill(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="bills")
    title = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField()
    is_paid = models.BooleanField(default=False)
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="bills"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["is_paid", "due_date"]

    def __str__(self) -> str:
        return self.title


class PlaidItem(models.Model):
    """A linked financial institution (one Plaid Item == one bank login)."""

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        LOGIN_REQUIRED = "login_required", "Re-authentication required"
        ERROR = "error", "Error"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="plaid_items")
    item_id = models.CharField(max_length=128, unique=True)
    access_token = EncryptedTextField()
    institution_id = models.CharField(max_length=64, blank=True)
    institution_name = models.CharField(max_length=255, blank=True)
    # Opaque pagination cursor for /transactions/sync.
    transactions_cursor = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    error_message = models.CharField(max_length=255, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.user.username} — {self.institution_name or self.item_id}"


class EmailInbox(models.Model):
    """A mailbox polled over IMAP for bank transaction-alert emails (e.g. UBL)."""

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        AUTH_ERROR = "auth_error", "Authentication failed"
        ERROR = "error", "Error"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="email_inboxes")
    email_address = models.EmailField()
    # Gmail App Password (16 chars) — encrypted at rest, never serialized.
    app_password = EncryptedTextField()
    imap_host = models.CharField(max_length=128, default="imap.gmail.com")
    imap_port = models.PositiveIntegerField(default=993)
    folder = models.CharField(max_length=64, default="INBOX")
    # Substring matched against the From header to find alert emails.
    sender_filter = models.CharField(max_length=128, default="admin.ebanking@ubl.com.pk")
    # Parsed transactions are attached to this account.
    account = models.ForeignKey(
        Account, on_delete=models.SET_NULL, null=True, blank=True, related_name="email_inboxes"
    )
    last_seen_uid = models.BigIntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    error_message = models.CharField(max_length=255, blank=True)
    last_scanned_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "email_address"], name="uniq_user_inbox"
            )
        ]

    def __str__(self) -> str:
        return f"{self.user.username} — {self.email_address}"
