export type Account = {
  id: number;
  name: string;
  kind: "cash" | "checking" | "savings" | "credit" | "investment";
  currency: string;
  balance: string;
  created_at: string;
  transactions_count?: number;
  is_synced?: boolean;
  institution?: string | null;
  mask?: string;
  last_synced_at?: string | null;
};

export type EmailInbox = {
  id: number;
  email_address: string;
  imap_host: string;
  imap_port: number;
  folder: string;
  sender_filter: string;
  account: number | null;
  account_name: string | null;
  status: "active" | "auth_error" | "error";
  error_message: string;
  last_scanned_at: string | null;
  created_at: string;
};

export type PlaidItem = {
  id: number;
  institution_name: string;
  institution_id: string;
  status: "active" | "login_required" | "error";
  error_message: string;
  last_synced_at: string | null;
  created_at: string;
  accounts_count?: number;
};

export type Category = {
  id: number;
  name: string;
  kind: "Income" | "Expense";
  color: string;
  icon: string;
};

export type Transaction = {
  id: number;
  account: number;
  account_name: string;
  category: number | null;
  category_name: string | null;
  category_color: string | null;
  type: "Income" | "Expense";
  amount: string;
  description: string;
  notes: string;
  date: string;
  is_recurring: boolean;
  recurrence: "daily" | "weekly" | "monthly" | "yearly" | "";
  created_at: string;
};

export type Goal = {
  id: number;
  title: string;
  target_amount: string;
  current_amount: string;
  due_date: string | null;
  completed: boolean;
  progress: number;
  created_at: string;
};

export type Bill = {
  id: number;
  title: string;
  amount: string;
  due_date: string;
  is_paid: boolean;
  category: number | null;
  category_name: string | null;
  created_at: string;
};

export type Budget = {
  id: number;
  category: number | null;
  category_name: string;
  category_color: string;
  amount: string;
  spent: number;
  remaining: number;
  progress: number;
  over_budget: boolean;
  created_at: string;
};

export type DashboardPayload = {
  total_balance: number;
  month_income: number;
  month_expense: number;
  net_savings: number;
  health_score: number;
  accounts: Account[];
  recent_transactions: Transaction[];
  upcoming_bills: Bill[];
  active_goals: Goal[];
  trend: { month: string; income: number; expense: number }[];
  spending_by_category: { name: string; color: string; total: number }[];
};
