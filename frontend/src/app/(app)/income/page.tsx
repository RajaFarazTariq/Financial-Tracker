import { TransactionsView } from "@/components/transactions/transactions-view";

export default function IncomePage() {
  return (
    <TransactionsView
      title="Income"
      description="All money coming in — salary, gifts, refunds, returns."
      forceType="Income"
    />
  );
}
