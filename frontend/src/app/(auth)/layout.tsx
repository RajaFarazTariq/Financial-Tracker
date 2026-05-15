import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-[hsl(var(--background))] p-6">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[hsl(var(--primary)/0.2)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-[hsl(var(--accent)/0.18)] blur-3xl" />
      </div>
      <div className="absolute right-6 top-6 flex items-center gap-2">
        <ThemeToggle />
      </div>
      <Link href="/" className="absolute left-6 top-6 flex items-center gap-2 text-base font-semibold">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white">
          ₣
        </span>
        <span className="gradient-text hidden sm:inline">Financial Tracker</span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
