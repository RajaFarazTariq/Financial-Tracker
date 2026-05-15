"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, extractApiError } from "@/lib/api";
import type { Account, Bill, Budget, Category, Goal, Transaction } from "@/lib/types";

type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };

function onError(err: unknown) {
  toast.error(extractApiError(err).message);
}

/* ---------- Accounts ---------- */

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: async () => (await api.get<Page<Account>>("/accounts/")).data.results,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useAccountMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["accounts"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  return {
    create: useMutation({
      mutationFn: async (payload: Partial<Account>) => (await api.post<Account>("/accounts/", payload)).data,
      onSuccess: () => {
        invalidate();
        toast.success("Account created");
      },
      onError,
    }),
    update: useMutation({
      mutationFn: async ({ id, ...payload }: Partial<Account> & { id: number }) =>
        (await api.patch<Account>(`/accounts/${id}/`, payload)).data,
      onSuccess: () => {
        invalidate();
        toast.success("Account updated");
      },
      onError,
    }),
    remove: useMutation({
      mutationFn: async (id: number) => api.delete(`/accounts/${id}/`),
      onSuccess: () => {
        invalidate();
        toast.success("Account deleted");
      },
      onError,
    }),
  };
}

/* ---------- Categories ---------- */

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get<Page<Category>>("/categories/")).data.results,
  });
}

export function useCategoryMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["categories"] });
  return {
    create: useMutation({
      mutationFn: async (payload: Partial<Category>) => (await api.post<Category>("/categories/", payload)).data,
      onSuccess: () => {
        invalidate();
        toast.success("Category added");
      },
      onError,
    }),
    remove: useMutation({
      mutationFn: async (id: number) => api.delete(`/categories/${id}/`),
      onSuccess: () => {
        invalidate();
        toast.success("Category removed");
      },
      onError,
    }),
  };
}

/* ---------- Transactions ---------- */

export type TransactionFilters = {
  type?: "Income" | "Expense";
  account?: number;
  category?: number;
  search?: string;
  ordering?: string;
  page?: number;
};

export function useTransactions(filters: TransactionFilters = {}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== "" && v !== null) params.append(k, String(v));
  }
  return useQuery({
    queryKey: ["transactions", filters],
    queryFn: async () =>
      (await api.get<Page<Transaction>>(`/transactions/?${params.toString()}`)).data,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useTransactionMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["accounts"] });
  };
  return {
    create: useMutation({
      mutationFn: async (payload: Partial<Transaction>) =>
        (await api.post<Transaction>("/transactions/", payload)).data,
      onSuccess: () => {
        invalidate();
        toast.success("Transaction added");
      },
      onError,
    }),
    update: useMutation({
      mutationFn: async ({ id, ...payload }: Partial<Transaction> & { id: number }) =>
        (await api.patch<Transaction>(`/transactions/${id}/`, payload)).data,
      onSuccess: () => {
        invalidate();
        toast.success("Transaction updated");
      },
      onError,
    }),
    remove: useMutation({
      mutationFn: async (id: number) => api.delete(`/transactions/${id}/`),
      onSuccess: () => {
        invalidate();
        toast.success("Transaction deleted");
      },
      onError,
    }),
  };
}

/* ---------- Goals ---------- */

export function useGoals() {
  return useQuery({
    queryKey: ["goals"],
    queryFn: async () => (await api.get<Page<Goal>>("/goals/")).data.results,
  });
}

export function useGoalMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["goals"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
  return {
    create: useMutation({
      mutationFn: async (payload: Partial<Goal>) => (await api.post<Goal>("/goals/", payload)).data,
      onSuccess: () => {
        invalidate();
        toast.success("Goal created");
      },
      onError,
    }),
    update: useMutation({
      mutationFn: async ({ id, ...payload }: Partial<Goal> & { id: number }) =>
        (await api.patch<Goal>(`/goals/${id}/`, payload)).data,
      onSuccess: () => {
        invalidate();
        toast.success("Goal updated");
      },
      onError,
    }),
    remove: useMutation({
      mutationFn: async (id: number) => api.delete(`/goals/${id}/`),
      onSuccess: () => {
        invalidate();
        toast.success("Goal deleted");
      },
      onError,
    }),
  };
}

/* ---------- Budgets ---------- */

export function useBudgets() {
  return useQuery({
    queryKey: ["budgets"],
    queryFn: async () => (await api.get<Page<Budget>>("/budgets/")).data.results,
  });
}

export function useBudgetMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["budgets"] });
  return {
    create: useMutation({
      mutationFn: async (payload: Partial<Budget>) => (await api.post<Budget>("/budgets/", payload)).data,
      onSuccess: () => {
        invalidate();
        toast.success("Budget created");
      },
      onError,
    }),
    update: useMutation({
      mutationFn: async ({ id, ...payload }: Partial<Budget> & { id: number }) =>
        (await api.patch<Budget>(`/budgets/${id}/`, payload)).data,
      onSuccess: () => {
        invalidate();
        toast.success("Budget updated");
      },
      onError,
    }),
    remove: useMutation({
      mutationFn: async (id: number) => api.delete(`/budgets/${id}/`),
      onSuccess: () => {
        invalidate();
        toast.success("Budget deleted");
      },
      onError,
    }),
  };
}

/* ---------- Bills ---------- */

export function useBills() {
  return useQuery({
    queryKey: ["bills"],
    queryFn: async () => (await api.get<Page<Bill>>("/bills/")).data.results,
  });
}

export function useBillMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["bills"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
  return {
    create: useMutation({
      mutationFn: async (payload: Partial<Bill>) => (await api.post<Bill>("/bills/", payload)).data,
      onSuccess: () => {
        invalidate();
        toast.success("Bill added");
      },
      onError,
    }),
    update: useMutation({
      mutationFn: async ({ id, ...payload }: Partial<Bill> & { id: number }) =>
        (await api.patch<Bill>(`/bills/${id}/`, payload)).data,
      onSuccess: () => {
        invalidate();
        toast.success("Bill updated");
      },
      onError,
    }),
    remove: useMutation({
      mutationFn: async (id: number) => api.delete(`/bills/${id}/`),
      onSuccess: () => {
        invalidate();
        toast.success("Bill deleted");
      },
      onError,
    }),
  };
}
