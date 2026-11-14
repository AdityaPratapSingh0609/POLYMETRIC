"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { AlertLevelBadge } from "@/components/shared/alert-level-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard, useAnalytics } from "@/hooks/use-intelligence";
import { formatDate, formatPercent, formatQuantity } from "@/lib/utils";

export function ExecutiveClient() {
  const { data: dashboard, isPending: dashboardPending } = useDashboard();
  const { data: analytics, isPending: analyticsPending } = useAnalytics();

  if (dashboardPending || analyticsPending || !dashboard || !analytics) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const withPrev = analytics.momComparison.filter((m) => m.previousMonth > 0);
  const fastestGrowing = [...withPrev].sort((a, b) => b.percentChange - a.percentChange)[0];
  const largestReduction = [...withPrev].sort((a, b) => a.percentChange - b.percentChange)[0];
  const mostConsumed = [...analytics.momComparison].sort((a, b) => b.currentMonth - a.currentMonth).slice(0, 5);
  const lowestStock = [...dashboard.lowStock].slice(0, 5);

  return (
    <div>
      <PageHeader title="Executive summary" description="The headline numbers, for a quick read before a meeting." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Inventory value"
          value={dashboard.inventoryValue !== null ? `\u20b9${dashboard.inventoryValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "\u2014"}
          sub={dashboard.inventoryValue === null ? "Set unit costs on materials to enable this" : "Across all active materials"}
        />
        <StatCard label="Monthly consumption" value={dashboard.month.consumption.toLocaleString("en-IN")} />
        <StatCard label="Wastage %" value={`${dashboard.wastageSummary.percentOfConsumption.toFixed(1)}%`} tone={dashboard.wastageSummary.percentOfConsumption > 5 ? "warning" : "default"} />
        <StatCard label="Forecasted stock-outs" value={dashboard.runningOutSoon.length} tone={dashboard.runningOutSoon.length > 0 ? "destructive" : "default"} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most consumed materials this month</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-1.5">
              {mostConsumed.map((m, i) => (
                <li key={m.materialId} className="flex items-center justify-between text-sm">
                  <span>
                    <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                    <Link href={`/materials/${m.materialId}`} className="hover:underline">
                      {m.name}
                    </Link>
                  </span>
                  <span className="font-tabular">{formatQuantity(m.currentMonth, m.unit)}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lowest stock materials</CardTitle>
          </CardHeader>
          <CardContent>
            {lowestStock.length === 0 ? (
              <EmptyState title="Nothing critically low" />
            ) : (
              <ol className="space-y-1.5">
                {lowestStock.map((m, i) => (
                  <li key={m.id} className="flex items-center justify-between text-sm">
                    <span>
                      <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                      <Link href={`/materials/${m.id}`} className="hover:underline">
                        {m.name}
                      </Link>
                    </span>
                    <span className="font-tabular text-destructive">{formatQuantity(m.currentStock, m.unit)}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fastest growing consumption</CardTitle>
          </CardHeader>
          <CardContent>
            {fastestGrowing ? (
              <div>
                <p className="font-medium">{fastestGrowing.name}</p>
                <p className="font-tabular text-2xl font-semibold text-destructive">{formatPercent(fastestGrowing.percentChange)}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not enough history yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Largest reduction</CardTitle>
          </CardHeader>
          <CardContent>
            {largestReduction ? (
              <div>
                <p className="font-medium">{largestReduction.name}</p>
                <p className="font-tabular text-2xl font-semibold text-success">{formatPercent(largestReduction.percentChange)}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not enough history yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active materials</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-tabular text-2xl font-semibold">{dashboard.totalActiveMaterials}</p>
            <p className="text-sm text-muted-foreground">of {dashboard.totalMaterials} total</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Forecasted stock-outs</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboard.runningOutSoon.length === 0 ? (
            <EmptyState title="Nothing forecasted to run out" />
          ) : (
            <ul className="space-y-2">
              {dashboard.runningOutSoon.map((m) => (
                <li key={m.id} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <Link href={`/materials/${m.id}`} className="font-medium hover:underline">
                      {m.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {m.daysRemaining !== null ? `~${m.daysRemaining} days left` : "\u2014"}
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
  );
}
