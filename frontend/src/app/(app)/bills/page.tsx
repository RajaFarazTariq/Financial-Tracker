"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { CalendarClock, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBillMutations, useBills } from "@/hooks/use-resources";
import type { Bill } from "@/lib/types";
import { formatCurrency, formatDate, relativeFromNow } from "@/lib/utils";

const schema = z.object({
  title: z.string().min(1, "Required").max(200),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Use a number"),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
  is_paid: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function BillDialog({ trigger, initial }: { trigger: ReactNode; initial?: Bill }) {
  const [open, setOpen] = useState(false);
  const { create, update } = useBillMutations();
  const mutation = initial ? update : create;
  const today = new Date().toISOString().slice(0, 10);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initial?.title ?? "",
      amount: initial?.amount ?? "",
      due_date: initial?.due_date ?? today,
      is_paid: initial?.is_paid ?? false,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: initial?.title ?? "",
        amount: initial?.amount ?? "",
        due_date: initial?.due_date ?? new Date().toISOString().slice(0, 10),
        is_paid: initial?.is_paid ?? false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function submit(values: FormValues) {
    const promise = initial
      ? update.mutateAsync({ id: initial.id, ...values })
      : create.mutateAsync(values);
    promise.then(() => setOpen(false)).catch(() => {});
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit bill" : "New bill"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="Electricity, Internet, Rent…" {...form.register("title")} />
            {form.formState.errors.title && (
              <p className="text-xs text-[hsl(var(--destructive))]">{form.formState.errors.title.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" inputMode="decimal" placeholder="75.00" {...form.register("amount")} />
              {form.formState.errors.amount && (
                <p className="text-xs text-[hsl(var(--destructive))]">{form.formState.errors.amount.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due date</Label>
              <Input id="due_date" type="date" {...form.register("due_date")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : initial ? "Save changes" : "Add bill"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function BillsPage() {
  const [tab, setTab] = useState<"upcoming" | "paid" | "all">("upcoming");
  const { data: bills, isLoading } = useBills();
  const { update, remove } = useBillMutations();

  const filtered = (bills ?? []).filter((b) =>
    tab === "all" ? true : tab === "paid" ? b.is_paid : !b.is_paid,
  );

  return (
    <div>
      <PageHeader
        title="Upcoming bills"
        description="Track everything you owe and never miss a payment."
        actions={
          <BillDialog
            trigger={
              <Button>
                <Plus /> New bill
              </Button>
            }
          />
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-4">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((b, i) => {
            const overdue = !b.is_paid && new Date(b.due_date) < new Date(new Date().toDateString());
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
              >
                <Card>
                  <CardContent className="flex flex-wrap items-center gap-3 p-4">
                    <div
                      className={`grid size-10 place-items-center rounded-lg ${
                        b.is_paid
                          ? "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]"
                          : overdue
                            ? "bg-[hsl(var(--destructive)/0.15)] text-[hsl(var(--destructive))]"
                            : "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]"
                      }`}
                    >
                      <CalendarClock className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{b.title}</p>
                        {b.is_paid ? (
                          <Badge variant="success">Paid</Badge>
                        ) : overdue ? (
                          <Badge variant="destructive">Overdue</Badge>
                        ) : (
                          <Badge variant="warning">Due {relativeFromNow(b.due_date)}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{formatDate(b.due_date)}</p>
                    </div>
                    <span className="shrink-0 text-lg font-semibold tabular-nums">{formatCurrency(b.amount)}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="sm"
                        variant={b.is_paid ? "ghost" : "outline"}
                        onClick={() => update.mutate({ id: b.id, is_paid: !b.is_paid })}
                      >
                        <Check className="size-4" />
                        {b.is_paid ? "Mark unpaid" : "Mark paid"}
                      </Button>
                      <BillDialog
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
                        title={`Delete "${b.title}"?`}
                        onConfirm={() => remove.mutateAsync(b.id)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="grid place-items-center gap-3 p-16 text-center">
            <CalendarClock className="size-10 text-[hsl(var(--muted-foreground))]" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {tab === "upcoming" ? "No upcoming bills." : tab === "paid" ? "No paid bills yet." : "No bills at all."}
            </p>
            <BillDialog
              trigger={
                <Button>
                  <Plus /> New bill
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
