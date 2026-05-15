"use client";

import { LogOut, Search } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLogout } from "@/hooks/use-auth";
import { useAuthStore } from "@/stores/auth";

export function Topbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const initials = (user?.first_name?.[0] || user?.username?.[0] || "U").toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/0.8)] px-6 backdrop-blur">
      <div className="relative max-w-md flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
        <Input placeholder="Search transactions, accounts, goals…" className="pl-9" />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <div className="hidden items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-1 pl-1 pr-3 sm:flex">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-xs font-semibold text-white">
            {initials}
          </span>
          <span className="text-sm font-medium">{user?.first_name || user?.username || "—"}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={logout} aria-label="Sign out">
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}
