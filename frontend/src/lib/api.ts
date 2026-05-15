import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

import { useAuthStore } from "@/stores/auth";

const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${baseURL}/api`,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = useAuthStore.getState().refreshToken;
  if (!refresh) return null;
  try {
    const { data } = await axios.post(`${baseURL}/api/auth/refresh/`, { refresh });
    useAuthStore.getState().setTokens({ access: data.access, refresh: data.refresh ?? refresh });
    return data.access as string;
  } catch {
    useAuthStore.getState().clear();
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry && !original.url?.includes("/auth/")) {
      original._retry = true;
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const newAccess = await refreshPromise;
      if (newAccess) {
        original.headers!.Authorization = `Bearer ${newAccess}`;
        return api.request(original);
      }
    }
    return Promise.reject(error);
  },
);

export type ApiError = {
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export function extractApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as Record<string, unknown> | undefined;
    if (data && typeof data === "object") {
      if ("detail" in data && typeof data.detail === "string") {
        return { message: data.detail };
      }
      const fieldErrors: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(data)) {
        if (Array.isArray(v)) fieldErrors[k] = v.map(String);
        else if (typeof v === "string") fieldErrors[k] = [v];
      }
      if (Object.keys(fieldErrors).length) {
        const first = Object.values(fieldErrors)[0]?.[0] ?? "Request failed";
        return { message: first, fieldErrors };
      }
    }
    return { message: err.message };
  }
  return { message: err instanceof Error ? err.message : "Unknown error" };
}
