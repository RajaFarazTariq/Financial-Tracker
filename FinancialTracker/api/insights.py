"""Claude-powered financial insights endpoint.

Aggregates the user's current-month financial state into a compact prompt,
asks Claude to return structured insights via tool use, and serves the result
back to the frontend. Falls back to a static message if ANTHROPIC_API_KEY
isn't configured so the UI doesn't break in dev.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Bill, Goal, Transaction

logger = logging.getLogger(__name__)

INSIGHTS_SYSTEM_PROMPT = """You are a friendly, practical personal-finance assistant.

The user will share a JSON summary of their recent finances. Analyze it and \
return concise, actionable insights via the `report_insights` tool. Be warm \
but direct. Avoid generic advice — anchor every recommendation in their \
actual numbers. Never invent transactions or amounts not present in the data.

All monetary amounts are in Pakistani Rupee (PKR). Always write money as \
"Rs. 1,234" — never use "$", "USD", or "dollars".

Tone: confident, encouraging, no jargon. Length: short.
"""

INSIGHTS_TOOL = {
    "name": "report_insights",
    "description": "Return structured financial insights for the user.",
    "input_schema": {
        "type": "object",
        "properties": {
            "summary": {
                "type": "string",
                "description": "1–2 sentence overview of their financial picture this month.",
            },
            "health_assessment": {
                "type": "string",
                "description": "1 paragraph honest assessment of their financial health, anchored in the numbers.",
            },
            "top_observations": {
                "type": "array",
                "items": {"type": "string"},
                "description": "3–5 specific, data-backed observations (e.g. 'Groceries account for 32% of expenses').",
            },
            "recommendations": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "action": {"type": "string", "description": "A specific, do-this-today action."},
                    },
                    "required": ["title", "action"],
                },
                "description": "2–4 concrete recommendations.",
            },
        },
        "required": ["summary", "health_assessment", "top_observations", "recommendations"],
    },
}


def _build_finance_summary(user) -> dict:
    """Compact representation of the user's last 60 days of money flow."""
    today = timezone.now().date()
    month_start = today.replace(day=1)
    sixty_days_ago = today - timedelta(days=60)

    tx_qs = Transaction.objects.filter(account__user=user, date__gte=sixty_days_ago)

    month_income = tx_qs.filter(type="Income", date__gte=month_start).aggregate(s=Sum("amount"))["s"] or Decimal("0")
    month_expense = tx_qs.filter(type="Expense", date__gte=month_start).aggregate(s=Sum("amount"))["s"] or Decimal("0")

    by_category = (
        tx_qs.filter(type="Expense", date__gte=month_start)
        .values("category__name")
        .annotate(total=Sum("amount"))
        .order_by("-total")[:10]
    )

    recent = list(
        tx_qs.order_by("-date")[:25].values("date", "type", "amount", "description", "category__name")
    )

    return {
        "month_to_date_income": float(month_income),
        "month_to_date_expense": float(month_expense),
        "net": float(month_income - month_expense),
        "expense_by_category_this_month": [
            {"category": r["category__name"] or "Uncategorized", "amount": float(r["total"])}
            for r in by_category
        ],
        "recent_transactions": [
            {
                "date": str(r["date"]),
                "type": r["type"],
                "amount": float(r["amount"]),
                "description": r["description"],
                "category": r["category__name"] or None,
            }
            for r in recent
        ],
        "active_goals": [
            {"title": g.title, "progress_percent": round(g.progress, 1)}
            for g in Goal.objects.filter(user=user, completed=False)[:10]
        ],
        "upcoming_bills_unpaid_count": Bill.objects.filter(user=user, is_paid=False, due_date__gte=today).count(),
    }


def _fallback(finance: dict) -> dict:
    """Useful response when ANTHROPIC_API_KEY isn't set — keeps the UI demoable."""
    income = finance["month_to_date_income"]
    expense = finance["month_to_date_expense"]
    net = finance["net"]
    top = finance["expense_by_category_this_month"][:1]
    observations = [
        f"Month-to-date income is Rs. {income:,.2f} and expenses are Rs. {expense:,.2f} "
        f"(net Rs. {net:,.2f}).",
    ]
    if top:
        observations.append(
            f"Largest spending category: {top[0]['category']} (Rs. {top[0]['amount']:,.2f})."
        )
    if finance["upcoming_bills_unpaid_count"]:
        observations.append(
            f"You have {finance['upcoming_bills_unpaid_count']} unpaid bill(s) coming up."
        )
    return {
        "ai_powered": False,
        "summary": "Connect an Anthropic API key for personalized AI insights.",
        "health_assessment": (
            "These observations are static. Add ANTHROPIC_API_KEY to your .env to unlock "
            "Claude-powered recommendations."
        ),
        "top_observations": observations,
        "recommendations": [
            {
                "title": "Enable AI insights",
                "action": "Get a key at https://console.anthropic.com/ and add it to FinancialTracker/.env, then restart the server.",
            }
        ],
    }


class InsightsView(APIView):
    """POST /api/insights/  →  Claude-generated financial insights for the current user."""

    def post(self, request):
        finance = _build_finance_summary(request.user)

        # No data → nothing meaningful to analyze.
        if finance["month_to_date_income"] == 0 and finance["month_to_date_expense"] == 0:
            return Response(
                {
                    "ai_powered": False,
                    "summary": "Add a few transactions first so I have something to analyze.",
                    "health_assessment": "Once you log income and expenses, I can identify patterns and suggest improvements.",
                    "top_observations": [],
                    "recommendations": [
                        {"title": "Add transactions", "action": "Head to Transactions and log this week's spending."},
                    ],
                }
            )

        api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
        if not api_key:
            return Response(_fallback(finance))

        try:
            from anthropic import Anthropic
        except ImportError:
            logger.warning("anthropic package not installed")
            return Response(_fallback(finance))

        model = os.environ.get("ANTHROPIC_MODEL", "claude-opus-4-7")
        client = Anthropic(api_key=api_key)

        try:
            response = client.messages.create(
                model=model,
                max_tokens=1500,
                system=[
                    {
                        "type": "text",
                        "text": INSIGHTS_SYSTEM_PROMPT,
                        "cache_control": {"type": "ephemeral"},
                    }
                ],
                tools=[INSIGHTS_TOOL],
                tool_choice={"type": "tool", "name": "report_insights"},
                messages=[
                    {
                        "role": "user",
                        "content": (
                            "Here is my recent financial activity. Please report your insights via the "
                            "`report_insights` tool.\n\n"
                            + json.dumps(finance, indent=2)
                        ),
                    }
                ],
            )
        except Exception as exc:  # noqa: BLE001 — surface upstream errors to caller
            logger.exception("anthropic call failed")
            return Response(
                {"detail": f"AI service error: {exc.__class__.__name__}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Forced tool_choice guarantees a tool_use block in the response.
        tool_use = next((b for b in response.content if b.type == "tool_use"), None)
        if not tool_use:
            return Response(
                {"detail": "AI did not return structured output."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        payload = dict(tool_use.input)
        payload["ai_powered"] = True
        payload["model"] = model
        return Response(payload)
