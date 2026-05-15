"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { memo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Bill } from "@/lib/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

type Urgency = {
  level: "overdue" | "urgent" | "soon" | "ok";
  bar: string; // hsl tuple
  label: string;
};

function urgencyFor(dueDate: string): Urgency {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { level: "overdue", bar: "0 84% 60%", label: `${Math.abs(days)}d overdue` };
  if (days === 0) return { level: "urgent", bar: "14 90% 56%", label: "Due today" };
  if (days <= 3) return { level: "urgent", bar: "14 90% 56%", label: `${days}d left` };
  if (days <= 7) return { level: "soon", bar: "38 92% 50%", label: `${days}d left` };
  return { level: "ok", bar: "160 84% 42%", label: `${days}d left` };
}

export const BillsList = memo(function BillsList({ bills }: { bills: Bill[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="size-4 text-[hsl(var(--primary))]" />
            Upcoming bills
          </CardTitle>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            {bills.length === 0 ? "Nothing due soon" : `Next ${bills.length} unpaid`}
          </p>
        </div>
        <Button asChild size="sm" variant="ghost">
          <Link href="/bills">View all</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {bills.length === 0 ? (
          <div className="grid place-items-center gap-2 py-10 text-center">
            <div className="grid size-10 place-items-center rounded-xl bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]">
              <CheckCircle2 className="size-5" />
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">All caught up!</p>
          </div>
        ) : (
          bills.map((b, i) => {
            const u = urgencyFor(b.due_date);
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                whileHover={{ x: 2 }}
                className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 transition-all hover:border-[hsl(var(--primary)/0.35)] hover:shadow-md"
                style={{
                  boxShadow:
                    u.level === "overdue" || u.level === "urgent"
                      ? `inset 4px 0 0 hsl(${u.bar})`
                      : `inset 3px 0 0 hsl(${u.bar} / 0.7)`,
                }}
              >
                <div
                  className="grid size-9 shrink-0 place-items-center rounded-lg"
                  style={{
                    background: `hsl(${u.bar} / 0.15)`,
                    color: `hsl(${u.bar})`,
                  }}
                >
                  {u.level === "overdue" ? (
                    <AlertTriangle className="size-4" />
                  ) : (
                    <CalendarClock className="size-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{b.title}</p>
                  <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">
                    Due {formatDate(b.due_date)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-semibold tabular-nums">{formatCurrency(b.amount)}</span>
                  <Badge
                    variant={
                      u.level === "overdue"
                        ? "destructive"
                        : u.level === "urgent"
                          ? "warning"
                          : u.level === "soon"
                            ? "outline"
                            : "success"
                    }
                    className={cn("text-[10px]")}
                  >
                    {u.label}
                  </Badge>
                </div>
              </motion.div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
});
