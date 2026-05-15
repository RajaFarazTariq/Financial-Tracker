"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { AlertTriangle, BarChart3, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useBudgetMutations, useBudgets, useCategories } from "@/hooks/use-resources";
import type { Budget } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

const schema = z.object({
  category: z.string().min(1, "Pick a target"),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Use a number like 500.00"),
});

type FormValues = z.infer<typeof schema>;
const OVERALL = "__overall__";

function BudgetDialog({ trigger, initial }: { trigger: ReactNode; initial?: Budget }) {
  const [open, setOpen] = useState(false);
  const { data: categories } = useCategories();
  const { create, update } = useBudgetMutations();
  const mutation = initial ? update : create;

  const expenseCategories = (categories ?? []).filter((c) => c.kind === "Expense");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: initial ? (initial.category ? String(initial.category) : OVERALL) : OVERALL,
      amount: initial?.amount ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        category: initial ? (initial.category ? String(initial.category) : OVERALL) : OVERALL,
        amount: initial?.amount ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function submit(values: FormValues) {
    const payload = {
      category: values.category === OVERALL ? null : Number(values.category),
      amount: values.amount,
    };
    const promise = initial
      ? update.mutateAsync({ id: initial.id, ...payload })
      : create.mutateAsync(payload);
    promise.then(() => setOpen(false)).catch(() => {});
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit budget" : "New budget"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <div className="space-y-2">
            <Label>Apply to</Label>
            <Select value={form.watch("category")} onValueChange={(v) => form.setValue("category", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={OVERALL}>Overall — total monthly expenses</SelectItem>
                {expenseCategories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {expenseCategories.length === 0 && (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                You only have the &quot;Overall&quot; option until you create expense categories.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Monthly cap</Label>
            <Input id="amount" inputMode="decimal" placeholder="500.00" {...form.register("amount")} />
            {form.formState.errors.amount && (
              <p className="text-xs text-[hsl(var(--destructive))]">{form.formState.errors.amount.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : initial ? "Save changes" : "Create budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function progressTone(progress: number, over: boolean) {
  if (over) return { bar: "bg-[hsl(var(--destructive))]", label: "destructive" as const };
  if (progress >= 90) return { bar: "bg-[hsl(var(--warning))]", label: "warning" as const };
  if (progress >= 60) return { bar: "bg-amber-500", label: "warning" as const };
  return { bar: "bg-[hsl(var(--success))]", label: "success" as const };
}

function BudgetCard({ b, index }: { b: Budget; index: number }) {
  const { remove } = useBudgetMutations();
  const tone = progressTone(b.progress, b.over_budget);
  const cap = Number(b.amount);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
    >
      <Card className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-2xl"
          style={{ background: `${b.category_color}33` }}
        />
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full" style={{ background: b.category_color }} />
            <CardTitle>{b.category_name}</CardTitle>
          </div>
          <Badge variant={tone.label}>
            {b.over_budget ? (
              <span className="inline-flex items-center gap-1">
                <AlertTriangle className="size-3" /> Over budget
              </span>
            ) : (
              `${Math.round(b.progress)}% used`
            )}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Spent</p>
              <p className="text-2xl font-bold tabular-nums">{formatCurrency(b.spent)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">of</p>
              <p className="text-lg font-semibold tabular-nums">{formatCurrency(cap)}</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--muted))]">
              <div
                className={cn("h-full transition-all", tone.bar)}
                style={{ width: `${Math.min(100, b.progress)}%` }}
              />
            </div>
            <p
              className={cn(
                "text-right text-xs tabular-nums",
                b.over_budget ? "text-[hsl(var(--destructive))]" : "text-[hsl(var(--muted-foreground))]",
              )}
            >
              {b.over_budget
                ? `Over by ${formatCurrency(Math.abs(b.remaining))}`
                : `${formatCurrency(b.remaining)} remaining`}
            </p>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-1 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] p-3">
          <BudgetDialog
            initial={b}
            trigger={
              <Button size="icon" variant="ghost">
                <Pencil className="size-4" />
              </Button>
            }
          />
          <ConfirmDialog
            trigger={
              <Button size="icon" variant="ghost">
                <Trash2 className="size-4 text-[hsl(var(--destructive))]" />
              </Button>
            }
            title={`Delete budget for "${b.category_name}"?`}
            onConfirm={() => remove.mutateAsync(b.id)}
          />
        </CardFooter>
      </Card>
    </motion.div>
  );
}

function Summary({ budgets }: { budgets: Budget[] }) {
  const totalCap = budgets.reduce((s, b) => s + Number(b.amount), 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const overCount = budgets.filter((b) => b.over_budget).length;

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardContent className="p-4">
          <p className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Total monthly cap</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{formatCurrency(totalCap)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Spent so far</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{formatCurrency(totalSpent)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Over budget</p>
          <p
            className={cn(
              "mt-1 text-2xl font-bold tabular-nums",
              overCount > 0 ? "text-[hsl(var(--destructive))]" : "text-[hsl(var(--success))]",
            )}
          >
            {overCount} / {budgets.length}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function BudgetsPage() {
  const { data: budgets, isLoading } = useBudgets();

  return (
    <div>
      <PageHeader
        title="Budgets"
        description="Set monthly spending caps and track them against this month's expenses."
        actions={
          <BudgetDialog
            trigger={
              <Button>
                <Plus /> New budget
              </Button>
            }
          />
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : budgets && budgets.length > 0 ? (
        <>
          <Summary budgets={budgets} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {budgets.map((b, i) => (
              <BudgetCard key={b.id} b={b} index={i} />
            ))}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="grid place-items-center gap-3 p-16 text-center">
            <div className="grid size-12 place-items-center rounded-xl bg-gradient-to-br from-[hsl(var(--primary)/0.18)] to-[hsl(var(--accent)/0.18)] text-[hsl(var(--primary))]">
              <BarChart3 className="size-6" />
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              No budgets yet. Set a monthly cap to keep your spending in check.
            </p>
            <BudgetDialog
              trigger={
                <Button>
                  <Plus /> New budget
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
