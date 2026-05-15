"use client";

import { AuthGuard } from "@/components/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pinned = useSidebarStore((s) => s.pinned);

  return (
    <AuthGuard>
      <div className="min-h-dvh">
        <Sidebar />
        <div
          className={cn(
            "flex min-h-dvh flex-col transition-[padding] duration-200 ease-out",
            pinned ? "md:pl-72" : "md:pl-16",
          )}
        >
          <Topbar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
