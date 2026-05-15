"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { memo, type CSSProperties } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Theme = "blue" | "green" | "red" | "purple";

const THEMES: Record<Theme, { c1: string; c2: string }> = {
  // HSL "H S% L%" so we can compose with arbitrary opacity downstream.
  blue: { c1: "210 100% 58%", c2: "190 92% 50%" }, // blue → cyan
  green: { c1: "142 71% 45%", c2: "160 84% 39%" }, // emerald → teal
  red: { c1: "0 84% 60%", c2: "20 92% 56%" }, // red → orange
  purple: { c1: "263 72% 62%", c2: "286 78% 58%" }, // violet → magenta
};

type Props = {
  label: string;
  value: string;
  icon: LucideIcon;
  delta?: string;
  tone?: "default" | "positive" | "negative";
  theme?: Theme;
  delay?: number;
};

export const StatCard = memo(function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  tone = "default",
  theme = "blue",
  delay = 0,
}: Props) {
  const { c1, c2 } = THEMES[theme];
  const cssVars = { "--c1": c1, "--c2": c2 } as CSSProperties;

  // Entry animation via Framer Motion (one-time, fires after mount).
  // Hover lift is CSS-only — much cheaper than whileHover and runs on the compositor.
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      style={cssVars}
      className="will-change-transform"
    >
      <Card
        className={cn(
          "relative overflow-hidden transition-[transform,border-color,box-shadow] duration-300 ease-out",
          "border-[hsl(var(--c1)/0.18)]",
          "hover:-translate-y-1 hover:border-[hsl(var(--c1)/0.5)]",
          "hover:shadow-[0_10px_30px_-12px_hsl(var(--c1)/0.45)]",
        )}
      >
        {/* Soft themed glow in the top-right corner */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, hsl(var(--c1) / 0.32), hsl(var(--c2) / 0.18), transparent)",
          }}
        />

        {/* Diagonal underlay gradient for premium depth */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--c1) / 0.06) 0%, transparent 55%, hsl(var(--c2) / 0.04) 100%)",
          }}
        />

        <CardContent className="relative flex items-start justify-between p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              {label}
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
              {value}
            </p>
            {delta && (
              <p
                className={cn(
                  "mt-1 text-xs font-medium",
                  tone === "positive" && "text-[hsl(var(--success))]",
                  tone === "negative" && "text-[hsl(var(--destructive))]",
                  tone === "default" && "text-[hsl(var(--muted-foreground))]",
                )}
              >
                {delta}
              </p>
            )}
          </div>
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg shadow-inner ring-1 ring-inset"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--c1) / 0.22), hsl(var(--c2) / 0.22))",
              color: "hsl(var(--c1))",
              boxShadow:
                "0 6px 18px -8px hsl(var(--c1) / 0.45), inset 0 0 0 1px hsl(var(--c1) / 0.25)",
            }}
          >
            <Icon className="size-5" strokeWidth={2.25} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});
