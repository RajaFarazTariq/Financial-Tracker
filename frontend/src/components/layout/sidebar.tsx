"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  ChevronDown,
  CreditCard,
  Home,
  LayoutDashboard,
  Pin,
  PinOff,
  Settings,
  Sparkles,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { memo, useCallback, useState } from "react";

import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebar";

type LeafNode = { id: string; href: string; label: string; icon: LucideIcon };

type NavNode =
  | { kind: "featured"; id: string; href: string; label: string; subtitle: string; icon: LucideIcon }
  | { kind: "link"; id: string; href: string; label: string; icon: LucideIcon }
  | { kind: "group"; id: string; label: string; icon: LucideIcon; items: LeafNode[] };

const nav: NavNode[] = [
  {
    kind: "featured",
    id: "dashboard",
    href: "/dashboard",
    label: "Dashboard",
    subtitle: "Your central hub",
    icon: Home,
  },
  {
    kind: "group",
    id: "money",
    label: "Money flow",
    icon: Wallet,
    items: [
      { id: "accounts", href: "/accounts", label: "Accounts", icon: Wallet },
      { id: "transactions", href: "/transactions", label: "Transactions", icon: CreditCard },
      { id: "income", href: "/income", label: "Income", icon: ArrowDownLeft },
      { id: "expenses", href: "/expenses", label: "Expenses", icon: ArrowUpRight },
    ],
  },
  {
    kind: "group",
    id: "planning",
    label: "Planning",
    icon: LayoutDashboard,
    items: [
      { id: "budgets", href: "/budgets", label: "Budgets", icon: BarChart3 },
      { id: "goals", href: "/goals", label: "Goals", icon: Target },
      { id: "bills", href: "/bills", label: "Upcoming Bills", icon: CalendarClock },
    ],
  },
  { kind: "link", id: "insights", href: "/insights", label: "AI Insights", icon: Sparkles },
  { kind: "link", id: "settings", href: "/settings", label: "Settings", icon: Settings },
];

const COLLAPSED_W = "w-16";
const EXPANDED_W = "w-72";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function findGroupForPath(pathname: string): string | null {
  for (const node of nav) {
    if (node.kind === "group" && node.items.some((it) => isActive(pathname, it.href))) {
      return node.id;
    }
  }
  return null;
}

/* ============ Expanded mode renderers ============ */

const FeaturedCard = memo(function FeaturedCard({
  node,
  active,
  onClick,
  onPrefetch,
}: {
  node: Extract<NavNode, { kind: "featured" }>;
  active: boolean;
  onClick: () => void;
  onPrefetch: (href: string) => void;
}) {
  return (
    <Link
      href={node.href}
      onClick={onClick}
      onMouseEnter={() => onPrefetch(node.href)}
      onFocus={() => onPrefetch(node.href)}
      className={cn(
        "group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] px-3 py-3 text-white shadow-lg shadow-[hsl(var(--primary)/0.4)] transition-all hover:shadow-xl hover:shadow-[hsl(var(--primary)/0.45)]",
        active && "ring-2 ring-white/30 ring-offset-2 ring-offset-[hsl(var(--card))]",
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/20 text-white backdrop-blur">
        <node.icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{node.label}</span>
        <span className="block truncate text-xs text-white/80">{node.subtitle}</span>
      </span>
    </Link>
  );
});

const LinkCard = memo(function LinkCard({
  node,
  active,
  onClick,
  onPrefetch,
}: {
  node: Extract<NavNode, { kind: "link" }>;
  active: boolean;
  onClick: () => void;
  onPrefetch: (href: string) => void;
}) {
  return (
    <Link
      href={node.href}
      onClick={onClick}
      onMouseEnter={() => onPrefetch(node.href)}
      onFocus={() => onPrefetch(node.href)}
      className={cn(
        "group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
        active
          ? "border-transparent bg-gradient-to-r from-[hsl(var(--primary)/0.2)] to-[hsl(var(--accent)/0.18)] text-[hsl(var(--foreground))] shadow-[0_0_0_1px_hsl(var(--primary)/0.35)]"
          : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary)/0.4)] hover:text-[hsl(var(--foreground))]",
      )}
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-lg",
          active
            ? "bg-gradient-to-br from-[hsl(var(--primary)/0.25)] to-[hsl(var(--accent)/0.25)] text-[hsl(var(--primary))]"
            : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]",
        )}
      >
        <node.icon className="size-4" />
      </span>
      <span className="truncate">{node.label}</span>
    </Link>
  );
});

const GroupCard = memo(function GroupCard({
  node,
  pathname,
  open,
  onToggle,
  onLeafClick,
  onPrefetch,
}: {
  node: Extract<NavNode, { kind: "group" }>;
  pathname: string;
  open: boolean;
  onToggle: (id: string) => void;
  onLeafClick: () => void;
  onPrefetch: (href: string) => void;
}) {
  const handleToggle = useCallback(() => onToggle(node.id), [onToggle, node.id]);
  const hasActiveChild = node.items.some((item) => isActive(pathname, item.href));
  const highlighted = open || hasActiveChild;

  return (
    <div
      className={cn(
        // PARENT GROUP — uses PRIMARY (blue/indigo) theme
        "group/parent overflow-hidden rounded-2xl border transition-colors duration-200",
        highlighted
          ? "border-[hsl(var(--primary)/0.45)] bg-[hsl(var(--primary)/0.08)] shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]"
          : "border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary)/0.35)] hover:bg-[hsl(var(--primary)/0.04)]",
      )}
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-controls={`group-${node.id}`}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors"
      >
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg transition-colors duration-200",
            highlighted
              ? "bg-[hsl(var(--primary)/0.18)] text-[hsl(var(--primary))]"
              : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] group-hover/parent:bg-[hsl(var(--primary)/0.12)] group-hover/parent:text-[hsl(var(--primary))]",
          )}
        >
          <node.icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-[hsl(var(--foreground))]">
            {node.label}
          </span>
          <span className="block text-xs text-[hsl(var(--muted-foreground))]">
            {node.items.length} item{node.items.length === 1 ? "" : "s"}
          </span>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "shrink-0 transition-colors",
            highlighted ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))]",
          )}
        >
          <ChevronDown className="size-4" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`group-${node.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            {/* SUB-SECTION — uses ACCENT (purple) theme, visually distinct from parent */}
            <div className="border-t border-[hsl(var(--primary)/0.18)] bg-[hsl(var(--accent)/0.05)] px-2 py-2 dark:bg-[hsl(var(--background)/0.35)]">
              <ul className="space-y-1">
                {node.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={onLeafClick}
                        onMouseEnter={() => onPrefetch(item.href)}
                        onFocus={() => onPrefetch(item.href)}
                        className={cn(
                          "group/child ml-2 flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-sm transition-[background-color,border-color,color,box-shadow] duration-200",
                          active
                            ? "border-transparent bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(280_70%_60%)] font-medium text-white shadow-md shadow-[hsl(var(--accent)/0.4)]"
                            : "border-[hsl(var(--border)/0.5)] bg-[hsl(var(--card)/0.6)] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--accent)/0.5)] hover:bg-[hsl(var(--accent)/0.10)] hover:text-[hsl(var(--foreground))] dark:bg-[hsl(var(--background)/0.4)]",
                        )}
                      >
                        <span
                          className={cn(
                            "grid size-7 shrink-0 place-items-center rounded-md transition-colors",
                            active
                              ? "bg-white/25 text-white"
                              : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] group-hover/child:bg-[hsl(var(--accent)/0.18)] group-hover/child:text-[hsl(var(--accent))]",
                          )}
                        >
                          <item.icon className="size-3.5" />
                        </span>
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

/* ============ Collapsed mode renderer ============ */

const CollapsedIcon = memo(function CollapsedIcon({
  href,
  icon: Icon,
  label,
  active,
  onClick,
  onMouseEnter,
}: {
  href?: string;
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
}) {
  const className = cn(
    "group relative mx-auto grid size-10 place-items-center rounded-xl border transition-all",
    active
      ? "border-transparent bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white shadow-md shadow-[hsl(var(--primary)/0.4)]"
      : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary)/0.4)] hover:text-[hsl(var(--foreground))]",
  );
  const content = (
    <>
      <Icon className="size-4" />
      <span className="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 py-1 text-xs text-[hsl(var(--foreground))] shadow-md group-hover:block">
        {label}
      </span>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        className={className}
        aria-label={label}
      >
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={className}
      aria-label={label}
    >
      {content}
    </button>
  );
});

/* ============ Sidebar ============ */

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const pinned = useSidebarStore((s) => s.pinned);
  const togglePinned = useSidebarStore((s) => s.togglePinned);
  const setPinned = useSidebarStore((s) => s.setPinned);

  const [hovered, setHovered] = useState(false);
  const expanded = pinned || hovered;

  const [openGroupId, setOpenGroupId] = useState<string | null>(() => findGroupForPath(pathname));

  // Stable callbacks so memoized children don't re-render on every parent render.
  const handleMouseEnter = useCallback(() => setHovered(true), []);
  const handleMouseLeave = useCallback(() => {
    setHovered(false);
    setOpenGroupId((prev) => (pinned ? prev : null));
  }, [pinned]);
  const closeAll = useCallback(() => setOpenGroupId(null), []);
  const toggleGroup = useCallback((id: string) => {
    setOpenGroupId((prev) => (prev === id ? null : id));
  }, []);
  const pinSidebar = useCallback(() => setPinned(true), [setPinned]);

  // Warm route chunks on hover/focus so click feels instant. Next.js caches
  // each href after the first prefetch, so this is effectively free thereafter.
  const handlePrefetch = useCallback(
    (href: string) => {
      router.prefetch(href);
    },
    [router],
  );

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "fixed left-0 top-0 z-40 hidden h-dvh border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_0_24px_hsl(var(--foreground)/0.04)] transition-[width] duration-200 ease-out md:block",
        expanded ? EXPANDED_W : COLLAPSED_W,
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-[hsl(var(--border))]",
          expanded ? "gap-2 px-4" : "justify-center px-2",
        )}
      >
        <button
          type="button"
          onClick={togglePinned}
          className={cn(
            "flex items-center gap-2 rounded-lg transition-all hover:bg-[hsl(var(--muted))]",
            expanded ? "min-w-0 flex-1 px-2 py-1.5" : "p-1.5",
          )}
          aria-label={pinned ? "Unpin sidebar" : "Pin sidebar open"}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-sm font-bold text-white">
            ₣
          </span>
          {expanded && (
            <>
              <span className="gradient-text min-w-0 flex-1 truncate text-base font-semibold">
                Financial Tracker
              </span>
              <span
                className={cn(
                  "shrink-0 text-[hsl(var(--muted-foreground))]",
                  pinned ? "text-[hsl(var(--primary))]" : "",
                )}
                title={pinned ? "Pinned — click to unpin" : "Click to pin open"}
              >
                {pinned ? <Pin className="size-3.5" /> : <PinOff className="size-3.5" />}
              </span>
            </>
          )}
        </button>
      </div>

      {expanded ? (
        <nav className="scrollbar-thin flex h-[calc(100dvh-4rem)] flex-col gap-2.5 overflow-y-auto p-3">
          {nav.map((node) => {
            if (node.kind === "featured") {
              return (
                <FeaturedCard
                  key={node.id}
                  node={node}
                  active={isActive(pathname, node.href)}
                  onClick={closeAll}
                  onPrefetch={handlePrefetch}
                />
              );
            }
            if (node.kind === "link") {
              return (
                <LinkCard
                  key={node.id}
                  node={node}
                  active={isActive(pathname, node.href)}
                  onClick={closeAll}
                  onPrefetch={handlePrefetch}
                />
              );
            }
            return (
              <GroupCard
                key={node.id}
                node={node}
                pathname={pathname}
                open={openGroupId === node.id}
                onToggle={toggleGroup}
                onLeafClick={closeAll}
                onPrefetch={handlePrefetch}
              />
            );
          })}
        </nav>
      ) : (
        <nav className="scrollbar-thin flex h-[calc(100dvh-4rem)] flex-col gap-2 overflow-y-auto px-2 py-3">
          {nav.map((node) => {
            if (node.kind === "group") {
              return (
                <CollapsedIcon
                  key={node.id}
                  icon={node.icon}
                  label={node.label}
                  active={node.items.some((i) => isActive(pathname, i.href))}
                  onClick={pinSidebar}
                />
              );
            }
            return (
              <CollapsedIcon
                key={node.id}
                href={node.href}
                icon={node.icon}
                label={node.label}
                active={isActive(pathname, node.href)}
                onMouseEnter={() => handlePrefetch(node.href)}
              />
            );
          })}
        </nav>
      )}
    </aside>
  );
}
