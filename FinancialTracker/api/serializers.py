from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.db.models import Sum
from django.utils import timezone
from rest_framework import serializers

from accounts.models import (
    Account,
    Bill,
    Budget,
    Category,
    EmailInbox,
    Goal,
    PlaidItem,
    Transaction,
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "date_joined")
        read_only_fields = ("id", "date_joined")


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ("username", "email", "password", "password_confirm", "first_name", "last_name")

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        if User.objects.filter(username__iexact=attrs["username"]).exists():
            raise serializers.ValidationError({"username": "Username already taken."})
        if User.objects.filter(email__iexact=attrs["email"]).exists():
            raise serializers.ValidationError({"email": "Email already registered."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "kind", "color", "icon")


class AccountSerializer(serializers.ModelSerializer):
    transactions_count = serializers.IntegerField(read_only=True, required=False)
    is_synced = serializers.BooleanField(read_only=True)
    institution = serializers.CharField(
        source="plaid_item.institution_name", read_only=True, default=None
    )
    mask = serializers.CharField(read_only=True)
    last_synced_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Account
        fields = (
            "id",
            "name",
            "kind",
            "currency",
            "balance",
            "created_at",
            "transactions_count",
            "is_synced",
            "institution",
            "mask",
            "last_synced_at",
        )
        read_only_fields = ("id", "created_at", "is_synced", "institution", "mask", "last_synced_at")


class EmailInboxSerializer(serializers.ModelSerializer):
    # Accepted on write, never returned. Optional on update (keep existing).
    app_password = serializers.CharField(write_only=True, required=False, allow_blank=False)
    account_name = serializers.CharField(source="account.name", read_only=True, default=None)

    class Meta:
        model = EmailInbox
        fields = (
            "id",
            "email_address",
            "app_password",
            "imap_host",
            "imap_port",
            "folder",
            "sender_filter",
            "account",
            "account_name",
            "status",
            "error_message",
            "last_scanned_at",
            "created_at",
        )
        read_only_fields = ("id", "status", "error_message", "last_scanned_at", "created_at")

    def validate_account(self, account):
        if account is None:
            return account
        request = self.context.get("request")
        if request and account.user_id != request.user.id:
            raise serializers.ValidationError("You do not own this account.")
        return account

    def validate(self, attrs):
        # app_password is required when creating a new inbox.
        if self.instance is None and not attrs.get("app_password"):
            raise serializers.ValidationError(
                {"app_password": "An app password is required."}
            )
        return attrs

    def update(self, instance, validated_data):
        # Don't wipe the stored password if the client omitted it.
        if not validated_data.get("app_password"):
            validated_data.pop("app_password", None)
        return super().update(instance, validated_data)


class PlaidItemSerializer(serializers.ModelSerializer):
    accounts_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = PlaidItem
        fields = (
            "id",
            "institution_name",
            "institution_id",
            "status",
            "error_message",
            "last_synced_at",
            "created_at",
            "accounts_count",
        )
        read_only_fields = fields


class TransactionSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source="account.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    category_color = serializers.CharField(source="category.color", read_only=True, default=None)

    class Meta:
        model = Transaction
        fields = (
            "id",
            "account",
            "account_name",
            "category",
            "category_name",
            "category_color",
            "type",
            "amount",
            "description",
            "notes",
            "date",
            "is_recurring",
            "recurrence",
            "created_at",
        )
        read_only_fields = ("id", "created_at")

    def validate_account(self, account: Account) -> Account:
        request = self.context.get("request")
        if request and account.user_id != request.user.id:
            raise serializers.ValidationError("You do not own this account.")
        return account

    def validate_category(self, category):
        if category is None:
            return category
        request = self.context.get("request")
        if request and category.user_id != request.user.id:
            raise serializers.ValidationError("You do not own this category.")
        return category

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be positive.")
        return value


class GoalSerializer(serializers.ModelSerializer):
    progress = serializers.FloatField(read_only=True)

    class Meta:
        model = Goal
        fields = (
            "id",
            "title",
            "target_amount",
            "current_amount",
            "due_date",
            "completed",
            "progress",
            "created_at",
        )
        read_only_fields = ("id", "created_at", "progress")


class BudgetSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    category_color = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = (
            "id",
            "category",
            "category_name",
            "category_color",
            "amount",
            "created_at",
        )
        read_only_fields = ("id", "created_at")

    def get_category_name(self, obj: Budget) -> str:
        return obj.category.name if obj.category else "Overall"

    def get_category_color(self, obj: Budget) -> str:
        return obj.category.color if obj.category else "#6366f1"

    def validate_category(self, category):
        if category is None:
            return category
        if category.kind != Category.Kind.EXPENSE:
            raise serializers.ValidationError("Budgets only apply to Expense categories.")
        request = self.context.get("request")
        if request and category.user_id != request.user.id:
            raise serializers.ValidationError("You do not own this category.")
        return category

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be positive.")
        return value

    def validate(self, attrs):
        # One budget per (user, category) including the overall (null-category) budget.
        request = self.context.get("request")
        if request is None:
            return attrs
        category = attrs.get("category", getattr(self.instance, "category", None))
        qs = Budget.objects.filter(user=request.user, category=category)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            label = category.name if category else "the overall cap"
            raise serializers.ValidationError(
                {"category": [f"A budget already exists for {label}."]}
            )
        return attrs

    def to_representation(self, instance: Budget):
        data = super().to_representation(instance)
        month_start = timezone.now().date().replace(day=1)
        qs = Transaction.objects.filter(
            account__user=instance.user,
            type="Expense",
            date__gte=month_start,
        )
        if instance.category_id:
            qs = qs.filter(category_id=instance.category_id)
        spent = float(qs.aggregate(s=Sum("amount"))["s"] or 0)
        amount = float(instance.amount)
        data["spent"] = spent
        data["remaining"] = amount - spent
        data["progress"] = min(100.0, spent / amount * 100) if amount else 0.0
        data["over_budget"] = spent > amount
        return data


class BillSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)

    class Meta:
        model = Bill
        fields = (
            "id",
            "title",
            "amount",
            "due_date",
            "is_paid",
            "category",
            "category_name",
            "created_at",
        )
        read_only_fields = ("id", "created_at")
