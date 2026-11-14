import type { Transaction } from "@prisma/client";
import type { TransactionType } from "@/types";
import { prisma } from "./prisma";

/**
 * The single source of truth for turning a raw transaction row into its
 * signed effect on stock. Nothing else in the codebase should reimplement
 * this logic — every stock number in the app (dashboard, ledger, reports,
 * forecasts) is derived by summing this function over transactions.
 */
export function signedQuantity(type: TransactionType | string, quantity: number): number {
  switch (type) {
    case "OPENING":
    case "PURCHASE":
    case "RETURN":
      return Math.abs(quantity);
    case "USAGE":
    case "WASTAGE":
    case "TRANSFER":
      return -Math.abs(quantity);
    case "ADJUSTMENT":
      return quantity; // stored signed: positive = found stock, negative = correction down
    default:
      return 0;
  }
}

export type MinimalTxn = { type: TransactionType | string; quantity: number };

export function sumSigned(transactions: MinimalTxn[]): number {
  return transactions.reduce((sum, t) => sum + signedQuantity(t.type, t.quantity), 0);
}

/** Current stock for one material, computed live from its full ledger. */
export async function getCurrentStock(materialId: string): Promise<number> {
  const rows = await prisma.transaction.findMany({
    where: { materialId },
    select: { type: true, quantity: true },
  });
  return sumSigned(rows);
}

/**
 * Current stock for every material in one pass — used by the dashboard and
 * materials list so we don't run one query per material. Fine for the
 * transaction volumes a single factory generates; see the schema note on
 * caching a running balance if this ever needs to scale much further.
 */
export async function getAllCurrentStocks(materialIds?: string[]): Promise<Map<string, number>> {
  const rows = await prisma.transaction.findMany({
    where: materialIds ? { materialId: { in: materialIds } } : undefined,
    select: { materialId: true, type: true, quantity: true },
  });
  const balances = new Map<string, number>();
  for (const row of rows) {
    const prev = balances.get(row.materialId) ?? 0;
    balances.set(row.materialId, prev + signedQuantity(row.type, row.quantity));
  }
  return balances;
}

/** Stock as of the end of a given date (inclusive), computed from the ledger. */
export async function getStockAsOf(materialId: string, asOf: Date): Promise<number> {
  const rows = await prisma.transaction.findMany({
    where: { materialId, date: { lte: asOf } },
    select: { type: true, quantity: true },
  });
  return sumSigned(rows);
}

export type LedgerEntry = Transaction & { runningBalance: number };

/** Full statement-style ledger for one material, oldest first, with a running balance. */
export async function getMaterialLedger(materialId: string): Promise<LedgerEntry[]> {
  const rows = await prisma.transaction.findMany({
    where: { materialId },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    include: { shift: true, reason: true, createdBy: true },
  });
  let running = 0;
  return rows.map((row) => {
    running += signedQuantity(row.type, row.quantity);
    return { ...row, runningBalance: running };
  });
}

/** Total consumption (USAGE only) for one material within [from, to] inclusive. */
export async function getConsumption(materialId: string, from: Date, to: Date): Promise<number> {
  const rows = await prisma.transaction.aggregate({
    where: { materialId, type: "USAGE", date: { gte: from, lte: to } },
    _sum: { quantity: true },
  });
  return rows._sum.quantity ?? 0;
}

/** Total consumption across ALL active materials within [from, to] inclusive. */
export async function getTotalConsumption(from: Date, to: Date): Promise<number> {
  const rows = await prisma.transaction.aggregate({
    where: { type: "USAGE", date: { gte: from, lte: to } },
    _sum: { quantity: true },
  });
  return rows._sum.quantity ?? 0;
}
