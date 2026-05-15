"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, extractApiError } from "@/lib/api";
import type { PlaidItem } from "@/lib/types";

type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };

function onError(err: unknown) {
  toast.error(extractApiError(err).message);
}

/** Linked institutions. Polls so webhook-driven syncs surface without a manual refresh. */
export function usePlaidItems() {
  return useQuery({
    queryKey: ["plaid-items"],
    queryFn: async () => (await api.get<Page<PlaidItem>>("/plaid/items/")).data.results,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

function useSyncedInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["plaid-items"] });
    qc.invalidateQueries({ queryKey: ["accounts"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
}

/** Step 1 of Plaid Link: fetch a short-lived link_token from the server. */
export function useLinkToken() {
  return useMutation({
    mutationFn: async () =>
      (await api.post<{ link_token: string }>("/plaid/link-token/")).data.link_token,
    onError,
  });
}

/** Step 2: exchange the public_token Plaid Link returns; imports accounts + first sync. */
export function useExchangeToken() {
  const invalidate = useSyncedInvalidate();
  return useMutation({
    mutationFn: async (publicToken: string) =>
      (await api.post<PlaidItem>("/plaid/exchange/", { public_token: publicToken })).data,
    onSuccess: (item) => {
      invalidate();
      toast.success(`${item.institution_name || "Bank"} connected`);
    },
    onError,
  });
}

export function useBankSync() {
  const invalidate = useSyncedInvalidate();
  return {
    syncOne: useMutation({
      mutationFn: async (id: number) => (await api.post(`/plaid/items/${id}/sync/`)).data,
      onSuccess: () => {
        invalidate();
        toast.success("Sync complete");
      },
      onError,
    }),
    syncAll: useMutation({
      mutationFn: async () => (await api.post("/plaid/items/sync_all/")).data,
      onSuccess: () => {
        invalidate();
        toast.success("All banks synced");
      },
      onError,
    }),
    unlink: useMutation({
      mutationFn: async (id: number) => api.delete(`/plaid/items/${id}/`),
      onSuccess: () => {
        invalidate();
        toast.success("Bank disconnected");
      },
      onError,
    }),
  };
}
