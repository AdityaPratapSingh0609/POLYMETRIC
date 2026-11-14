import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentStock, getMaterialLedger } from "@/lib/stock";
import { requireRole } from "@/lib/auth";
import { handleApiError, apiError } from "@/lib/api-utils";
import { materialSchema, materialStatusSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit";
import type { MaterialWithStock } from "@/types";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["ADMIN", "SUPERVISOR", "OPERATOR"]);
    const { id } = await params;

    const material = await prisma.material.findUnique({ where: { id }, include: { category: true } });
    if (!material) return apiError("Material not found.", 404);

    const currentStock = await getCurrentStock(id);
    const ledger = await getMaterialLedger(id);

    const result: MaterialWithStock = { ...material, currentStock };
    return NextResponse.json({ material: result, ledger });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(["ADMIN", "SUPERVISOR"]);
    const { id } = await params;
    const existing = await prisma.material.findUnique({ where: { id } });
    if (!existing) return apiError("Material not found.", 404);

    const body = await req.json();

    // A status change to ARCHIVED (or restoring from it) is more consequential
    // than editing a field, so it's Admin-only.
    if (typeof body.status !== "undefined") {
      const wantsArchiveChange = body.status === "ARCHIVED" || existing.status === "ARCHIVED";
      if (wantsArchiveChange && user.role !== "ADMIN") {
        return apiError("Only an Admin can archive or restore a material.", 403);
      }
      materialStatusSchema.parse(body.status);
    }

    const partial = materialSchema.partial().parse(body);
    const updated = await prisma.material.update({
      where: { id },
      data: { ...partial, ...(body.status ? { status: body.status } : {}) },
    });

    await writeAuditLog({
      entityType: "Material",
      entityId: id,
      action: body.status && body.status !== existing.status ? (body.status === "ARCHIVED" ? "ARCHIVE" : "RESTORE") : "UPDATE",
      oldValue: existing,
      newValue: updated,
      userId: user.userId,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
