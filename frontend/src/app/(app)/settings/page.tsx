"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, Monitor, Moon, Save, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { useCurrentUser } from "@/hooks/use-auth";
import { api, extractApiError } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

const profileSchema = z.object({
  first_name: z.string().max(150).optional(),
  last_name: z.string().max(150).optional(),
  email: z.string().email("Invalid email"),
});

const passwordSchema = z
  .object({
    old_password: z.string().min(1, "Required"),
    new_password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Needs an uppercase letter")
      .regex(/[0-9]/, "Needs a digit")
      .regex(/[!@#$%^&*(),.?":{}|<>]/, "Needs a special character"),
    confirm: z.string(),
  })
  .refine((v) => v.new_password === v.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

function ProfileCard() {
  const storeUser = useAuthStore((s) => s.user);
  const { data: fetchedUser } = useCurrentUser();
  const user = fetchedUser ?? storeUser;
  const setUser = useAuthStore((s) => s.setUser);

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
      email: user?.email ?? "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        first_name: user.first_name ?? "",
        last_name: user.last_name ?? "",
        email: user.email,
      });
    }
  }, [user, form]);

  const mutation = useMutation({
    mutationFn: async (values: ProfileValues) => (await api.patch("/auth/me/", values)).data,
    onSuccess: (data) => {
      setUser(data);
      toast.success("Profile updated");
    },
    onError: (err) => toast.error(extractApiError(err).message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="size-4 text-[hsl(var(--primary))]" /> Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">First name</Label>
              <Input id="first_name" {...form.register("first_name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input id="last_name" {...form.register("last_name")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-xs text-[hsl(var(--destructive))]">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={user?.username ?? ""} disabled />
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Username cannot be changed.</p>
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            <Save />
            {mutation.isPending ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordCard() {
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { old_password: "", new_password: "", confirm: "" },
  });

  const mutation = useMutation({
    mutationFn: async (v: PasswordValues) =>
      (await api.post("/auth/password/", { old_password: v.old_password, new_password: v.new_password })).data,
    onSuccess: () => {
      toast.success("Password updated");
      form.reset();
    },
    onError: (err) => toast.error(extractApiError(err).message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4 text-[hsl(var(--primary))]" /> Change password
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
          <div className="space-y-2">
            <Label htmlFor="old_password">Current password</Label>
            <PasswordInput id="old_password" autoComplete="current-password" {...form.register("old_password")} />
            {form.formState.errors.old_password && (
              <p className="text-xs text-[hsl(var(--destructive))]">{form.formState.errors.old_password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new_password">New password</Label>
            <PasswordInput id="new_password" autoComplete="new-password" {...form.register("new_password")} />
            {form.formState.errors.new_password && (
              <p className="text-xs text-[hsl(var(--destructive))]">{form.formState.errors.new_password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm new password</Label>
            <PasswordInput id="confirm" autoComplete="new-password" {...form.register("confirm")} />
            {form.formState.errors.confirm && (
              <p className="text-xs text-[hsl(var(--destructive))]">{form.formState.errors.confirm.message}</p>
            )}
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Updating…" : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ThemeCard() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const active = mounted ? theme ?? resolvedTheme : "system";

  const options: { value: string; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setTheme(o.value)}
              className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors ${
                active === o.value
                  ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)]"
                  : "border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
              }`}
            >
              <o.icon className="size-5" />
              <span className="text-sm font-medium">{o.label}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Profile, password, and appearance." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProfileCard />
        <PasswordCard />
        <div className="lg:col-span-2">
          <ThemeCard />
        </div>
      </div>
    </div>
  );
}
