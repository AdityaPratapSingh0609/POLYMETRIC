import { prisma } from "./prisma";
import { getAllCurrentStocks } from "./stock";
import { addDays, daysBetween, formatPercent, monthLabel } from "./utils";
import {
  ABNORMAL_DEVIATION_PERCENT,
  DEAD_STOCK_WINDOWS,
  FORECAST_WINDOW_DAYS,
  LOW_STOCK_THRESHOLDS,
} from "./constants";

// ---------------------------------------------------------------------------
// Month bucketing helpers
// ---------------------------------------------------------------------------

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthKeyLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return monthLabel(y, m - 1);
}

function lastNMonthKeys(n: number, from = new Date()): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - i, 1));
    keys.push(monthKey(d));
  }
  return keys;
}

async function getMonthlySeriesByMaterial(monthsBack: number) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (monthsBack - 1), 1));
  const rows = await prisma.transaction.findMany({
    where: { type: "USAGE", date: { gte: start } },
    select: { materialId: true, date: true, quantity: true },
  });
  const map = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const key = monthKey(new Date(row.date));
    if (!map.has(row.materialId)) map.set(row.materialId, new Map());
    const m = map.get(row.materialId)!;
    m.set(key, (m.get(key) ?? 0) + row.quantity);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Month-over-month comparison
// ---------------------------------------------------------------------------

export type MoMComparison = {
  materialId: string;
  name: string;
  unit: string;
  currentMonth: number;
  previousMonth: number;
  difference: number;
  percentChange: number;
};

export async function getMoMComparison(): Promise<MoMComparison[]> {
  const materials = await prisma.material.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, unit: true },
  });
  const series = await getMonthlySeriesByMaterial(2);
  const [prevKey, curKey] = lastNMonthKeys(2);

  return materials.map((m) => {
    const monthMap = series.get(m.id) ?? new Map<string, number>();
    const current = monthMap.get(curKey) ?? 0;
    const previous = monthMap.get(prevKey) ?? 0;
    const difference = current - previous;
    const percentChange = previous > 0 ? (difference / previous) * 100 : current > 0 ? 100 : 0;
    return { materialId: m.id, name: m.name, unit: m.unit, currentMonth: current, previousMonth: previous, difference, percentChange };
  });
}

// ---------------------------------------------------------------------------
// Trend classification (last N months)
// ---------------------------------------------------------------------------

export type TrendClassification = "increasing" | "decreasing" | "stable" | "insufficient-data";

export type MaterialTrend = {
  materialId: string;
  name: string;
  unit: string;
  months: Array<{ label: string; value: number }>;
  classification: TrendClassification;
};

function classifyTrend(values: number[]): TrendClassification {
  if (values.length < 2) return "insufficient-data";
  if (!values.some((v) => v > 0)) return "stable";

  let increasingSteps = 0;
  let decreasingSteps = 0;
  let comparableSteps = 0;
  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1];
    const cur = values[i];
    if (prev === 0 && cur === 0) continue;
    comparableSteps++;
    const change = prev === 0 ? 100 : ((cur - prev) / prev) * 100;
    if (change > 5) increasingSteps++;
    else if (change < -5) decreasingSteps++;
  }
  if (comparableSteps === 0) return "stable";
  if (increasingSteps === comparableSteps) return "increasing";
  if (decreasingSteps === comparableSteps) return "decreasing";
  return "stable";
}

export async function getTrends(monthsBack = 3): Promise<MaterialTrend[]> {
  const materials = await prisma.material.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, unit: true },
  });
  const series = await getMonthlySeriesByMaterial(monthsBack);
  const keys = lastNMonthKeys(monthsBack);

  return materials.map((m) => {
    const monthMap = series.get(m.id) ?? new Map<string, number>();
    const months = keys.map((k) => ({ label: monthKeyLabel(k), value: monthMap.get(k) ?? 0 }));
    return { materialId: m.id, name: m.name, unit: m.unit, months, classification: classifyTrend(months.map((mo) => mo.value)) };
  });
}

// ---------------------------------------------------------------------------
// Stock-out forecasting + low stock alerts
// ---------------------------------------------------------------------------

export type ForecastAlertLevel = "critical" | "warning" | "watch" | null;

export type MaterialForecast = {
  materialId: string;
  name: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  avgDailyConsumption: number;
  daysRemaining: number | null;
  estimatedStockOutDate: Date | null;
  alertLevel: ForecastAlertLevel;
};

export async function getAllForecasts(): Promise<MaterialForecast[]> {
  const materials = await prisma.material.findMany({ where: { status: "ACTIVE" } });
  const stocks = await getAllCurrentStocks(materials.map((m) => m.id));
  const windowStart = addDays(new Date(), -FORECAST_WINDOW_DAYS);

  const usageRows = await prisma.transaction.groupBy({
    by: ["materialId"],
    where: { type: "USAGE", date: { gte: windowStart } },
    _sum: { quantity: true },
  });
  const usageMap = new Map(usageRows.map((r) => [r.materialId, r._sum.quantity ?? 0]));

  return materials.map((material) => {
    const currentStock = stocks.get(material.id) ?? 0;
    const totalUsage = usageMap.get(material.id) ?? 0;
    const avgDailyConsumption = totalUsage / FORECAST_WINDOW_DAYS;

    let daysRemaining: number | null = null;
    let estimatedStockOutDate: Date | null = null;
    if (avgDailyConsumption > 0) {
      daysRemaining = currentStock / avgDailyConsumption;
      estimatedStockOutDate = addDays(new Date(), Math.floor(daysRemaining));
    }

    let alertLevel: ForecastAlertLevel = null;
    if (currentStock <= material.minimumStock) {
      alertLevel = "critical";
    } else if (daysRemaining !== null) {
      if (daysRemaining < LOW_STOCK_THRESHOLDS.critical) alertLevel = "critical";
      else if (daysRemaining < LOW_STOCK_THRESHOLDS.warning) alertLevel = "warning";
      else if (daysRemaining < LOW_STOCK_THRESHOLDS.watch) alertLevel = "watch";
    }

    return {
      materialId: material.id,
      name: material.name,
      unit: material.unit,
      currentStock,
      minimumStock: material.minimumStock,
      avgDailyConsumption,
      daysRemaining,
      estimatedStockOutDate,
      alertLevel,
    };
  });
}

export async function getForecast(materialId: string): Promise<MaterialForecast | null> {
  const all = await getAllForecasts();
  return all.find((f) => f.materialId === materialId) ?? null;
}

// ---------------------------------------------------------------------------
// Abnormal consumption detection (recent 7-day daily average vs a trailing
// 30-day baseline that excludes those same 7 days, so a spike doesn't drag
// its own baseline up).
// ---------------------------------------------------------------------------

export type AbnormalConsumption = {
  materialId: string;
  name: string;
  unit: string;
  recentDailyAvg: number;
  rollingDailyAvg: number;
  deviationPercent: number;
  direction: "spike" | "drop";
};

export async function getAbnormalConsumption(): Promise<AbnormalConsumption[]> {
  const materials = await prisma.material.findMany({ where: { status: "ACTIVE" } });
  const now = new Date();
  const recentStart = addDays(now, -7);
  const rollingStart = addDays(now, -37);
  const rollingEnd = addDays(now, -7);

  const [recentRows, rollingRows] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["materialId"],
      where: { type: "USAGE", date: { gte: recentStart, lte: now } },
      _sum: { quantity: true },
    }),
    prisma.transaction.groupBy({
      by: ["materialId"],
      where: { type: "USAGE", date: { gte: rollingStart, lte: rollingEnd } },
      _sum: { quantity: true },
    }),
  ]);

  const recentMap = new Map(recentRows.map((r) => [r.materialId, (r._sum.quantity ?? 0) / 7]));
  const rollingMap = new Map(rollingRows.map((r) => [r.materialId, (r._sum.quantity ?? 0) / 30]));

  const results: AbnormalConsumption[] = [];
  for (const m of materials) {
    const recentAvg = recentMap.get(m.id) ?? 0;
    const rollingAvg = rollingMap.get(m.id) ?? 0;
    if (rollingAvg <= 0) continue; // not enough history to judge yet
    const deviationPercent = ((recentAvg - rollingAvg) / rollingAvg) * 100;
    if (Math.abs(deviationPercent) >= ABNORMAL_DEVIATION_PERCENT) {
      results.push({
        materialId: m.id,
        name: m.name,
        unit: m.unit,
        recentDailyAvg: recentAvg,
        rollingDailyAvg: rollingAvg,
        deviationPercent,
        direction: deviationPercent > 0 ? "spike" : "drop",
      });
    }
  }
  return results.sort((a, b) => Math.abs(b.deviationPercent) - Math.abs(a.deviationPercent));
}

// ---------------------------------------------------------------------------
// Dead stock detection
// ---------------------------------------------------------------------------

export type DeadStockEntry = {
  materialId: string;
  name: string;
  unit: string;
  lastMovementDate: Date | null;
  daysSinceMovement: number | null;
};

export async function getDeadStock(): Promise<DeadStockEntry[]> {
  const materials = await prisma.material.findMany({ where: { status: "ACTIVE" } });
  const lastMovementRows = await prisma.transaction.groupBy({ by: ["materialId"], _max: { date: true } });
  const lastMap = new Map(lastMovementRows.map((r) => [r.materialId, r._max.date]));
  const now = new Date();

  const results: DeadStockEntry[] = [];
  for (const m of materials) {
    const last = lastMap.get(m.id) ?? null;
    const daysSinceMovement = last ? daysBetween(new Date(last), now) : null;
    if (daysSinceMovement === null || daysSinceMovement >= DEAD_STOCK_WINDOWS[0]) {
      results.push({ materialId: m.id, name: m.name, unit: m.unit, lastMovementDate: last, daysSinceMovement });
    }
  }
  return results.sort((a, b) => (b.daysSinceMovement ?? Number.MAX_SAFE_INTEGER) - (a.daysSinceMovement ?? Number.MAX_SAFE_INTEGER));
}

// ---------------------------------------------------------------------------
// Fast / slow moving materials
// ---------------------------------------------------------------------------

export type MovingPeriod = "daily" | "weekly" | "monthly" | "yearly";

function periodRange(period: MovingPeriod): { from: Date; to: Date } {
  const to = new Date();
  const daysMap: Record<MovingPeriod, number> = { daily: 1, weekly: 7, monthly: 30, yearly: 365 };
  return { from: addDays(to, -daysMap[period]), to };
}

export type MovingMaterial = { materialId: string; name: string; unit: string; quantity: number };

export async function getFastMoving(period: MovingPeriod = "monthly", limit = 10): Promise<MovingMaterial[]> {
  const { from, to } = periodRange(period);
  const rows = await prisma.transaction.groupBy({
    by: ["materialId"],
    where: { type: "USAGE", date: { gte: from, lte: to } },
    _sum: { quantity: true },
  });
  const materials = await prisma.material.findMany({ where: { id: { in: rows.map((r) => r.materialId) } } });
  const materialMap = new Map(materials.map((m) => [m.id, m]));
  return rows
    .map((r) => ({
      materialId: r.materialId,
      name: materialMap.get(r.materialId)?.name ?? "Unknown",
      unit: materialMap.get(r.materialId)?.unit ?? "",
      quantity: r._sum.quantity ?? 0,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

export async function getSlowMoving(period: MovingPeriod = "monthly", limit = 10): Promise<MovingMaterial[]> {
  const materials = await prisma.material.findMany({ where: { status: "ACTIVE" } });
  const { from, to } = periodRange(period);
  const rows = await prisma.transaction.groupBy({
    by: ["materialId"],
    where: { type: "USAGE", date: { gte: from, lte: to } },
    _sum: { quantity: true },
  });
  const usageMap = new Map(rows.map((r) => [r.materialId, r._sum.quantity ?? 0]));
  return materials
    .map((m) => ({ materialId: m.id, name: m.name, unit: m.unit, quantity: usageMap.get(m.id) ?? 0 }))
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Insights engine
//
// This deliberately does NOT call an external AI/LLM API — per the "no
// cloud services required" / fully-local requirement, these summaries are
// generated by a deterministic rules-and-statistics engine running on your
// own machine, using the analytics functions above. It's free, instant, and
// works offline. (If you ever want actual free-text LLM-generated prose on
// top of these numbers, this function is the place to swap in an API call.)
// ---------------------------------------------------------------------------

export async function generateInsights(): Promise<string[]> {
  const insights: string[] = [];

  const mom = await getMoMComparison();
  for (const m of mom) {
    if (m.previousMonth === 0) continue; // avoid noisy "infinite % increase" sentences
    if (Math.abs(m.percentChange) < 3) continue;
    const direction = m.percentChange > 0 ? "increased" : "decreased";
    insights.push(`${m.name} consumption ${direction} by ${Math.abs(m.percentChange).toFixed(1)}% compared to last month.`);
  }

  const trends = await getTrends(3);
  for (const t of trends) {
    if (t.classification === "increasing") {
      insights.push(`${t.name} usage has increased consistently over the last ${t.months.length} months.`);
    } else if (t.classification === "decreasing") {
      insights.push(`${t.name} usage has decreased consistently over the last ${t.months.length} months.`);
    }
  }

  const topThisMonth = [...mom].sort((a, b) => b.currentMonth - a.currentMonth)[0];
  if (topThisMonth && topThisMonth.currentMonth > 0) {
    insights.push(`Most consumed material this month: ${topThisMonth.name}.`);
  }

  const withPrev = mom.filter((m) => m.previousMonth > 0);
  const fastestGrowing = [...withPrev].sort((a, b) => b.percentChange - a.percentChange)[0];
  if (fastestGrowing && fastestGrowing.percentChange > 3) {
    insights.push(`Fastest growing consumption: ${fastestGrowing.name} (${formatPercent(fastestGrowing.percentChange)}).`);
  }
  const largestReduction = [...withPrev].sort((a, b) => a.percentChange - b.percentChange)[0];
  if (largestReduction && largestReduction.percentChange < -3) {
    insights.push(`Largest reduction: ${largestReduction.name} (${formatPercent(largestReduction.percentChange)}).`);
  }

  const abnormal = await getAbnormalConsumption();
  for (const a of abnormal.slice(0, 3)) {
    insights.push(`Abnormal consumption detected for ${a.name}: recent daily average is ${formatPercent(a.deviationPercent)} vs its trailing average.`);
  }

  const dead = await getDeadStock();
  const trulyDead = dead.filter((d) => (d.daysSinceMovement ?? 0) >= 60);
  if (trulyDead.length > 0) {
    insights.push(
      `${trulyDead.length} material${trulyDead.length > 1 ? "s" : ""} had no stock movement in 60+ days: ${trulyDead
        .slice(0, 5)
        .map((d) => d.name)
        .join(", ")}${trulyDead.length > 5 ? ", \u2026" : ""}.`
    );
  }

  return insights;
}

// ---------------------------------------------------------------------------
// Consolidated payload for the Analytics page / API route
// ---------------------------------------------------------------------------

export async function getAnalyticsOverview() {
  const [momComparison, trends, insights, forecasts, abnormal, deadStock, fastMoving, slowMoving] = await Promise.all([
    getMoMComparison(),
    getTrends(3),
    generateInsights(),
    getAllForecasts(),
    getAbnormalConsumption(),
    getDeadStock(),
    getFastMoving("monthly", 10),
    getSlowMoving("monthly", 10),
  ]);
  return { momComparison, trends, insights, forecasts, abnormal, deadStock, fastMoving, slowMoving };
}
