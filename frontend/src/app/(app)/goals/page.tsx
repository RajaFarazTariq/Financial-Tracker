"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { CheckCircle2, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ConfirmDialog } from "@/components/confirm-dialog";
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useGoalMutations, useGoals } from "@/hooks/use-resources";
import type { Goal } from "@/lib/types";
import { formatCurrency, formatDate, relativeFromNow } from "@/lib/utils";

const schema = z.object({
  title: z.string().min(1, "Required").max(200),
  target_amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Use a number"),
  current_amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Use a number"),
  due_date: z.string().optional(),
  completed: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function GoalDialog({ trigger, initial }: { trigger: ReactNode; initial?: Goal }) {
  const [open, setOpen] = useState(false);
  const { create, update } = useGoalMutations();
  const mutation = initial ? update : create;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initial?.title ?? "",
      target_amount: initial?.target_amount ?? "",
      current_amount: initial?.current_amount ?? "0",
      due_date: initial?.due_date ?? "",
      completed: initial?.completed ?? false,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: initial?.title ?? "",
        target_amount: initial?.target_amount ?? "",
        current_amount: initial?.current_amount ?? "0",
        due_date: initial?.due_date ?? "",
        completed: initial?.completed ?? false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function submit(values: FormValues) {
    const payload = { ...values, due_date: values.due_date || null };
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
          <DialogTitle>{initial ? "Edit goal" : "New goal"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="Emergency fund" {...form.register("title")} />
            {form.formState.errors.title && (
              <p className="text-xs text-[hsl(var(--destructive))]">{form.formState.errors.title.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="target_amount">Target amount</Label>
              <Input id="target_amount" inputMode="decimal" placeholder="5000.00" {...form.register("target_amount")} />
              {form.formState.errors.target_amount && (
                <p className="text-xs text-[hsl(var(--destructive))]">{form.formState.errors.target_amount.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_amount">Current amount</Label>
              <Input id="current_amount" inputMode="decimal" placeholder="0.00" {...form.register("current_amount")} />
              {form.formState.errors.current_amount && (
                <p className="text-xs text-[hsl(var(--destructive))]">{form.formState.errors.current_amount.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="due_date">Target date (optional)</Label>
            <Input id="due_date" type="date" {...form.register("due_date")} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] p-3">
            <Label className="cursor-pointer">Mark as completed</Label>
            <Switch
              checked={form.watch("completed")}
              onCheckedChange={(v) => form.setValue("completed", v)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : initial ? "Save changes" : "Create goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function GoalsPage() {
  const { data: goals, isLoading } = useGoals();
  const { remove, update } = useGoalMutations();

  return (
    <div>
      <PageHeader
        title="Goals"
        description="Set savings targets and track your progress toward them."
        actions={
          <GoalDialog
            trigger={
              <Button>
                <Plus /> New goal
              </Button>
            }
          />
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : goals && goals.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {goals.map((g, i) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
            >
              <Card>
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Target className="size-4 text-[hsl(var(--primary))]" />
                        <h3 className="font-semibold">{g.title}</h3>
                        {g.completed && <Badge variant="success">Done</Badge>}
                      </div>
                      {g.due_date && (
                        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                          Target: {formatDate(g.due_date)} ({relativeFromNow(g.due_date)})
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold tabular-nums">{formatCurrency(g.current_amount)}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">of {formatCurrency(g.target_amount)}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Progress value={g.progress} />
                    <p className="text-right text-xs text-[hsl(var(--muted-foreground))]">{Math.round(g.progress)}%</p>
                  </div>
                </CardContent>
                <CardFooter className="justify-between border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] p-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => update.mutate({ id: g.id, completed: !g.completed })}
                  >
                    <CheckCircle2 className="size-4" />
                    {g.completed ? "Reopen" : "Mark done"}
                  </Button>
                  <div className="flex gap-1">
                    <GoalDialog
                      initial={g}
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
                      title={`Delete "${g.title}"?`}
                      onConfirm={() => remove.mutateAsync(g.id)}
                    />
                  </div>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="grid place-items-center gap-3 p-16 text-center">
            <Target className="size-10 text-[hsl(var(--muted-foreground))]" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              No goals yet. Define what you&apos;re saving toward.
            </p>
            <GoalDialog
              trigger={
                <Button>
                  <Plus /> New goal
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
