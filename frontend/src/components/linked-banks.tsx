"use client";

import { Landmark, Loader2, RefreshCw, Unlink } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useBankSync, usePlaidItems } from "@/hooks/use-plaid";
import type { PlaidItem } from "@/lib/types";

const STATUS: Record<PlaidItem["status"], { label: string; variant: "success" | "warning" | "destructive" }> = {
  active: { label: "Connected", variant: "success" },
  login_required: { label: "Reconnect needed", variant: "warning" },
  error: { label: "Error", variant: "destructive" },
};

function syncedLabel(value: string | null): string {
  if (!value) return "Never synced";
  const secs = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (secs < 60) return "Synced just now";
  if (secs < 3600) return `Synced ${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `Synced ${Math.floor(secs / 3600)}h ago`;
  return `Synced ${Math.floor(secs / 86400)}d ago`;
}

export function LinkedBanks() {
  const { data: items, isLoading } = usePlaidItems();
  const { syncOne, syncAll, unlink } = useBankSync();

  if (isLoading || !items || items.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">Linked banks</p>
          {items.length > 1 && (
            <Button
              size="sm"
              variant="ghost"
              disabled={syncAll.isPending}
              onClick={() => syncAll.mutate()}
            >
              {syncAll.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              Sync all
            </Button>
          )}
        </div>
        <ul className="divide-y divide-[hsl(var(--border))]">
          {items.map((item) => {
            const status = STATUS[item.status];
            return (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <div className="grid size-9 place-items-center rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--primary))]">
                    <Landmark className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {item.institution_name || "Bank"}
                      {item.accounts_count != null && (
                        <span className="text-[hsl(var(--muted-foreground))]">
                          {" "}
                          · {item.accounts_count} account{item.accounts_count === 1 ? "" : "s"}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {syncedLabel(item.last_synced_at)}
                      {item.error_message ? ` — ${item.error_message}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={status.variant}>{status.label}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={syncOne.isPending}
                    onClick={() => syncOne.mutate(item.id)}
                  >
                    {syncOne.isPending && syncOne.variables === item.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <RefreshCw />
                    )}
                    Sync
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button size="icon" variant="ghost" aria-label="Disconnect bank">
                        <Unlink className="size-4 text-[hsl(var(--destructive))]" />
                      </Button>
                    }
                    title={`Disconnect ${item.institution_name || "this bank"}?`}
                    description="Synced accounts and their imported transactions will be removed. Manually added accounts are not affected."
                    confirmLabel="Disconnect"
                    onConfirm={() => unlink.mutateAsync(item.id)}
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
