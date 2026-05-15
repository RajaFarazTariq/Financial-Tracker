"use client";

import { motion } from "framer-motion";
import { HeartPulse, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { memo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const RADIUS = 56;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Status = {
  label: string;
  tone: string; // HSL "H S% L%"
  description: string;
};

function statusFor(score: number): Status {
  if (score >= 85)
    return {
      label: "Excellent",
      tone: "142 71% 45%",
      description: "You're saving well and have strong cash flow.",
    };
  if (score >= 70)
    return {
      label: "Good",
      tone: "160 84% 42%",
      description: "Healthy savings ratio — keep it up.",
    };
  if (score >= 50)
    return {
      label: "Fair",
      tone: "38 92% 50%",
      description: "Room to improve. Aim to spend less than 70% of income.",
    };
  return {
    label: "Needs attention",
    tone: "0 84% 60%",
    description: "Expenses outpacing income — review categories.",
  };
}

export const HealthCard = memo(function HealthCard({
  score,
  deltaPct = 0,
}: {
  score: number;
  deltaPct?: number;
}) {
  const safeScore = Math.max(0, Math.min(100, score));
  const status = statusFor(safeScore);
  const offset = CIRCUMFERENCE * (1 - safeScore / 100);

  return (
    <Card className="relative h-full overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full opacity-50 blur-3xl"
        style={{
          background: `radial-gradient(closest-side, hsl(${status.tone} / 0.35), transparent 70%)`,
        }}
      />
      <CardHeader className="relative pb-3">
        <CardTitle className="flex items-center gap-2">
          <HeartPulse className="size-4" style={{ color: `hsl(${status.tone})` }} />
          Financial health
        </CardTitle>
        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
          Based on your monthly savings ratio
        </p>
      </CardHeader>
      <CardContent className="relative">
        <div className="flex flex-col items-center gap-4">
          <div className="relative grid h-36 w-36 place-items-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 128 128">
              {/* Track */}
              <circle
                cx="64"
                cy="64"
                r={RADIUS}
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="10"
              />
              {/* Progress arc */}
              <motion.circle
                cx="64"
                cy="64"
                r={RADIUS}
                fill="none"
                stroke={`hsl(${status.tone})`}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                initial={{ strokeDashoffset: CIRCUMFERENCE }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  filter: `drop-shadow(0 0 6px hsl(${status.tone} / 0.55))`,
                }}
              />
            </svg>
            <div className="relative flex flex-col items-center">
              <motion.span
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-4xl font-bold tracking-tight tabular-nums"
                style={{ color: `hsl(${status.tone})` }}
              >
                {safeScore}
              </motion.span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                of 100
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                background: `hsl(${status.tone} / 0.15)`,
                color: `hsl(${status.tone})`,
                boxShadow: `0 0 0 1px hsl(${status.tone} / 0.25)`,
              }}
            >
              <ShieldCheck className="size-3" />
              {status.label}
            </span>
            {deltaPct !== 0 && (
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium ${
                  deltaPct >= 0 ? "text-[hsl(var(--success))]" : "text-[hsl(var(--destructive))]"
                }`}
              >
                {deltaPct >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {deltaPct >= 0 ? "+" : ""}
                {deltaPct.toFixed(1)}% vs last month
              </span>
            )}
          </div>

          <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
            {status.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
});
