import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/api-utils";
import { sumSigned } from "@/lib/stock";
import type { BatchReportRow, ReportRow } from "@/types";

function emptyRow(): Omit<ReportRow, "materialId" | "name" | "unit"> {
  return { opening: 0, purchased: 0, returned: 0, consumed: 0, wastage: 0, adjustments: 0, transferred: 0, closing: 0 };
}

export async function GET(req: Request) {
  try {
    await requireRole(["ADMIN", "SUPERVISOR", "OPERATOR"]);
    const { searchParams } = new URL(req.url);

    const type = searchParams.get("type") ?? "monthly";
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");
    const materialId = searchParams.get("materialId");
    const categoryId = searchParams.get("categoryId");

    if (!fromStr || !toStr) return apiError("from and to dates are required.", 400);
    const from = new Date(fromStr);
    const to = new Date(new Date(toStr).setUTCHours(23, 59, 59, 999));

    const materialWhere: Record<string, unknown> = { status: { not: "ARCHIVED" } };
    if (materialId) materialWhere.id = materialId;
    if (categoryId) materialWhere.categoryId = categoryId;
    const materials = await prisma.material.findMany({ where: materialWhere });

    if (type === "batch") {
      const batchTxns = await prisma.transaction.findMany({
        where: {
          type: "USAGE",
          batchNumber: { not: null },
          date: { gte: from, lte: to },
          ...(materialId ? { materialId } : {}),
        },
        include: { material: true },
      });
      const groups = new Map<string, { row: BatchReportRow }>();
      for (const t of batchTxns) {
        if (!t.batchNumber) continue;
        const key = `${t.batchNumber}::${t.materialId}`;
        const dateStr = t.date.toISOString();
        if (!groups.has(key)) {
          groups.set(key, {
            row: {
              batchNumber: t.batchNumber,
              materialId: t.materialId,
              materialName: t.material.name,
              unit: t.material.unit,
              totalQuantity: 0,
              entries: 0,
              firstDate: dateStr,
              lastDate: dateStr,
            },
          });
        }
        const g = groups.get(key)!.row;
        g.totalQuantity += t.quantity;
        g.entries += 1;
        if (dateStr < g.firstDate) g.firstDate = dateStr;
        if (dateStr > g.lastDate) g.lastDate = dateStr;
      }
      const batchRows = Array.from(groups.values())
        .map((g) => g.row)
        .sort((a, b) => a.batchNumber.localeCompare(b.batchNumber));
      return NextResponse.json({ rows: [], batchRows, totals: null });
    }

    const rows: ReportRow[] = [];
    for (const material of materials) {
      const beforeTxns = await prisma.transaction.findMany({
        where: { materialId: material.id, date: { lt: from } },
        select: { type: true, quantity: true },
      });
      const opening = sumSigned(beforeTxns);

      const withinTxns = await prisma.transaction.findMany({
        where: { materialId: material.id, date: { gte: from, lte: to } },
        select: { type: true, quantity: true },
      });

      const bucket = emptyRow();
      for (const t of withinTxns) {
        switch (t.type) {
          case "PURCHASE":
            bucket.purchased += t.quantity;
            break;
          case "RETURN":
            bucket.returned += t.quantity;
            break;
          case "USAGE":
            bucket.consumed += t.quantity;
            break;
          case "WASTAGE":
            bucket.wastage += t.quantity;
            break;
          case "ADJUSTMENT":
            bucket.adjustments += t.quantity;
            break;
          case "TRANSFER":
            bucket.transferred += t.quantity;
            break;
          case "OPENING":
            // Opening entries dated inside the report window (rare — usually
            // only happens once, at setup) are folded into "purchased" so the
            // closing balance still reconciles correctly.
            bucket.purchased += t.quantity;
            break;
        }
      }
      const closing = opening + sumSigned(withinTxns);
      rows.push({ materialId: material.id, name: material.name, unit: material.unit, ...bucket, opening, closing });
    }

    const totals = rows.reduce<ReportRow>(
      (acc, r) => ({
        materialId: "TOTAL",
        name: "Total",
        unit: "",
        opening: acc.opening + r.opening,
        purchased: acc.purchased + r.purchased,
        returned: acc.returned + r.returned,
        consumed: acc.consumed + r.consumed,
        wastage: acc.wastage + r.wastage,
        adjustments: acc.adjustments + r.adjustments,
        transferred: acc.transferred + r.transferred,
        closing: acc.closing + r.closing,
      }),
      { materialId: "TOTAL", name: "Total", unit: "", ...emptyRow() }
    );

    return NextResponse.json({ rows, batchRows: [], totals });
  } catch (error) {
    return handleApiError(error);
  }
}
