"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Package, TrendingDown, AlertTriangle, Boxes } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { AlertLevelBadge } from "@/components/shared/alert-level-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/hooks/use-intelligence";
import { transactionTypeLabel } from "@/lib/constants";
import { formatDate, formatQuantity } from "@/lib/utils";

function MovementBadge({ type }: { type: string }) {
  if (type === "PURCHASE" || type === "RETURN" || type === "OPENING") {
    return <Badge variant="success" className="font-mono text-[11px]">{transactionTypeLabel(type)}</Badge>;
  }
  if (type === "WASTAGE") {
    return <Badge variant="destructive" className="font-mono text-[11px]">{transactionTypeLabel(type)}</Badge>;
  }
  if (type === "ADJUSTMENT") {
    return (
      <Badge variant="secondary" className="font-mono text-[11px] border border-amber-500/30 text-amber-600 dark:text-amber-400">
        {transactionTypeLabel(type)}
      </Badge>
    );
  }
  return <Badge variant="outline" className="font-mono text-[11px]">{transactionTypeLabel(type)}</Badge>;
}

export function DashboardClient() {
  const { data, isPending } = useDashboard();

  if (isPending || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Dashboard" description="Live view of stock, consumption, and what needs attention today." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active materials" value={data.totalActiveMaterials} sub={`${data.totalMaterials} total incl. inactive/archived`} icon={<Package className="size-5" />} />
        <StatCard label="Today's consumption" value={data.today.consumption.toLocaleString("en-IN")} icon={<Boxes className="size-5" />} />
        <StatCard label="This week" value={data.week.consumption.toLocaleString("en-IN")} icon={<Boxes className="size-5" />} />
        <StatCard label="This month" value={data.month.consumption.toLocaleString("en-IN")} icon={<Boxes className="size-5" />} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Top consumed materials this month</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topConsumed.length === 0 ? (
              <EmptyState title="No consumption recorded yet this month" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.topConsumed} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number, _name, item) => [formatQuantity(value, item.payload.unit), "Consumed"]}
                  />
                  <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="size-4" /> Wastage this month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-tabular text-3xl font-semibold">{data.wastageSummary.thisMonth.toLocaleString("en-IN")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{data.wastageSummary.percentOfConsumption.toFixed(1)}% of this month's consumption</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-destructive" /> Low stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.lowStock.length === 0 ? (
              <EmptyState title="Nothing below its minimum right now" />
            ) : (
              <ul className="space-y-2">
                {data.lowStock.slice(0, 8).map((m) => (
                  <li key={m.id} className="flex items-center justify-between rounded-md border border-border p-2.5">
                    <Link href={`/materials/${m.id}`} className="font-medium hover:underline">
                      {m.name}
                    </Link>
                    <span className="font-tabular text-sm text-destructive">
                      {formatQuantity(m.currentStock, m.unit)} / {formatQuantity(m.minimumStock, m.unit)} min
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Running out soon</CardTitle>
          </CardHeader>
          <CardContent>
            {data.runningOutSoon.length === 0 ? (
              <EmptyState title="No forecasted stock-outs" description="Nothing is trending toward zero based on the last 30 days of usage." />
            ) : (
              <ul className="space-y-2">
                {data.runningOutSoon.map((m) => (
                  <li key={m.id} className="flex items-center justify-between rounded-md border border-border p-2.5">
                    <div>
                      <Link href={`/materials/${m.id}`} className="font-medium hover:underline">
                        {m.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {m.daysRemaining !== null ? `~${m.daysRemaining} days left` : "No recent usage to forecast"}
                        {m.estimatedStockOutDate && ` \u00b7 est. ${formatDate(m.estimatedStockOutDate)}`}
                      </p>
                    </div>
                    <AlertLevelBadge level={m.alertLevel} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent movements</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentMovements.length === 0 ? (
            <EmptyState title="No transactions recorded yet" />
          ) : (
            <ul className="divide-y divide-border">
              {data.recentMovements.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.material.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(t.date)} \u00b7 {t.createdBy?.name ?? "System"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <MovementBadge type={t.type} />
                    <span className="font-tabular text-sm">{formatQuantity(t.quantity, t.material.unit)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
