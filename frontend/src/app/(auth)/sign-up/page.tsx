"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { useRegister } from "@/hooks/use-auth";

const schema = z
  .object({
    username: z.string().min(3, "At least 3 characters"),
    email: z.string().email("Invalid email"),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Needs an uppercase letter")
      .regex(/[0-9]/, "Needs a digit")
      .regex(/[!@#$%^&*(),.?":{}|<>]/, "Needs a special character"),
    password_confirm: z.string(),
  })
  .refine((v) => v.password === v.password_confirm, {
    path: ["password_confirm"],
    message: "Passwords do not match",
  });

type FormValues = z.infer<typeof schema>;

export default function SignUpPage() {
  const register = useRegister();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", email: "", password: "", password_confirm: "" },
  });

  return (
    <Card className="glass border-0">
      <CardHeader>
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>Start tracking your finances in seconds.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit((v) => register.mutate(v))}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="first_name">First name</Label>
              <Input id="first_name" autoComplete="given-name" {...form.register("first_name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input id="last_name" autoComplete="family-name" {...form.register("last_name")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" autoComplete="username" {...form.register("username")} />
            {form.formState.errors.username && (
              <p className="text-xs text-[hsl(var(--destructive))]">{form.formState.errors.username.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-xs text-[hsl(var(--destructive))]">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput id="password" autoComplete="new-password" {...form.register("password")} />
            {form.formState.errors.password && (
              <p className="text-xs text-[hsl(var(--destructive))]">{form.formState.errors.password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password_confirm">Confirm password</Label>
            <PasswordInput
              id="password_confirm"
              autoComplete="new-password"
              {...form.register("password_confirm")}
            />
            {form.formState.errors.password_confirm && (
              <p className="text-xs text-[hsl(var(--destructive))]">{form.formState.errors.password_confirm.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={register.isPending}>
            {register.isPending && <Loader2 className="animate-spin" />} Create account
          </Button>
          <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
            Already registered?{" "}
            <Link href="/sign-in" className="font-medium text-[hsl(var(--primary))] hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
