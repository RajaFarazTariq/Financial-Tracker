from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase

from accounts.models import Account, Transaction
from api.bank_email_parser import parse_alert
from api.email_ingest import recompute_alert_balance

# Real UBL email shapes (verified against the live mailbox 2026-05-19).
# Structured "UBL Digital" alert — the canonical record we keep.
UBL_DIGITAL_DEBIT = (
    "Dear FARAZ TARIQ , A Transfer Debit transaction of PKR. 1,100.00 was made "
    "in your Account No: 33*****31 (FARAZ TARIQ) in I 8 MARKAZ, ISLAMABAD on "
    "Sunday May 17, 2026. Transaction description: RAAST P2P FT TO REHAN AHMED "
    "SADAPAY ACCT: PK61SADA*********069 MSGID: UBL170526091447547797681 "
    "Instrument number: 903067260517211447 Regards, UBL Digital"
)
UBL_DIGITAL_CREDIT = (
    "Dear FARAZ TARIQ , A Transfer Credit transaction of PKR. 1,000.00 was made "
    "in your Account No: 33*****31 (FARAZ TARIQ) in I 8 MARKAZ, ISLAMABAD on "
    "Thursday May 14, 2026. Transaction description: RAAST P2P FT FROM FARAZ "
    "TARIQ EASYPAISA ACCT: PK65TMFB*********427 MSGID: TMICFBPK130526049855756948 "
    "Instrument number: 777212260513232313 Regards, UBL Digital"
)
# Redundant "UBL netbanking" courtesy notice — the duplicate twin to discard.
UBL_NETBANKING_DUPLICATE = (
    "Dear FARAZ TARIQ , You paid PKR. 1,100.00 to REHAN AHMED via Raast. "
    "Here are the details: Account Title: FARAZ TARIQ Account Details: I 8 "
    "Markaz Branch,, Islamabad - 33*****31 Date: 17-May-2026 Time: 09:14:47 PM "
    "Transaction ID: 1193812892 Transaction Type: Inter Bank Funds Transfer "
    "Raast Regards, UBL Digital"
)


class UBLParserTests(TestCase):
    def test_structured_debit_is_expense(self):
        a = parse_alert("UBL Digital: Transaction Alert", UBL_DIGITAL_DEBIT)
        self.assertIsNotNone(a)
        self.assertEqual(a.direction, "debit")
        self.assertEqual(a.amount, Decimal("1100.00"))

    def test_structured_credit_is_income(self):
        a = parse_alert("UBL Digital: Transaction Alert", UBL_DIGITAL_CREDIT)
        self.assertIsNotNone(a)
        self.assertEqual(a.direction, "credit")
        self.assertEqual(a.amount, Decimal("1000.00"))

    def test_netbanking_duplicate_is_dropped(self):
        # UBL sends this alongside the structured alert for every Raast
        # transfer — ingesting it would double-count the transaction.
        self.assertIsNone(
            parse_alert("UBL netbanking: Transaction Alert", UBL_NETBANKING_DUPLICATE)
        )


class RecomputeAlertBalanceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("faraz", password="x")
        self.acc = Account.objects.create(
            user=self.user, name="UBL (email alerts)", opening_balance=Decimal("5000")
        )

    def _txn(self, ttype, amount, day):
        return Transaction.objects.create(
            account=self.acc,
            type=ttype,
            amount=Decimal(amount),
            description="t",
            date=f"2026-05-{day}",
        )

    def test_balance_is_opening_plus_net_deltas(self):
        self._txn("Income", "1000", "14")
        self._txn("Expense", "1100", "17")
        # 5000 + 1000 - 1100
        self.assertEqual(recompute_alert_balance(self.acc), Decimal("4900.00"))

    def test_zero_opening_is_pure_delta_sum(self):
        Account.objects.filter(pk=self.acc.pk).update(opening_balance=Decimal("0"))
        self.acc.refresh_from_db()
        self._txn("Expense", "1100", "17")
        self._txn("Expense", "1100", "17")
        self.assertEqual(recompute_alert_balance(self.acc), Decimal("-2200.00"))

    def test_recompute_is_idempotent(self):
        self._txn("Income", "1000", "14")
        first = recompute_alert_balance(self.acc)
        second = recompute_alert_balance(self.acc)
        self.assertEqual(first, second)
        self.assertEqual(second, Decimal("6000.00"))
