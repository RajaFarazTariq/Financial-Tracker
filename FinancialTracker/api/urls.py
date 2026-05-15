from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView

from .insights import InsightsView
from .plaid_webhook import plaid_webhook
from .views import (
    AccountViewSet,
    BillViewSet,
    BudgetViewSet,
    CategoryViewSet,
    ChangePasswordView,
    DashboardView,
    EmailInboxViewSet,
    GoalViewSet,
    MeView,
    PlaidExchangeView,
    PlaidItemViewSet,
    PlaidLinkTokenView,
    RegisterView,
    TransactionViewSet,
)

router = DefaultRouter()
router.register(r"accounts", AccountViewSet, basename="account")
router.register(r"categories", CategoryViewSet, basename="category")
router.register(r"transactions", TransactionViewSet, basename="transaction")
router.register(r"goals", GoalViewSet, basename="goal")
router.register(r"bills", BillViewSet, basename="bill")
router.register(r"budgets", BudgetViewSet, basename="budget")
router.register(r"plaid/items", PlaidItemViewSet, basename="plaid-item")
router.register(r"email/inboxes", EmailInboxViewSet, basename="email-inbox")

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path("auth/me/", MeView.as_view(), name="me"),
    path("auth/password/", ChangePasswordView.as_view(), name="change-password"),
    path("dashboard/", DashboardView.as_view(), name="dashboard-summary"),
    path("insights/", InsightsView.as_view(), name="insights"),
    path("plaid/link-token/", PlaidLinkTokenView.as_view(), name="plaid-link-token"),
    path("plaid/exchange/", PlaidExchangeView.as_view(), name="plaid-exchange"),
    path("plaid/webhook/", plaid_webhook, name="plaid-webhook"),
    path("", include(router.urls)),
]
