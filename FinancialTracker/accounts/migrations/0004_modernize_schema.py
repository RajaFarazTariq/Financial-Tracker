"""Adds Category, account kind/currency/timestamps, expanded Transaction fields, bill timestamps."""

import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models
from django.utils.timezone import localdate


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_goal_completed_goal_created_at"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="account",
            name="kind",
            field=models.CharField(
                choices=[
                    ("cash", "Cash"),
                    ("checking", "Checking"),
                    ("savings", "Savings"),
                    ("credit", "Credit Card"),
                    ("investment", "Investment"),
                ],
                default="checking",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="account",
            name="currency",
            field=models.CharField(default="USD", max_length=3),
        ),
        migrations.AddField(
            model_name="account",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name="account",
            name="balance",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=14),
        ),
        migrations.AlterField(
            model_name="account",
            name="user",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="accounts",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterModelOptions(name="account", options={"ordering": ["-created_at"]}),
        migrations.CreateModel(
            name="Category",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=80)),
                (
                    "kind",
                    models.CharField(choices=[("Income", "Income"), ("Expense", "Expense")], max_length=10),
                ),
                ("color", models.CharField(default="#6366f1", max_length=9)),
                ("icon", models.CharField(default="circle", max_length=40)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="categories",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["kind", "name"]},
        ),
        migrations.AddConstraint(
            model_name="category",
            constraint=models.UniqueConstraint(fields=("user", "name", "kind"), name="uniq_user_category"),
        ),
        migrations.AddField(
            model_name="transaction",
            name="category",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="transactions",
                to="accounts.category",
            ),
        ),
        migrations.AddField(
            model_name="transaction",
            name="notes",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="transaction",
            name="is_recurring",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="transaction",
            name="recurrence",
            field=models.CharField(
                blank=True,
                choices=[
                    ("daily", "Daily"),
                    ("weekly", "Weekly"),
                    ("monthly", "Monthly"),
                    ("yearly", "Yearly"),
                ],
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="transaction",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name="transaction",
            name="amount",
            field=models.DecimalField(decimal_places=2, max_digits=12),
        ),
        migrations.AlterField(
            model_name="transaction",
            name="date",
            field=models.DateField(default=localdate),
        ),
        migrations.AlterModelOptions(
            name="transaction",
            options={"ordering": ["-date", "-created_at"]},
        ),
        migrations.AddIndex(
            model_name="transaction",
            index=models.Index(fields=["account", "-date"], name="accounts_tr_account_d3a1c2_idx"),
        ),
        migrations.AddIndex(
            model_name="transaction",
            index=models.Index(fields=["type", "-date"], name="accounts_tr_type_5b9f6a_idx"),
        ),
        migrations.AddField(
            model_name="bill",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="bill",
            name="category",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="bills",
                to="accounts.category",
            ),
        ),
        migrations.AlterField(
            model_name="bill",
            name="user",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="bills",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="goal",
            name="user",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="goals",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterModelOptions(
            name="bill",
            options={"ordering": ["is_paid", "due_date"]},
        ),
        migrations.AlterModelOptions(
            name="goal",
            options={"ordering": ["completed", "due_date", "-created_at"]},
        ),
    ]
