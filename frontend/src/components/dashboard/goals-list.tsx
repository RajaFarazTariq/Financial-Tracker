"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Sparkles, Target, Trophy } from "lucide-react";
import Link from "next/link";
import { memo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Goal } from "@/lib/types";
import { cn, formatCurrency, relativeFromNow } from "@/lib/utils";

const MILESTONES = [25, 50, 75, 100];

function statusFor(progress: number) {
  if (progress >= 100) return { tone: "142 71% 45%", label: "Completed", icon: Trophy };
  if (progress >= 75) return { tone: "263 70% 65%", label: "Almost there", icon: Sparkles };
  if (progress >= 50) return { tone: "210 100% 58%", label: "On track", icon: CheckCircle2 };
  if (progress >= 25) return { tone: "38 92% 55%", label: "Building", icon: Target };
  return { tone: "0 0% 60%", label: "Starting", icon: Target };
}

export const GoalsList = memo(function GoalsList({ goals }: { goals: Goal[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Target className="size-4 text-[hsl(var(--primary))]" />
            Active goals
          </CardTitle>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            {goals.length === 0 ? "No goals yet" : `${goals.length} in progress`}
          </p>
        </div>
        <Button asChild size="sm" variant="ghost">
          <Link href="/goals">View all</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {goals.length === 0 && (
          <div className="grid place-items-center gap-2 py-10 text-center">
            <div className="grid size-10 place-items-center rounded-xl bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]">
              <Target className="size-5" />
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Set a savings goal to start tracking.</p>
          </div>
        )}
        {goals.map((g, i) => {
          const s = statusFor(g.progress);
          const Icon = s.icon;
          return (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
              className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 transition-all hover:border-[hsl(var(--primary)/0.35)] hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="grid size-7 shrink-0 place-items-center rounded-lg"
                      style={{ background: `hsl(${s.tone} / 0.15)`, color: `hsl(${s.tone})` }}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <p className="truncate text-sm font-semibold">{g.title}</p>
                  </div>
                  {g.due_date && (
                    <p className="mt-1 pl-9 text-[11px] text-[hsl(var(--muted-foreground))]">
                      Target {relativeFromNow(g.due_date)}
                    </p>
                  )}
                </div>
                <Badge
                  className="shrink-0 text-[10px]"
                  style={{
                    background: `hsl(${s.tone} / 0.15)`,
                    color: `hsl(${s.tone})`,
                    border: `1px solid hsl(${s.tone} / 0.25)`,
                  }}
                >
                  {s.label}
                </Badge>
              </div>

              <div className="mt-3">
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      background: `linear-gradient(90deg, hsl(${s.tone}), hsl(${s.tone} / 0.7))`,
                      boxShadow: `0 0 12px hsl(${s.tone} / 0.55)`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, g.progress)}%` }}
                    transition={{ duration: 0.9, delay: 0.1 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  />
                  {/* Milestones */}
                  {MILESTONES.slice(0, -1).map((m) => (
                    <span
                      key={m}
                      className={cn(
                        "absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full",
                        g.progress >= m ? "bg-white" : "bg-[hsl(var(--background))]",
                      )}
                      style={{
                        left: `${m}%`,
                        boxShadow:
                          g.progress >= m
                            ? `0 0 0 1.5px hsl(${s.tone})`
                            : `0 0 0 1.5px hsl(var(--border))`,
                      }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-medium tabular-nums" style={{ color: `hsl(${s.tone})` }}>
                    {Math.round(g.progress)}%
                  </span>
                  <span className="tabular-nums text-[hsl(var(--muted-foreground))]">
                    {formatCurrency(g.current_amount)} / {formatCurrency(g.target_amount)}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
});
