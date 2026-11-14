import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";
import { getAllCurrentStocks, getTotalConsumption } from "@/lib/stock";
import { getAllForecasts } from "@/lib/analytics";
import { addDays } from "@/lib/utils";
import type { DashboardData } from "@/types";

export async function GET() {
  try {
    await requireRole(["ADMIN", "SUPERVISOR", "OPERATOR"]);

    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfWeek = addDays(startOfToday, -6);
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [materials, activeMaterials] = await Promise.all([
      prisma.material.count(),
      prisma.material.count({ where: { status: "ACTIVE" } }),
    ]);

    const activeList = await prisma.material.findMany({ where: { status: "ACTIVE" } });
    const stocks = await getAllCurrentStocks(activeList.map((m) => m.id));

    const inventoryValue = activeList.some((m) => m.unitCost != null)
      ? activeList.reduce((sum, m) => sum + (stocks.get(m.id) ?? 0) * (m.unitCost ?? 0), 0)
      : null;

    const [todayConsumption, weekConsumption, monthConsumption] = await Promise.all([
      getTotalConsumption(startOfToday, now),
      getTotalConsumption(startOfWeek, now),
      getTotalConsumption(startOfMonth, now),
    ]);

    const lowStock = activeList
      .map((m) => ({ id: m.id, name: m.name, unit: m.unit, currentStock: stocks.get(m.id) ?? 0, minimumStock: m.minimumStock }))
      .filter((m) => m.currentStock <= m.minimumStock)
      .sort((a, b) => a.currentStock - a.minimumStock - (b.currentStock - b.minimumStock));

    const forecasts = await getAllForecasts();
    const runningOutSoon = forecasts
      .filter((f) => f.alertLevel !== null)
      .sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0))
      .slice(0, 10)
      .map((f) => ({
        id: f.materialId,
        name: f.name,
        unit: f.unit,
        daysRemaining: f.daysRemaining !== null ? Math.round(f.daysRemaining) : null,
        estimatedStockOutDate: f.estimatedStockOutDate ? f.estimatedStockOutDate.toISOString() : null,
        alertLevel: f.alertLevel,
      }));

    const monthUsageRows = await prisma.transaction.groupBy({
      by: ["materialId"],
      where: { type: "USAGE", date: { gte: startOfMonth, lte: now } },
      _sum: { quantity: true },
    });
    const materialMap = new Map(activeList.map((m) => [m.id, m]));
    const topConsumed = monthUsageRows
      .map((r) => ({
        id: r.materialId,
        name: materialMap.get(r.materialId)?.name ?? "Unknown",
        unit: materialMap.get(r.materialId)?.unit ?? "",
        quantity: r._sum.quantity ?? 0,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);

    const recentMovements = await prisma.transaction.findMany({
      take: 15,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { material: true, shift: true, reason: true, createdBy: true },
    });

    const wastageThisMonth = await prisma.transaction.aggregate({
      where: { type: "WASTAGE", date: { gte: startOfMonth, lte: now } },
      _sum: { quantity: true },
    });
    const wastageQty = wastageThisMonth._sum.quantity ?? 0;
    const percentOfConsumption = monthConsumption > 0 ? (wastageQty / monthConsumption) * 100 : 0;

    const payload: DashboardData = {
      totalMaterials: materials,
      totalActiveMaterials: activeMaterials,
      inventoryValue,
      today: { consumption: todayConsumption },
      week: { consumption: weekConsumption },
      month: { consumption: monthConsumption },
      lowStock,
      runningOutSoon,
      topConsumed,
      recentMovements,
      wastageSummary: { thisMonth: wastageQty, percentOfConsumption },
    };

    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}
