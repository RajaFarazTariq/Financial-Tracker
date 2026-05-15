import Link from "next/link";
import { ArrowRight, BarChart3, ShieldCheck, Sparkles, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  { icon: Wallet, title: "Multi-account ledger", body: "Cash, checking, savings, credit, and investment accounts in one view." },
  { icon: BarChart3, title: "Live analytics", body: "Income vs. expenses, category breakdowns, and 6-month trends." },
  { icon: Sparkles, title: "Smart insights", body: "Financial health score and category-aware spending feedback." },
  { icon: ShieldCheck, title: "JWT-secured API", body: "Token rotation, per-user scoping, throttling, and CSRF protection." },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[hsl(var(--background))]">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-[hsl(var(--primary)/0.25)] blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-[hsl(var(--accent)/0.25)] blur-3xl" />
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white shadow-lg">
            ₣
          </span>
          <span className="gradient-text">Financial Tracker</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/sign-up">Get started</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto flex max-w-6xl flex-col items-center px-6 pt-16 text-center md:pt-24">
        <span className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))]">
          New • Smart insights & financial health score
        </span>
        <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight md:text-6xl">
          Your money, <span className="gradient-text">beautifully tracked.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-balance text-[hsl(var(--muted-foreground))] md:text-lg">
          A modern personal finance dashboard with budgets, goals, recurring transactions, and a
          health score — all in one premium experience.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/sign-up">
              Create free account <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/sign-in">I already have an account</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-6 py-24 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="glass rounded-xl p-5">
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-[hsl(var(--primary)/0.2)] to-[hsl(var(--accent)/0.2)] text-[hsl(var(--primary))]">
              <f.icon className="size-5" />
            </div>
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
