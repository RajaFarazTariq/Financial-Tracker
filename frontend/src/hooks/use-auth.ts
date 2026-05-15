"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { api, extractApiError } from "@/lib/api";
import { useAuthStore, type AuthUser } from "@/stores/auth";

type LoginPayload = { username: string; password: string };
type RegisterPayload = {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
};

export function useLogin() {
  const router = useRouter();
  const { setTokens, setUser } = useAuthStore();
  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await api.post<{ access: string; refresh: string }>("/auth/login/", payload);
      setTokens({ access: data.access, refresh: data.refresh });
      const { data: me } = await api.get<AuthUser>("/auth/me/");
      setUser(me);
      return me;
    },
    onSuccess: (user) => {
      toast.success(`Welcome back, ${user.first_name || user.username}`);
      router.push("/dashboard");
    },
    onError: (err) => toast.error(extractApiError(err).message || "Sign in failed"),
  });
}

export function useRegister() {
  const router = useRouter();
  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const { data } = await api.post<AuthUser>("/auth/register/", payload);
      return data;
    },
    onSuccess: () => {
      toast.success("Account created — please sign in.");
      router.push("/sign-in");
    },
    onError: (err) => toast.error(extractApiError(err).message || "Registration failed"),
  });
}

export function useLogout() {
  const router = useRouter();
  const { clear } = useAuthStore();
  return () => {
    clear();
    router.push("/sign-in");
  };
}

export function useCurrentUser() {
  const token = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["me"],
    enabled: !!token,
    queryFn: async () => {
      const { data } = await api.get<AuthUser>("/auth/me/");
      useAuthStore.getState().setUser(data);
      return data;
    },
  });
}
