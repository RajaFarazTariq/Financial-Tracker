"""Lightweight rule-based categorization for email-ingested transactions.

Keyword → category, tuned for Pakistani merchant/alert wording. This is the
v1; the AI categorizer (roadmap feature #2) can later replace ``categorize``
without touching the ingest pipeline.
"""

from __future__ import annotations

from accounts.models import Category

# Each rule: (category_name, [keywords]). First match wins; order matters.
_EXPENSE_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("Cash Withdrawal", ("atm", "cash withdrawal", "cash withdrawn", "cash debit")),
    ("Food & Dining", ("restaurant", "mcdonald", "kfc", "foodpanda", "cafe",
                        "pizza", "dine", "eat", "food")),
    ("Groceries", ("mart", "store", "grocery", "carrefour", "imtiaz", "metro")),
    ("Transport", ("uber", "careem", "indrive", "fuel", "petrol", "pso",
                    "shell", "total parco")),
    ("Utilities", ("k-electric", "kelectric", "sui gas", "ssgc", "wapda",
                    "electricity", "water bill", "gas bill", "internet",
                    "ptcl", "stormfiber", "nayatel")),
    ("Mobile & Telecom", ("jazz", "telenor", "zong", "ufone", "easyload",
                           "mobile load", "scratch card")),
    ("Shopping", ("daraz", "shopping", "outfitters", "khaadi", "gul ahmed",
                  "store purchase", "pos purchase", "pos sale", "retail")),
    ("Subscriptions", ("netflix", "spotify", "youtube premium", "chatgpt",
                        "openai", "subscription", "google ", "apple.com")),
    ("Transfers", ("transfer to", "transfer debit", "ibft", "raast",
                   "fund transfer", "sent to")),
    ("Bills & Fees", ("bill payment", "service charge", "fee", "charges",
                       "tax", "fbr")),
]

_INCOME_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("Salary", ("salary", "payroll", "wages")),
    ("Refund", ("refund", "reversal", "cashback")),
    ("Transfers In", ("transfer from", "transfer credit", "received from",
                      "inward", "credited by")),
]


def _match(text: str, rules) -> str | None:
    low = text.lower()
    for name, keywords in rules:
        if any(k in low for k in keywords):
            return name
    return None


def categorize(user, description: str, direction: str) -> Category | None:
    """Resolve (and create if needed) the user's Category for this alert."""
    if direction == "credit":
        name = _match(description, _INCOME_RULES) or "Other Income"
        kind = Category.Kind.INCOME
    else:
        name = _match(description, _EXPENSE_RULES) or "Uncategorized"
        kind = Category.Kind.EXPENSE
    category, _ = Category.objects.get_or_create(user=user, name=name, kind=kind)
    return category
