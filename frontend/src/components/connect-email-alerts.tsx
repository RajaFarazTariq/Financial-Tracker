"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail, RefreshCw, ShieldCheck, Unlink } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ConfirmDialog } from "@/components/confirm-dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmailInboxMutations, useEmailInboxes } from "@/hooks/use-email-alerts";
import { useAccounts } from "@/hooks/use-resources";
import type { EmailInbox } from "@/lib/types";

const STATUS: Record<EmailInbox["status"], { label: string; variant: "success" | "warning" | "destructive" }> = {
  active: { label: "Active", variant: "success" },
  auth_error: { label: "Login failed", variant: "destructive" },
  error: { label: "Error", variant: "warning" },
};

const schema = z.object({
  email_address: z.string().email("Enter a valid email"),
  app_password: z.string().min(8, "Paste the app password"),
  sender_filter: z.string().min(2, "Required"),
  account: z.string(),
});
type FormValues = z.infer<typeof schema>;

function scannedLabel(value: string | null): string {
  if (!value) return "Not scanned yet";
  const secs = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (secs < 60) return "Scanned just now";
  if (secs < 3600) return `Scanned ${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `Scanned ${Math.floor(secs / 3600)}h ago`;
  return `Scanned ${Math.floor(secs / 86400)}d ago`;
}

function ConnectDialog() {
  const [open, setOpen] = useState(false);
  const { create } = useEmailInboxMutations();
  const { data: accounts } = useAccounts();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email_address: "",
      app_password: "",
      sender_filter: "admin.ebanking@ubl.com.pk",
      account: "",
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Mail /> Connect email alerts
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect bank email alerts</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((v) =>
            create
              .mutateAsync({
                email_address: v.email_address,
                app_password: v.app_password,
                sender_filter: v.sender_filter,
                account: v.account ? Number(v.account) : null,
              })
              .then(() => setOpen(false))
              .catch(() => {}),
          )}
        >
          <div className="space-y-2">
            <Label htmlFor="email_address">Mailbox that receives the alerts</Label>
            <Input id="email_address" type="email" placeholder="you@gmail.com" {...form.register("email_address")} />
            {form.formState.errors.email_address && (
              <p className="text-xs text-[hsl(var(--destructive))]">{form.formState.errors.email_address.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="app_password">Gmail App Password</Label>
            <Input id="app_password" type="password" placeholder="16-character app password" {...form.register("app_password")} />
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Google account → Security → 2-Step Verification → App passwords. Stored encrypted.
            </p>
            {form.formState.errors.app_password && (
              <p className="text-xs text-[hsl(var(--destructive))]">{form.formState.errors.app_password.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sender_filter">Alert sender contains</Label>
              <Input id="sender_filter" {...form.register("sender_filter")} />
            </div>
            <div className="space-y-2">
              <Label>Attach to account</Label>
              <Select value={form.watch("account")} onValueChange={(v) => form.setValue("account", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto-create" />
                </SelectTrigger>
                <SelectContent>
                  {(accounts ?? []).map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="animate-spin" />} Connect
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EmailAlerts() {
  const { data: inboxes, isLoading } = useEmailInboxes();
  const { scan, test, remove } = useEmailInboxMutations();

  if (isLoading) return null;
  if (!inboxes || inboxes.length === 0) return <ConnectDialog />;

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <p className="mb-3 text-sm font-medium">Bank email alerts</p>
        <ul className="divide-y divide-[hsl(var(--border))]">
          {inboxes.map((inbox) => {
            const status = STATUS[inbox.status];
            return (
              <li key={inbox.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <div className="grid size-9 place-items-center rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--primary))]">
                    <Mail className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {inbox.email_address}
                      {inbox.account_name && (
                        <span className="text-[hsl(var(--muted-foreground))]"> · {inbox.account_name}</span>
                      )}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {scannedLabel(inbox.last_scanned_at)}
                      {inbox.error_message ? ` — ${inbox.error_message}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={status.variant}>{status.label}</Badge>
                  <Button size="sm" variant="ghost" disabled={test.isPending} onClick={() => test.mutate(inbox.id)}>
                    <ShieldCheck /> Test
                  </Button>
                  <Button size="sm" variant="ghost" disabled={scan.isPending} onClick={() => scan.mutate(inbox.id)}>
                    {scan.isPending && scan.variables === inbox.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <RefreshCw />
                    )}
                    Scan
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button size="icon" variant="ghost" aria-label="Disconnect email alerts">
                        <Unlink className="size-4 text-[hsl(var(--destructive))]" />
                      </Button>
                    }
                    title="Disconnect email alerts?"
                    description="New emails will no longer be imported. Already-imported transactions are kept."
                    confirmLabel="Disconnect"
                    onConfirm={() => remove.mutateAsync(inbox.id)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
