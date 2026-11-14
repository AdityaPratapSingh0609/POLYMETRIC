"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  ListChecks,
  LineChart,
  FileBarChart,
  Crown,
  Settings,
  ScrollText,
  Menu,
  X,
  LogOut,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQueryClient } from "@tanstack/react-query";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "SUPERVISOR", "OPERATOR"] },
  { href: "/entry", label: "Daily Entry", icon: ClipboardList, roles: ["ADMIN", "SUPERVISOR", "OPERATOR"] },
  { href: "/materials", label: "Materials", icon: Package, roles: ["ADMIN", "SUPERVISOR", "OPERATOR"] },
  { href: "/transactions", label: "Ledger", icon: ListChecks, roles: ["ADMIN", "SUPERVISOR", "OPERATOR"] },
  { href: "/analytics", label: "Intelligence", icon: LineChart, roles: ["ADMIN", "SUPERVISOR", "OPERATOR"] },
  { href: "/reports", label: "Reports", icon: FileBarChart, roles: ["ADMIN", "SUPERVISOR", "OPERATOR"] },
  { href: "/executive", label: "Executive", icon: Crown, roles: ["ADMIN", "SUPERVISOR"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["ADMIN", "SUPERVISOR"] },
  { href: "/audit-log", label: "Audit Log", icon: ScrollText, roles: ["ADMIN"] },
] as const;

function NavLinks({ role, onNavigate }: { role: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV.filter((item) => (item.roles as readonly string[]).includes(role)).map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
              active
                ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            )}
          >
            <Icon className={cn("size-4 transition-transform duration-150 group-hover:scale-110", active ? "text-primary-foreground" : "text-muted-foreground")} />
            <span>{item.label}</span>
            {active && (
              <span className="absolute right-2 h-1.5 w-1.5 rounded-full bg-primary-foreground/80" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: user } = useCurrentUser();
  const router = useRouter();
  const qc = useQueryClient();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [timeStr, setTimeStr] = React.useState<string>("");

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    qc.clear();
    router.push("/login");
  }

  if (!user) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  const todayFormatted = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-display text-base font-bold text-primary-foreground shadow-sm">
            MI
          </div>
          <div className="leading-tight">
            <p className="font-display text-sm font-bold tracking-tight">Material Intelligence</p>
            <p className="text-[11px] text-muted-foreground font-mono">v1.0 • Plant Ledger</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <NavLinks role={user.role} />
        </div>
        <div className="border-t border-border p-4 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground font-mono">{user.role}</p>
            </div>
            <span className="inline-flex items-center rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">
              {user.role}
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-card shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary font-display text-sm font-bold text-primary-foreground">
                  MI
                </div>
                <span className="font-display text-sm font-semibold">Material Intelligence</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="size-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              <NavLinks role={user.role} onNavigate={() => setMobileOpen(false)} />
            </div>
            <div className="border-t border-border p-4">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.role}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="size-5" />
            </Button>
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span className="hidden sm:inline">Live Ledger</span>
            </div>
          </div>

          <div className="hidden font-mono text-xs text-muted-foreground md:flex md:items-center md:gap-2">
            <span>{todayFormatted}</span>
            {timeStr && (
              <>
                <span>•</span>
                <span className="font-semibold text-foreground">{timeStr}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Button asChild size="sm" className="hidden sm:inline-flex gap-1.5 h-8 px-3 font-medium shadow-xs">
              <Link href="/entry" prefetch={true}>
                <Plus className="size-3.5" />
                <span>Fast Entry</span>
              </Link>
            </Button>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-muted-foreground hover:text-foreground">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
