import { TransactionsView } from "@/components/transactions/transactions-view";

export default function ExpensesPage() {
  return (
    <TransactionsView
      title="Expenses"
      description="Every dollar leaving your accounts."
      forceType="Expense"
    />
  );
}
