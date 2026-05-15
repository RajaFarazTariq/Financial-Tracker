"""Best-effort parser for bank transaction-alert emails (tuned for UBL).

Pakistani bank alerts have no standard format, so this uses tolerant regexes
over the plain-text body and returns a structured dict. ``confident`` is False
when key fields had to be guessed — the caller flags those for review rather
than dropping them. Tighten the patterns once a real UBL sample is available.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from html import unescape
from html.parser import HTMLParser


class _Stripper(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._chunks: list[str] = []

    def handle_data(self, data: str) -> None:
        self._chunks.append(data)

    def text(self) -> str:
        return " ".join(self._chunks)


def strip_html(html: str) -> str:
    parser = _Stripper()
    try:
        parser.feed(html)
    except Exception:  # noqa: BLE001 — malformed HTML still yields partial text
        pass
    return re.sub(r"\s+", " ", unescape(parser.text())).strip()


@dataclass
class ParsedAlert:
    direction: str  # "debit" | "credit"
    amount: Decimal
    txn_date: date
    description: str
    balance: Decimal | None
    account_mask: str
    confident: bool


_AMOUNT_RE = re.compile(
    r"(?:PKR|Rs\.?|RS)\s*\.?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)", re.IGNORECASE
)
_BAL_RE = re.compile(
    r"(?:available|avail|ledger)\s*balance[^0-9]*(?:PKR|Rs\.?)?\s*\.?\s*"
    r"([0-9][0-9,]*(?:\.[0-9]{1,2})?)",
    re.IGNORECASE,
)
_MASK_RE = re.compile(r"(?:a/?c|acct?|account)[^0-9xX*]{0,12}([xX*\d]{3,}\d{3,})", re.IGNORECASE)
_DEBIT_WORDS = ("debit", "debited", "withdrawn", "withdrawal", "spent", "purchase",
                "paid", "payment", "pos", "transfer to", "sent")
_CREDIT_WORDS = ("credit", "credited", "received", "deposit", "deposited",
                  "salary", "refund", "transfer from", "inward")
# UBL: "Transaction description: <value> Instrument number: ..." — bound the
# value before UBL's trailing fields / fraud-warning boilerplate.
_UBL_DESC_RE = re.compile(
    r"transaction\s+description\s*[:\-]\s*(.+?)\s*"
    r"(?=instrument\s+number\b|\bmsgid\s*[:\-]|\bregards\b|please\s+remember|note\s*:|$)",
    re.IGNORECASE,
)
# UBL: "A Cash Debit transaction of ..." / "A Transfer Credit transaction of ..."
_UBL_TYPE_RE = re.compile(
    r"\bA\s+([A-Za-z ]+?)\s+(debit|credit)\s+transaction\b", re.IGNORECASE
)
_DESC_LABELS = ("description", "narration", "details", "merchant", "remarks",
                "particulars", "transaction detail", "info")
_DATE_FORMATS = (
    "%d-%b-%Y", "%d-%B-%Y", "%d %b %Y", "%d %B %Y",
    "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%d/%m/%y",
    "%Y-%m-%d", "%b %d, %Y", "%B %d, %Y", "%b %d %Y",
)
_MONTHS = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec"
_DATE_RE = re.compile(
    rf"\b(\d{{1,2}}[ -](?:{_MONTHS})[a-z]*[ -]\d{{2,4}}"   # 15-MAY-2026 / 15 May 2026
    rf"|(?:{_MONTHS})[a-z]*\s+\d{{1,2}},?\s*\d{{4}}"        # May 15, 2026
    rf"|\d{{1,2}}[-/.]\d{{1,2}}[-/.]\d{{2,4}}"              # 15/05/2026
    rf"|\d{{4}}-\d{{2}}-\d{{2}})\b",                        # 2026-05-15
    re.IGNORECASE,
)


def _to_decimal(raw: str) -> Decimal | None:
    try:
        return Decimal(raw.replace(",", ""))
    except (InvalidOperation, AttributeError):
        return None


def _find_date(text: str) -> tuple[date, bool]:
    for m in _DATE_RE.finditer(text):
        token = m.group(1).strip()
        for fmt in _DATE_FORMATS:
            try:
                return datetime.strptime(token, fmt).date(), True
            except ValueError:
                continue
    return date.today(), False


def _find_description(text: str) -> str:
    m = _UBL_DESC_RE.search(text)
    if m and m.group(1).strip():
        return m.group(1).strip()[:255]
    for label in _DESC_LABELS:
        m = re.search(rf"{label}\s*[:\-]\s*(.+?)(?:\.|;|\n|$)", text, re.IGNORECASE)
        if m and m.group(1).strip():
            return m.group(1).strip()[:255]
    # Fall back to whatever follows "at"/"to"/"from" (POS / transfer wording),
    # stopping before sentence end or the balance/date trailer.
    m = re.search(
        r"\b(?:at|to|from)\s+([A-Z0-9][A-Za-z0-9&.\-/ ]{1,50}?)"
        r"(?=\s*(?:\.|,|;|\bavailable\b|\bavail\b|\bbalance\b|\bbal\b|\bon\b|$))",
        text,
        re.IGNORECASE,
    )
    if m:
        return m.group(1).strip()[:255]
    return ""


def parse_alert(subject: str, body: str) -> ParsedAlert | None:
    """Return a ParsedAlert, or None if the email is not a transaction alert."""
    text = strip_html(body) if "<" in body and ">" in body else body
    text = re.sub(r"\s+", " ", f"{subject}\n{text}").strip()

    amounts = _AMOUNT_RE.findall(text)
    if not amounts:
        return None  # no monetary value => not a transaction alert
    amount = _to_decimal(amounts[0])
    if amount is None or amount <= 0:
        return None

    # Prefer UBL's explicit "A <type> Debit/Credit transaction" phrasing;
    # fall back to keyword scanning for other banks/wording.
    tm = _UBL_TYPE_RE.search(text)
    if tm:
        direction = tm.group(2).lower()
        is_debit, is_credit = direction == "debit", direction == "credit"
    else:
        low = text.lower()
        is_debit = any(w in low for w in _DEBIT_WORDS)
        is_credit = any(w in low for w in _CREDIT_WORDS)
        direction = "credit" if (is_credit and not is_debit) else "debit"

    txn_date, date_ok = _find_date(text)
    description = _find_description(text) or subject.strip()[:255] or "Bank transaction"

    balance = None
    bm = _BAL_RE.search(text)
    if bm:
        balance = _to_decimal(bm.group(1))

    mask = ""
    mm = _MASK_RE.search(text)
    if mm:
        mask = mm.group(1)[-8:]

    confident = date_ok and (is_debit ^ is_credit) and bool(description)
    return ParsedAlert(direction, amount, txn_date, description, balance, mask, confident)
