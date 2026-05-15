"use client";

import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type Point = { month: string; income: number; expense: number };

const INCOME_COLOR = "hsl(160 84% 42%)"; // emerald-teal
const EXPENSE_COLOR = "hsl(14 90% 56%)"; // orange-red

function formatMonth(m: string) {
  // "2026-05" → "May 26"
  const [y, mo] = m.split("-");
  const date = new Date(Number(y), Number(mo) - 1, 1);
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" }).format(date);
}

function compactCurrency(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `Rs ${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `Rs ${(n / 1_000).toFixed(1)}k`;
  return `Rs ${Math.round(n)}`;
}

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const income = payload.find((p) => p.dataKey === "income")?.value ?? 0;
  const expense = payload.find((p) => p.dataKey === "expense")?.value ?? 0;
  const net = Number(income) - Number(expense);
  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]/95 p-3 shadow-2xl backdrop-blur">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
        {formatMonth(String(label))}
      </p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-2 text-xs">
            <span className="size-2 rounded-full" style={{ background: INCOME_COLOR }} />
            Income
          </span>
          <span className="font-semibold tabular-nums" style={{ color: INCOME_COLOR }}>
            {formatCurrency(Number(income))}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-2 text-xs">
            <span className="size-2 rounded-full" style={{ background: EXPENSE_COLOR }} />
            Expenses
          </span>
          <span className="font-semibold tabular-nums" style={{ color: EXPENSE_COLOR }}>
            {formatCurrency(Number(expense))}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-6 border-t border-[hsl(var(--border))] pt-2">
          <span className="text-xs font-medium">Net</span>
          <span
            className={`font-semibold tabular-nums ${
              net >= 0 ? "text-[hsl(var(--success))]" : "text-[hsl(var(--destructive))]"
            }`}
          >
            {net >= 0 ? "+" : ""}
            {formatCurrency(net)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function TrendChart({ data }: { data: Point[] }) {
  const filled =
    data.length > 0
      ? data
      : [{ month: new Date().toISOString().slice(0, 7), income: 0, expense: 0 }];

  const totalIncome = filled.reduce((s, p) => s + p.income, 0);
  const totalExpense = filled.reduce((s, p) => s + p.expense, 0);
  const totalNet = totalIncome - totalExpense;

  return (
    <Card className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full opacity-40 blur-3xl"
        style={{
          background: `radial-gradient(closest-side, ${INCOME_COLOR}33, transparent 70%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -bottom-20 h-64 w-64 rounded-full opacity-30 blur-3xl"
        style={{
          background: `radial-gradient(closest-side, ${EXPENSE_COLOR}33, transparent 70%)`,
        }}
      />

      <CardHeader className="relative flex flex-row items-start justify-between gap-4 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-4 text-[hsl(var(--primary))]" />
            Income vs. Expenses
          </CardTitle>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            Past 6 months · monthly aggregate
          </p>
        </div>
        <div className="hidden gap-4 sm:flex">
          <div className="text-right">
            <p className="flex items-center justify-end gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              <ArrowDownLeft className="size-3" style={{ color: INCOME_COLOR }} /> Income
            </p>
            <p className="text-sm font-semibold tabular-nums" style={{ color: INCOME_COLOR }}>
              {formatCurrency(totalIncome)}
            </p>
          </div>
          <div className="text-right">
            <p className="flex items-center justify-end gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              <ArrowUpRight className="size-3" style={{ color: EXPENSE_COLOR }} /> Expenses
            </p>
            <p className="text-sm font-semibold tabular-nums" style={{ color: EXPENSE_COLOR }}>
              {formatCurrency(totalExpense)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Net
            </p>
            <p
              className={`text-sm font-semibold tabular-nums ${
                totalNet >= 0 ? "text-[hsl(var(--success))]" : "text-[hsl(var(--destructive))]"
              }`}
            >
              {totalNet >= 0 ? "+" : ""}
              {formatCurrency(totalNet)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="h-72 w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filled} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="income-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={INCOME_COLOR} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={INCOME_COLOR} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expense-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={EXPENSE_COLOR} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={EXPENSE_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 6" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickFormatter={formatMonth}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickFormatter={compactCurrency}
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                width={56}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: "hsl(var(--primary) / 0.25)", strokeWidth: 1, strokeDasharray: "4 4" }}
              />
              <Area
                type="monotone"
                dataKey="income"
                stroke={INCOME_COLOR}
                strokeWidth={2.5}
                fill="url(#income-grad)"
                activeDot={{ r: 5, stroke: "hsl(var(--card))", strokeWidth: 2 }}
                animationDuration={900}
              />
              <Area
                type="monotone"
                dataKey="expense"
                stroke={EXPENSE_COLOR}
                strokeWidth={2.5}
                fill="url(#expense-grad)"
                activeDot={{ r: 5, stroke: "hsl(var(--card))", strokeWidth: 2 }}
                animationDuration={900}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </CardContent>
    </Card>
  );
}
