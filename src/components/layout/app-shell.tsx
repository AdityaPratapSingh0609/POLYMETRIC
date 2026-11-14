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
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {item.label}
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

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    qc.clear();
    router.push("/login");
  }

  if (!user) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary font-display text-sm font-bold text-primary-foreground">
            MI
          </div>
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold">Material Intelligence</p>
            <p className="text-[11px] text-muted-foreground">Plant Ledger</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <NavLinks role={user.role} />
        </div>
        <div className="border-t border-border p-4">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.role}</p>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-card shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <span className="font-display text-sm font-semibold">Material Intelligence</span>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="size-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              <NavLinks role={user.role} onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="size-5" />
          </Button>
          <div className="hidden font-display text-sm text-muted-foreground lg:block">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
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
