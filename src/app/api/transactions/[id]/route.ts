import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/api-utils";
import { writeAuditLog } from "@/lib/audit";

// The ledger is append-only by design (see lib/stock.ts) — the normal way to
// correct a mistake is to enter an offsetting Adjustment, which preserves
// the audit trail. This DELETE is an Admin-only escape hatch for genuine
// data-entry errors (wrong material, fat-fingered date, duplicate entry),
// and it always leaves an audit log entry behind.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(["ADMIN"]);
    const { id } = await params;

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) return apiError("Transaction not found.", 404);

    await prisma.transaction.delete({ where: { id } });
    await writeAuditLog({
      entityType: "Transaction",
      entityId: id,
      action: "DELETE",
      oldValue: existing,
      userId: user.userId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
