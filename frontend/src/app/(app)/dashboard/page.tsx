"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Wallet } from "lucide-react";
import dynamic from "next/dynamic";

import { BillsList } from "@/components/dashboard/bills-list";
import { GoalsList } from "@/components/dashboard/goals-list";
import { HealthCard } from "@/components/dashboard/health-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { TransactionsList } from "@/components/dashboard/transactions-list";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import type { DashboardPayload } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

// Recharts is ~80KB gzipped — defer it from the initial bundle.
const TrendChart = dynamic(
  () => import("@/components/dashboard/trend-chart").then((m) => m.TrendChart),
  { ssr: false, loading: () => <Skeleton className="h-80 w-full" /> },
);
const SpendingPie = dynamic(
  () => import("@/components/dashboard/spending-pie").then((m) => m.SpendingPie),
  { ssr: false, loading: () => <Skeleton className="h-80 w-full" /> },
);

function useDashboard() {
  return useQuery<DashboardPayload>({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get<DashboardPayload>("/dashboard/")).data,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useDashboard();
  const { data: user } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="grid place-items-center py-24 text-center">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Could not load your dashboard. Check that the API server is running.
        </p>
      </div>
    );
  }

  const firstName = user?.first_name?.trim() || user?.username || "there";

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-1"
      >
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Welcome back, <span className="gradient-text">{firstName}</span>
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Here&apos;s a snapshot of your finances this month.
        </p>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total balance"
          value={formatCurrency(data.total_balance)}
          icon={Wallet}
          theme="blue"
          delay={0}
        />
        <StatCard
          label="Income this month"
          value={formatCurrency(data.month_income)}
          icon={ArrowDownLeft}
          tone="positive"
          theme="green"
          delay={0.05}
        />
        <StatCard
          label="Expenses this month"
          value={formatCurrency(data.month_expense)}
          icon={ArrowUpRight}
          tone="negative"
          theme="red"
          delay={0.1}
        />
        <StatCard
          label="Net savings"
          value={formatCurrency(data.net_savings)}
          icon={PiggyBank}
          tone={data.net_savings >= 0 ? "positive" : "negative"}
          theme="purple"
          delay={0.15}
        />
      </div>

      {/* Trend + Health */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrendChart data={data.trend} />
        </div>
        <HealthCard score={data.health_score} />
      </div>

      {/* Spending + Bills */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SpendingPie data={data.spending_by_category} />
        <BillsList bills={data.upcoming_bills} />
      </div>

      {/* Goals + Transactions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GoalsList goals={data.active_goals} />
        <TransactionsList transactions={data.recent_transactions} />
      </div>
    </div>
  );
}
