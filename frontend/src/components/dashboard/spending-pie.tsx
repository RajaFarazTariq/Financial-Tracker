"use client";

import { motion } from "framer-motion";
import { PieChart as PieIcon } from "lucide-react";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";

type Slice = { name: string; color: string; total: number };

const FALLBACK_PALETTE = [
  "hsl(217 91% 60%)",
  "hsl(263 70% 65%)",
  "hsl(160 84% 42%)",
  "hsl(38 92% 55%)",
  "hsl(14 90% 56%)",
  "hsl(290 70% 60%)",
  "hsl(190 80% 50%)",
  "hsl(0 84% 60%)",
];

type ActiveShapeArg = {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
};

function ActiveShape(props: ActiveShapeArg) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 8}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.3}
      />
    </g>
  );
}

export function SpendingPie({ data }: { data: Slice[] }) {
  const [active, setActive] = useState<number | null>(null);

  // Ensure every slice has a color
  const colored = data.map((s, i) => ({
    ...s,
    color: s.color && s.color !== "#94a3b8" ? s.color : FALLBACK_PALETTE[i % FALLBACK_PALETTE.length],
  }));
  const total = colored.reduce((s, x) => s + x.total, 0);
  const sorted = [...colored].sort((a, b) => b.total - a.total);
  const top = sorted[0];

  if (!data.length || total === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieIcon className="size-4 text-[hsl(var(--primary))]" />
            Spending breakdown
          </CardTitle>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">This month, by category</p>
        </CardHeader>
        <CardContent className="grid h-72 place-items-center text-center">
          <div>
            <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl border border-dashed border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]">
              <PieIcon className="size-5" />
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">No expenses yet this month.</p>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              Log a transaction to see the breakdown here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative h-full overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-30 blur-3xl"
        style={{ background: `radial-gradient(closest-side, ${top.color}66, transparent 70%)` }}
      />
      <CardHeader className="relative flex flex-row items-start justify-between gap-4 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <PieIcon className="size-4 text-[hsl(var(--primary))]" />
            Spending breakdown
          </CardTitle>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            This month · {colored.length} categor{colored.length === 1 ? "y" : "ies"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Total
          </p>
          <p className="text-sm font-semibold tabular-nums">{formatCurrency(total)}</p>
        </div>
      </CardHeader>

      <CardContent className="relative">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
          <div className="relative h-56 w-56 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  {colored.map((s, i) => (
                    <radialGradient key={i} id={`pie-grad-${i}`} cx="50%" cy="50%" r="55%">
                      <stop offset="0%" stopColor={s.color} stopOpacity={1} />
                      <stop offset="100%" stopColor={s.color} stopOpacity={0.78} />
                    </radialGradient>
                  ))}
                </defs>
                <Pie
                  data={colored}
                  dataKey="total"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={2}
                  cornerRadius={6}
                  startAngle={90}
                  endAngle={-270}
                  activeIndex={active ?? undefined}
                  activeShape={ActiveShape as never}
                  onMouseEnter={(_, idx) => setActive(idx)}
                  onMouseLeave={() => setActive(null)}
                  animationDuration={800}
                >
                  {colored.map((s, i) => (
                    <Cell
                      key={s.name}
                      fill={`url(#pie-grad-${i})`}
                      stroke="hsl(var(--card))"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Centre overlay */}
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="text-center">
                {active !== null && colored[active] ? (
                  <>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      {colored[active].name}
                    </p>
                    <p
                      className="text-xl font-bold tabular-nums"
                      style={{ color: colored[active].color }}
                    >
                      {Math.round((colored[active].total / total) * 100)}%
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums">
                      {formatCurrency(colored[active].total)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Top
                    </p>
                    <p className="truncate text-sm font-semibold" style={{ color: top.color }}>
                      {top.name}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums">
                      {Math.round((top.total / total) * 100)}%
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          <ul className="flex flex-1 flex-col gap-1.5 self-stretch text-sm">
            {sorted.slice(0, 6).map((s) => {
              const pct = (s.total / total) * 100;
              const isActive = active !== null && colored[active]?.name === s.name;
              return (
                <motion.li
                  key={s.name}
                  layout
                  onMouseEnter={() => setActive(colored.findIndex((c) => c.name === s.name))}
                  onMouseLeave={() => setActive(null)}
                  className={cn(
                    "group relative cursor-default rounded-lg border px-3 py-2 transition-colors",
                    isActive
                      ? "border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)]"
                      : "border-transparent hover:bg-[hsl(var(--muted)/0.4)]",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{
                          background: s.color,
                          boxShadow: isActive ? `0 0 0 3px ${s.color}33` : undefined,
                        }}
                      />
                      <span className="truncate text-xs font-medium">{s.name}</span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums" style={{ color: s.color }}>
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-3">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: s.color }}
                      />
                    </div>
                    <span className="shrink-0 text-[10px] tabular-nums text-[hsl(var(--muted-foreground))]">
                      {formatCurrency(s.total)}
                    </span>
                  </div>
                </motion.li>
              );
            })}
            {sorted.length > 6 && (
              <li className="px-3 pt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                + {sorted.length - 6} more categories
              </li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
