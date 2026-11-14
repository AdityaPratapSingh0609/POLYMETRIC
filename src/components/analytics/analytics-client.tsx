"use client";

import Link from "next/link";
import { Lightbulb, TrendingUp, TrendingDown, Minus, AlertOctagon, Archive } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AlertLevelBadge } from "@/components/shared/alert-level-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAnalytics } from "@/hooks/use-intelligence";
import { formatDate, formatPercent, formatQuantity } from "@/lib/utils";

function TrendIcon({ classification }: { classification: string }) {
  if (classification === "increasing") return <TrendingUp className="size-4 text-destructive" />;
  if (classification === "decreasing") return <TrendingDown className="size-4 text-success" />;
  return <Minus className="size-4 text-muted-foreground" />;
}

export function AnalyticsClient() {
  const { data, isPending } = useAnalytics();

  if (isPending || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Intelligence" description="Automatically generated from your ledger — month-over-month comparisons, trends, forecasts, and anomalies." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="size-4 text-primary" /> Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.insights.length === 0 ? (
            <EmptyState title="Not enough history yet" description="Insights appear automatically once a few weeks of transactions build up." />
          ) : (
            <ul className="space-y-2">
              {data.insights.map((line, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-primary">\u2022</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="mom">
        <TabsList className="flex-wrap">
          <TabsTrigger value="mom">Month over month</TabsTrigger>
          <TabsTrigger value="trends">3-month trends</TabsTrigger>
          <TabsTrigger value="forecast">Stock-out forecast</TabsTrigger>
          <TabsTrigger value="abnormal">Abnormal usage</TabsTrigger>
          <TabsTrigger value="movers">Fast / slow movers</TabsTrigger>
          <TabsTrigger value="dead">Dead stock</TabsTrigger>
        </TabsList>

        <TabsContent value="mom" className="mt-4">
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">This month</TableHead>
                    <TableHead className="text-right">Last month</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                    <TableHead className="text-right">% change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.momComparison
                    .filter((m) => m.currentMonth > 0 || m.previousMonth > 0)
                    .sort((a, b) => b.currentMonth - a.currentMonth)
                    .map((m) => (
                      <TableRow key={m.materialId}>
                        <TableCell className="font-medium">
                          <Link href={`/materials/${m.materialId}`} className="hover:underline">
                            {m.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right font-tabular">{formatQuantity(m.currentMonth, m.unit)}</TableCell>
                        <TableCell className="text-right font-tabular text-muted-foreground">{formatQuantity(m.previousMonth, m.unit)}</TableCell>
                        <TableCell className={`text-right font-tabular ${m.difference >= 0 ? "text-destructive" : "text-success"}`}>
                          {m.difference >= 0 ? "+" : ""}
                          {formatQuantity(m.difference, m.unit)}
                        </TableCell>
                        <TableCell className={`text-right font-tabular ${m.percentChange >= 0 ? "text-destructive" : "text-success"}`}>
                          {formatPercent(m.percentChange)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="mt-4">
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    {data.trends[0]?.months.map((mo) => (
                      <TableHead key={mo.label} className="text-right">
                        {mo.label}
                      </TableHead>
                    ))}
                    <TableHead>Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.trends
                    .filter((t) => t.months.some((mo) => mo.value > 0))
                    .map((t) => (
                      <TableRow key={t.materialId}>
                        <TableCell className="font-medium">
                          <Link href={`/materials/${t.materialId}`} className="hover:underline">
                            {t.name}
                          </Link>
                        </TableCell>
                        {t.months.map((mo) => (
                          <TableCell key={mo.label} className="text-right font-tabular">
                            {formatQuantity(mo.value, t.unit)}
                          </TableCell>
                        ))}
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 capitalize">
                            <TrendIcon classification={t.classification} /> {t.classification.replace("-", " ")}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="mt-4">
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Current stock</TableHead>
                    <TableHead className="text-right">Avg. daily use</TableHead>
                    <TableHead className="text-right">Days remaining</TableHead>
                    <TableHead>Est. stock-out</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.forecasts
                    .sort((a, b) => (a.daysRemaining ?? Infinity) - (b.daysRemaining ?? Infinity))
                    .map((f) => (
                      <TableRow key={f.materialId}>
                        <TableCell className="font-medium">
                          <Link href={`/materials/${f.materialId}`} className="hover:underline">
                            {f.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right font-tabular">{formatQuantity(f.currentStock, f.unit)}</TableCell>
                        <TableCell className="text-right font-tabular text-muted-foreground">{formatQuantity(f.avgDailyConsumption, f.unit)}</TableCell>
                        <TableCell className="text-right font-tabular">{f.daysRemaining !== null ? Math.round(f.daysRemaining) : "\u2014"}</TableCell>
                        <TableCell className="text-muted-foreground">{f.estimatedStockOutDate ? formatDate(f.estimatedStockOutDate) : "\u2014"}</TableCell>
                        <TableCell>
                          <AlertLevelBadge level={f.alertLevel} />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="abnormal" className="mt-4">
          <Card>
            <CardContent className="p-4">
              {data.abnormal.length === 0 ? (
                <EmptyState title="No abnormal consumption detected" description="Recent daily averages are within normal range of the trailing 30-day average for every material." />
              ) : (
                <ul className="space-y-2">
                  {data.abnormal.map((a) => (
                    <li key={a.materialId} className="flex items-center justify-between rounded-md border border-border p-3">
                      <div className="flex items-center gap-2">
                        <AlertOctagon className={`size-4 ${a.direction === "spike" ? "text-destructive" : "text-warning"}`} />
                        <Link href={`/materials/${a.materialId}`} className="font-medium hover:underline">
                          {a.name}
                        </Link>
                        <Badge variant={a.direction === "spike" ? "destructive" : "warning"}>{a.direction === "spike" ? "Spike" : "Drop"}</Badge>
                      </div>
                      <span className="font-tabular text-sm text-muted-foreground">
                        {formatQuantity(a.recentDailyAvg, a.unit)}/day recent vs {formatQuantity(a.rollingDailyAvg, a.unit)}/day trailing ({formatPercent(a.deviationPercent)})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movers" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fast moving (last 30 days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-1.5">
                  {data.fastMoving.map((m, i) => (
                    <li key={m.materialId} className="flex items-center justify-between text-sm">
                      <span>
                        <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                        {m.name}
                      </span>
                      <span className="font-tabular">{formatQuantity(m.quantity, m.unit)}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Slow moving (last 30 days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-1.5">
                  {data.slowMoving.map((m, i) => (
                    <li key={m.materialId} className="flex items-center justify-between text-sm">
                      <span>
                        <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                        {m.name}
                      </span>
                      <span className="font-tabular">{formatQuantity(m.quantity, m.unit)}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dead" className="mt-4">
          <Card>
            <CardContent className="p-4">
              {data.deadStock.length === 0 ? (
                <EmptyState title="Nothing looks dead" description="Every active material has had a movement in the last 30 days." />
              ) : (
                <ul className="space-y-2">
                  {data.deadStock.map((d) => (
                    <li key={d.materialId} className="flex items-center justify-between rounded-md border border-border p-3">
                      <div className="flex items-center gap-2">
                        <Archive className="size-4 text-muted-foreground" />
                        <Link href={`/materials/${d.materialId}`} className="font-medium hover:underline">
                          {d.name}
                        </Link>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {d.daysSinceMovement !== null ? `${d.daysSinceMovement} days since last movement` : "No movement recorded"}
                        {d.lastMovementDate && ` (last: ${formatDate(d.lastMovementDate)})`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
