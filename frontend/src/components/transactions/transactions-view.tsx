"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAccounts,
  useTransactionMutations,
  useTransactions,
  type TransactionFilters,
} from "@/hooks/use-resources";
import { formatCurrency, formatDate } from "@/lib/utils";

const PAGE_SIZE = 25;

export function TransactionsView({
  title,
  description,
  forceType,
}: {
  title: string;
  description: string;
  forceType?: "Income" | "Expense";
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "Income" | "Expense">(forceType ?? "all");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data: accounts } = useAccounts();

  const filters: TransactionFilters = useMemo(() => {
    const f: TransactionFilters = { page, ordering: "-date" };
    const effectiveType = forceType ?? (typeFilter === "all" ? undefined : typeFilter);
    if (effectiveType) f.type = effectiveType;
    if (accountFilter !== "all") f.account = Number(accountFilter);
    if (search.trim()) f.search = search.trim();
    return f;
  }, [page, typeFilter, accountFilter, search, forceType]);

  const { data, isLoading } = useTransactions(filters);
  const { remove } = useTransactionMutations();
  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          <TransactionDialog
            defaultType={forceType}
            trigger={
              <Button>
                <Plus /> New transaction
              </Button>
            }
          />
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search description or notes…"
              className="pl-9"
            />
          </div>
          {!forceType && (
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v as typeof typeFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="Income">Income</SelectItem>
                <SelectItem value="Expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Select
            value={accountFilter}
            onValueChange={(v) => {
              setAccountFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {(accounts ?? []).map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : data && data.results.length > 0 ? (
            <div className="divide-y divide-[hsl(var(--border))]">
              {data.results.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-4 transition-colors hover:bg-[hsl(var(--muted)/0.4)]">
                  <span
                    className={`grid size-9 place-items-center rounded-lg ${
                      t.type === "Income"
                        ? "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]"
                        : "bg-[hsl(var(--destructive)/0.15)] text-[hsl(var(--destructive))]"
                    }`}
                  >
                    {t.type === "Income" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{t.description}</p>
                      {t.is_recurring && <Badge variant="outline">Recurring</Badge>}
                      {t.category_name && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                          style={{
                            background: `${t.category_color ?? "#94a3b8"}22`,
                            color: t.category_color ?? "#94a3b8",
                          }}
                        >
                          <span className="size-1.5 rounded-full" style={{ background: t.category_color ?? "#94a3b8" }} />
                          {t.category_name}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">
                      {t.account_name} • {formatDate(t.date)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-right font-semibold tabular-nums ${
                      t.type === "Income" ? "text-[hsl(var(--success))]" : "text-[hsl(var(--destructive))]"
                    }`}
                  >
                    {t.type === "Income" ? "+" : "−"}
                    {formatCurrency(t.amount)}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <TransactionDialog
                      initial={t}
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
                      title="Delete transaction?"
                      onConfirm={() => remove.mutateAsync(t.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid place-items-center gap-3 p-16 text-center">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {search || typeFilter !== "all" || accountFilter !== "all"
                  ? "No transactions match these filters."
                  : "No transactions yet. Add your first one."}
              </p>
              <TransactionDialog
                defaultType={forceType}
                trigger={
                  <Button>
                    <Plus /> New transaction
                  </Button>
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      {data && data.count > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm text-[hsl(var(--muted-foreground))]">
          <span>
            Page {page} of {totalPages} • {data.count} total
          </span>
          <div className="flex gap-1">
            <Button size="icon" variant="outline" onClick={() => setPage(page - 1)} disabled={page <= 1}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
