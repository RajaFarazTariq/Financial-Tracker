from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db.models import Count, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
import plaid
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

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

from . import plaid_client
from .email_ingest import InboxAuthError, scan_inbox, test_connection
from .permissions import IsOwner
from .plaid_sync import link_item, sync_item
from .serializers import (
    AccountSerializer,
    BillSerializer,
    BudgetSerializer,
    CategorySerializer,
    EmailInboxSerializer,
    GoalSerializer,
    PlaidItemSerializer,
    RegisterSerializer,
    TransactionSerializer,
    UserSerializer,
)


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChangePasswordView(APIView):
    """POST /api/auth/password/  →  { old_password, new_password }"""

    def post(self, request):
        old_password = request.data.get("old_password") or ""
        new_password = request.data.get("new_password") or ""

        if not request.user.check_password(old_password):
            return Response(
                {"old_password": ["Current password is incorrect."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user=request.user)
        except ValidationError as exc:
            return Response({"new_password": list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save(update_fields=["password"])
        return Response({"detail": "Password updated."})


class OwnedQuerysetMixin:
    """Filter queryset to the authenticated user and auto-set `user` on create."""

    permission_classes = [permissions.IsAuthenticated, IsOwner]
    user_field = "user"

    def get_queryset(self):
        return self.queryset.filter(**{self.user_field: self.request.user})

    def perform_create(self, serializer):
        serializer.save(**{self.user_field: self.request.user})


class AccountViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    filterset_fields = ["kind", "currency"]
    search_fields = ["name"]
    ordering_fields = ["created_at", "balance", "name"]

    def get_queryset(self):
        return super().get_queryset().annotate(transactions_count=Count("transactions"))


class CategoryViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    filterset_fields = ["kind"]
    search_fields = ["name"]


class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all().select_related("account", "category")
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]
    filterset_fields = ["type", "account", "category", "is_recurring"]
    search_fields = ["description", "notes"]
    ordering_fields = ["date", "amount", "created_at"]

    def get_queryset(self):
        return super().get_queryset().filter(account__user=self.request.user)


class GoalViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Goal.objects.all()
    serializer_class = GoalSerializer
    filterset_fields = ["completed"]
    search_fields = ["title"]
    ordering_fields = ["due_date", "created_at", "target_amount"]


class BillViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Bill.objects.all()
    serializer_class = BillSerializer
    filterset_fields = ["is_paid"]
    search_fields = ["title"]
    ordering_fields = ["due_date", "amount"]


class BudgetViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Budget.objects.all()
    serializer_class = BudgetSerializer
    ordering_fields = ["amount", "created_at"]

    def get_queryset(self):
        return super().get_queryset().select_related("category")


class DashboardView(APIView):
    """Aggregated dashboard payload — everything the home page needs in one call."""

    def get(self, request):
        user = request.user
        today = timezone.now().date()
        month_start = today.replace(day=1)
        six_months_ago = (month_start - timedelta(days=180)).replace(day=1)

        accounts_qs = Account.objects.filter(user=user)
        total_balance = accounts_qs.aggregate(s=Sum("balance"))["s"] or Decimal("0")

        tx_qs = Transaction.objects.filter(account__user=user)

        month_income = tx_qs.filter(type="Income", date__gte=month_start).aggregate(s=Sum("amount"))["s"] or Decimal("0")
        month_expense = tx_qs.filter(type="Expense", date__gte=month_start).aggregate(s=Sum("amount"))["s"] or Decimal("0")
        net_savings = month_income - month_expense

        # 6-month income vs expense trend
        trend_rows = (
            tx_qs.filter(date__gte=six_months_ago)
            .annotate(month=TruncMonth("date"))
            .values("month", "type")
            .annotate(total=Sum("amount"))
            .order_by("month")
        )
        trend_map: dict[str, dict[str, float]] = {}
        for row in trend_rows:
            key = row["month"].strftime("%Y-%m")
            trend_map.setdefault(key, {"income": 0.0, "expense": 0.0})
            trend_map[key]["income" if row["type"] == "Income" else "expense"] = float(row["total"])
        trend = [{"month": k, **v} for k, v in sorted(trend_map.items())]

        # Spending by category (current month, expenses only)
        category_rows = (
            tx_qs.filter(type="Expense", date__gte=month_start)
            .values("category__name", "category__color")
            .annotate(total=Sum("amount"))
            .order_by("-total")
        )
        spending_by_category = [
            {
                "name": r["category__name"] or "Uncategorized",
                "color": r["category__color"] or "#94a3b8",
                "total": float(r["total"]),
            }
            for r in category_rows
        ]

        recent = TransactionSerializer(tx_qs.select_related("account", "category")[:5], many=True).data
        upcoming = BillSerializer(
            Bill.objects.filter(user=user, is_paid=False, due_date__gte=today).order_by("due_date")[:5],
            many=True,
        ).data
        goals = GoalSerializer(Goal.objects.filter(user=user, completed=False)[:5], many=True).data

        # Financial health score (simple heuristic, 0–100)
        if month_income > 0:
            savings_ratio = float(net_savings) / float(month_income)
            health = max(0, min(100, int(50 + savings_ratio * 100)))
        else:
            health = 0 if month_expense > 0 else 50

        return Response(
            {
                "total_balance": float(total_balance),
                "month_income": float(month_income),
                "month_expense": float(month_expense),
                "net_savings": float(net_savings),
                "health_score": health,
                "accounts": AccountSerializer(accounts_qs, many=True).data,
                "recent_transactions": recent,
                "upcoming_bills": upcoming,
                "active_goals": goals,
                "trend": trend,
                "spending_by_category": spending_by_category,
            }
        )


# --- Plaid bank sync -------------------------------------------------------


def _plaid_error_response(exc: Exception) -> Response:
    if isinstance(exc, plaid_client.PlaidNotConfigured):
        return Response(
            {"detail": "Bank sync is not configured on the server."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    if isinstance(exc, plaid.ApiException):
        return Response(
            {"detail": "The bank provider rejected the request. Please try again."},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    raise exc


class PlaidLinkTokenView(APIView):
    """POST /api/plaid/link-token/ → { link_token } to initialize Plaid Link."""

    def post(self, request):
        try:
            return Response({"link_token": plaid_client.create_link_token(request.user)})
        except (plaid_client.PlaidNotConfigured, plaid.ApiException) as exc:
            return _plaid_error_response(exc)


class PlaidExchangeView(APIView):
    """POST /api/plaid/exchange/ { public_token } → link the institution."""

    def post(self, request):
        public_token = (request.data or {}).get("public_token")
        if not public_token:
            return Response(
                {"detail": "public_token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            item = link_item(request.user, public_token)
        except (plaid_client.PlaidNotConfigured, plaid.ApiException) as exc:
            return _plaid_error_response(exc)
        return Response(
            PlaidItemSerializer(item).data, status=status.HTTP_201_CREATED
        )


class PlaidItemViewSet(
    mixins.ListModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet
):
    """List linked institutions, unlink them, and trigger manual syncs."""

    queryset = PlaidItem.objects.all()
    serializer_class = PlaidItemSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        return (
            PlaidItem.objects.filter(user=self.request.user)
            .annotate(accounts_count=Count("accounts"))
        )

    def perform_destroy(self, instance: PlaidItem):
        # Best-effort revoke at Plaid; local cascade removes synced data.
        try:
            plaid_client.remove_item(instance.access_token)
        except plaid.ApiException:
            pass
        instance.delete()

    @action(detail=True, methods=["post"])
    def sync(self, request, pk=None):
        item = self.get_object()
        try:
            result = sync_item(item)
        except (plaid_client.PlaidNotConfigured, plaid.ApiException) as exc:
            return _plaid_error_response(exc)
        return Response(result)

    @action(detail=False, methods=["post"])
    def sync_all(self, request):
        results = {}
        for item in self.get_queryset():
            try:
                results[item.id] = sync_item(item)
            except (plaid_client.PlaidNotConfigured, plaid.ApiException) as exc:
                return _plaid_error_response(exc)
        return Response({"synced": results})


# --- Email-alert ingestion -------------------------------------------------


class EmailInboxViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    """Configure, test, and scan mailboxes for bank transaction-alert emails."""

    queryset = EmailInbox.objects.all()
    serializer_class = EmailInboxSerializer

    def get_queryset(self):
        return EmailInbox.objects.filter(user=self.request.user).select_related("account")

    @action(detail=True, methods=["post"])
    def test(self, request, pk=None):
        inbox = self.get_object()
        try:
            test_connection(inbox)
        except InboxAuthError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )
        return Response({"ok": True})

    @action(detail=True, methods=["post"])
    def scan(self, request, pk=None):
        return Response(scan_inbox(self.get_object()))

    @action(detail=False, methods=["post"])
    def scan_all(self, request):
        return Response(
            {"scanned": {inbox.id: scan_inbox(inbox) for inbox in self.get_queryset()}}
        )
