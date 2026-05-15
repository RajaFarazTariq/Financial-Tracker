"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAccounts, useCategories, useTransactionMutations } from "@/hooks/use-resources";
import type { Transaction } from "@/lib/types";

const schema = z.object({
  account: z.coerce.number().int().positive("Pick an account"),
  type: z.enum(["Income", "Expense"]),
  category: z.coerce.number().int().positive().optional().nullable(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Use a number like 25.00"),
  description: z.string().min(1, "Required").max(255),
  notes: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
  is_recurring: z.boolean(),
  recurrence: z.enum(["", "daily", "weekly", "monthly", "yearly"]).optional(),
});

type FormValues = z.infer<typeof schema>;

export function TransactionDialog({
  trigger,
  initial,
  defaultType,
}: {
  trigger: ReactNode;
  initial?: Transaction;
  defaultType?: "Income" | "Expense";
}) {
  const [open, setOpen] = useState(false);
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { create, update } = useTransactionMutations();
  const mutation = initial ? update : create;

  const today = new Date().toISOString().slice(0, 10);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      account: initial?.account ?? accounts?.[0]?.id ?? 0,
      type: initial?.type ?? defaultType ?? "Expense",
      category: initial?.category ?? undefined,
      amount: initial?.amount ?? "",
      description: initial?.description ?? "",
      notes: initial?.notes ?? "",
      date: initial?.date ?? today,
      is_recurring: initial?.is_recurring ?? false,
      recurrence: (initial?.recurrence as FormValues["recurrence"]) ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        account: initial?.account ?? accounts?.[0]?.id ?? 0,
        type: initial?.type ?? defaultType ?? "Expense",
        category: initial?.category ?? undefined,
        amount: initial?.amount ?? "",
        description: initial?.description ?? "",
        notes: initial?.notes ?? "",
        date: initial?.date ?? new Date().toISOString().slice(0, 10),
        is_recurring: initial?.is_recurring ?? false,
        recurrence: (initial?.recurrence as FormValues["recurrence"]) ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const type = form.watch("type");
  const filteredCategories = (categories ?? []).filter((c) => c.kind === type);

  function submit(values: FormValues) {
    const recurrence: Transaction["recurrence"] = values.is_recurring
      ? ((values.recurrence || "monthly") as Transaction["recurrence"])
      : "";
    const payload: Partial<Transaction> = {
      account: values.account,
      type: values.type,
      category: values.category || null,
      amount: values.amount,
      description: values.description,
      notes: values.notes,
      date: values.date,
      is_recurring: values.is_recurring,
      recurrence,
    };
    const promise = initial
      ? update.mutateAsync({ id: initial.id, ...payload })
      : create.mutateAsync(payload);
    promise.then(() => setOpen(false)).catch(() => {});
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit transaction" : "New transaction"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => form.setValue("type", v as FormValues["type"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Income">Income</SelectItem>
                  <SelectItem value="Expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Account</Label>
              <Select
                value={String(form.watch("account") || "")}
                onValueChange={(v) => form.setValue("account", Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {(accounts ?? []).map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.account && (
                <p className="text-xs text-[hsl(var(--destructive))]">{form.formState.errors.account.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" inputMode="decimal" placeholder="25.00" {...form.register("amount")} />
              {form.formState.errors.amount && (
                <p className="text-xs text-[hsl(var(--destructive))]">{form.formState.errors.amount.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" {...form.register("date")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" placeholder="Groceries at Trader Joe's" {...form.register("description")} />
            {form.formState.errors.description && (
              <p className="text-xs text-[hsl(var(--destructive))]">{form.formState.errors.description.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Category (optional)</Label>
            <Select
              value={form.watch("category") ? String(form.watch("category")) : "none"}
              onValueChange={(v) => form.setValue("category", v === "none" ? null : Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Uncategorized" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Uncategorized</SelectItem>
                {filteredCategories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" placeholder="Optional notes…" {...form.register("notes")} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] p-3">
            <div>
              <Label className="cursor-pointer">Recurring transaction</Label>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Repeats on a schedule.</p>
            </div>
            <Switch
              checked={form.watch("is_recurring")}
              onCheckedChange={(v) => form.setValue("is_recurring", v)}
            />
          </div>
          {form.watch("is_recurring") && (
            <div className="space-y-2">
              <Label>Recurrence</Label>
              <Select
                value={form.watch("recurrence") || "monthly"}
                onValueChange={(v) => form.setValue("recurrence", v as FormValues["recurrence"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : initial ? "Save changes" : "Add transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
