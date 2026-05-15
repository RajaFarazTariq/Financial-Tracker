"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  Building2,
  CreditCard,
  Landmark,
  PiggyBank,
  Plus,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { ConnectBank } from "@/components/connect-bank";
import { EmailAlerts } from "@/components/connect-email-alerts";
import { LinkedBanks } from "@/components/linked-banks";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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
import { useAccountMutations, useAccounts } from "@/hooks/use-resources";
import type { Account } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const ACCOUNT_KINDS = [
  { value: "cash", label: "Cash", icon: Wallet },
  { value: "checking", label: "Checking", icon: Building2 },
  { value: "savings", label: "Savings", icon: PiggyBank },
  { value: "credit", label: "Credit card", icon: CreditCard },
  { value: "investment", label: "Investment", icon: TrendingUp },
] as const;

const CURRENCIES = ["PKR", "USD", "EUR", "GBP", "JPY", "INR", "AUD", "CAD"];

const schema = z.object({
  name: z.string().min(1, "Required").max(100),
  kind: z.enum(["cash", "checking", "savings", "credit", "investment"]),
  currency: z.string().min(3).max(3),
  balance: z.string().regex(/^-?\d+(\.\d{1,2})?$/, "Use a number like 1234.56"),
});

type FormValues = z.infer<typeof schema>;

function AccountForm({ initial, onSubmit, submitting }: { initial?: Account; onSubmit: (v: FormValues) => void; submitting: boolean }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      kind: initial?.kind ?? "checking",
      currency: initial?.currency ?? "PKR",
      balance: initial?.balance ?? "0.00",
    },
  });
  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="Main checking" {...form.register("name")} />
        {form.formState.errors.name && (
          <p className="text-xs text-[hsl(var(--destructive))]">{form.formState.errors.name.message}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Kind</Label>
          <Select value={form.watch("kind")} onValueChange={(v) => form.setValue("kind", v as FormValues["kind"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACCOUNT_KINDS.map((k) => (
                <SelectItem key={k.value} value={k.value}>
                  {k.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Currency</Label>
          <Select value={form.watch("currency")} onValueChange={(v) => form.setValue("currency", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="balance">Starting balance</Label>
        <Input id="balance" inputMode="decimal" placeholder="0.00" {...form.register("balance")} />
        {form.formState.errors.balance && (
          <p className="text-xs text-[hsl(var(--destructive))]">{form.formState.errors.balance.message}</p>
        )}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : initial ? "Save changes" : "Create account"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function AccountDialog({
  trigger,
  initial,
}: {
  trigger: React.ReactNode;
  initial?: Account;
}) {
  const [open, setOpen] = useState(false);
  const { create, update } = useAccountMutations();
  const mutation = initial ? update : create;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit account" : "New account"}</DialogTitle>
        </DialogHeader>
        <AccountForm
          initial={initial}
          submitting={mutation.isPending}
          onSubmit={(v) => {
            const payload = { ...v, balance: v.balance };
            const promise = initial
              ? update.mutateAsync({ id: initial.id, ...payload })
              : create.mutateAsync(payload);
            promise.then(() => setOpen(false)).catch(() => {});
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function kindMeta(kind: Account["kind"]) {
  return ACCOUNT_KINDS.find((k) => k.value === kind) ?? ACCOUNT_KINDS[1];
}

export default function AccountsPage() {
  const { data: accounts, isLoading } = useAccounts();
  const { remove } = useAccountMutations();

  return (
    <div>
      <PageHeader
        title="Accounts"
        description="Manage every cash, bank, credit, and investment account in one place."
        actions={
          <div className="flex gap-2">
            <ConnectBank />
            <AccountDialog
              trigger={
                <Button>
                  <Plus /> New account
                </Button>
              }
            />
          </div>
        }
      />

      <LinkedBanks />
      <EmailAlerts />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : accounts && accounts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a, i) => {
            const meta = kindMeta(a.kind);
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
              >
                <Card className="relative overflow-hidden">
                  <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-gradient-to-br from-[hsl(var(--primary)/0.18)] to-[hsl(var(--accent)/0.18)] blur-2xl" />
                  <CardContent className="space-y-4 p-6">
                    <div className="flex items-start justify-between">
                      <div className="grid size-10 place-items-center rounded-lg bg-gradient-to-br from-[hsl(var(--primary)/0.15)] to-[hsl(var(--accent)/0.15)] text-[hsl(var(--primary))]">
                        <meta.icon className="size-5" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {a.is_synced && <Badge variant="success">Synced</Badge>}
                        <Badge variant="secondary">{a.currency}</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {meta.label}
                        {a.is_synced && a.mask ? ` ···· ${a.mask}` : ""}
                      </p>
                      <p className="text-lg font-semibold">{a.name}</p>
                    </div>
                    <p className="text-3xl font-bold tracking-tight tabular-nums">
                      {formatCurrency(a.balance, a.currency)}
                    </p>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between gap-2 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] p-3">
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {a.transactions_count ?? 0} transactions
                    </span>
                    {a.is_synced ? (
                      <span className="truncate text-xs text-[hsl(var(--muted-foreground))]">
                        Auto-synced{a.institution ? ` · ${a.institution}` : ""}
                      </span>
                    ) : (
                      <div className="flex gap-1">
                        <AccountDialog
                          initial={a}
                          trigger={
                            <Button size="sm" variant="ghost">
                              Edit
                            </Button>
                          }
                        />
                        <ConfirmDialog
                          trigger={
                            <Button size="icon" variant="ghost">
                              <Trash2 className="size-4 text-[hsl(var(--destructive))]" />
                            </Button>
                          }
                          title={`Delete "${a.name}"?`}
                          description="All transactions on this account will be deleted too."
                          onConfirm={() => remove.mutateAsync(a.id)}
                        />
                      </div>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="grid place-items-center gap-3 p-16 text-center">
            <Landmark className="size-10 text-[hsl(var(--muted-foreground))]" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              You have no accounts yet. Create one to start tracking transactions.
            </p>
            <AccountDialog
              trigger={
                <Button>
                  <Plus /> New account
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
