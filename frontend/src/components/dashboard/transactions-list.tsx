"use client";

import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";
import Link from "next/link";
import { memo } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Transaction } from "@/lib/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const INCOME_TONE = "160 84% 42%"; // emerald
const EXPENSE_TONE = "14 90% 56%"; // orange-red

export const TransactionsList = memo(function TransactionsList({ transactions }: { transactions: Transaction[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="size-4 text-[hsl(var(--primary))]" />
            Recent transactions
          </CardTitle>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            {transactions.length === 0 ? "Nothing yet" : `Latest ${transactions.length} entries`}
          </p>
        </div>
        <Button asChild size="sm" variant="ghost">
          <Link href="/transactions">View all</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {transactions.length === 0 ? (
          <div className="grid place-items-center gap-2 py-10 text-center">
            <div className="grid size-10 place-items-center rounded-xl bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
              <Receipt className="size-5" />
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Log your first transaction.</p>
          </div>
        ) : (
          transactions.map((t, i) => {
            const isIncome = t.type === "Income";
            const tone = isIncome ? INCOME_TONE : EXPENSE_TONE;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                whileHover={{ x: 2 }}
                className={cn(
                  "group relative flex items-center gap-3 overflow-hidden rounded-xl border border-transparent p-2.5 transition-all",
                  "hover:border-[hsl(var(--border))]",
                )}
                style={{
                  background: `linear-gradient(90deg, hsl(${tone} / 0.06), transparent 60%)`,
                  boxShadow: `inset 3px 0 0 hsl(${tone} / 0.7)`,
                }}
              >
                <div
                  className="grid size-9 shrink-0 place-items-center rounded-lg"
                  style={{ background: `hsl(${tone} / 0.15)`, color: `hsl(${tone})` }}
                >
                  {isIncome ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-tight">{t.description}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                      {t.account_name}
                    </span>
                    {t.category_name && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                        style={{
                          background: `${t.category_color ?? "#6366f1"}22`,
                          color: t.category_color ?? "#6366f1",
                        }}
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ background: t.category_color ?? "#6366f1" }}
                        />
                        {t.category_name}
                      </span>
                    )}
                    <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                      · {formatDate(t.date)}
                    </span>
                  </div>
                </div>
                <span
                  className="shrink-0 text-sm font-semibold tabular-nums"
                  style={{ color: `hsl(${tone})` }}
                >
                  {isIncome ? "+" : "−"}
                  {formatCurrency(t.amount)}
                </span>
              </motion.div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
});
