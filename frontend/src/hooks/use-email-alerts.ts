"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, extractApiError } from "@/lib/api";
import type { EmailInbox } from "@/lib/types";

type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };

function onError(err: unknown) {
  toast.error(extractApiError(err).message);
}

export type EmailInboxInput = {
  email_address: string;
  app_password?: string;
  imap_host?: string;
  imap_port?: number;
  folder?: string;
  sender_filter?: string;
  account?: number | null;
};

export function useEmailInboxes() {
  return useQuery({
    queryKey: ["email-inboxes"],
    queryFn: async () => (await api.get<Page<EmailInbox>>("/email/inboxes/")).data.results,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useEmailInboxMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["email-inboxes"] });
    qc.invalidateQueries({ queryKey: ["accounts"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  return {
    create: useMutation({
      mutationFn: async (payload: EmailInboxInput) =>
        (await api.post<EmailInbox>("/email/inboxes/", payload)).data,
      onSuccess: () => {
        invalidate();
        toast.success("Email alerts connected");
      },
      onError,
    }),
    update: useMutation({
      mutationFn: async ({ id, ...payload }: EmailInboxInput & { id: number }) =>
        (await api.patch<EmailInbox>(`/email/inboxes/${id}/`, payload)).data,
      onSuccess: () => {
        invalidate();
        toast.success("Settings saved");
      },
      onError,
    }),
    remove: useMutation({
      mutationFn: async (id: number) => api.delete(`/email/inboxes/${id}/`),
      onSuccess: () => {
        invalidate();
        toast.success("Email alerts disconnected");
      },
      onError,
    }),
    test: useMutation({
      mutationFn: async (id: number) => (await api.post(`/email/inboxes/${id}/test/`)).data,
      onSuccess: () => toast.success("Connection OK"),
      onError,
    }),
    scan: useMutation({
      mutationFn: async (id: number) =>
        (await api.post<{ ok: boolean; created?: number }>(`/email/inboxes/${id}/scan/`)).data,
      onSuccess: (res) => {
        invalidate();
        toast.success(
          res?.created ? `Imported ${res.created} new transaction(s)` : "Scan complete",
        );
      },
      onError,
    }),
  };
}
