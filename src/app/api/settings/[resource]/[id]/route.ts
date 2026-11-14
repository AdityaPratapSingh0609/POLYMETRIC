import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/api-utils";
import { writeAuditLog } from "@/lib/audit";

export async function DELETE(_req: Request, { params }: { params: Promise<{ resource: string; id: string }> }) {
  try {
    const user = await requireRole(["ADMIN", "SUPERVISOR"]);
    const { resource, id } = await params;

    if (resource === "shifts") {
      const existing = await prisma.shift.findUnique({ where: { id } });
      if (!existing) return apiError("Shift not found.", 404);
      const inUse = await prisma.transaction.findFirst({ where: { shiftId: id } });
      if (inUse) return apiError("This shift is used on existing transactions and can't be deleted.", 409);
      await prisma.shift.delete({ where: { id } });
      await writeAuditLog({ entityType: "Shift", entityId: id, action: "DELETE", oldValue: existing, userId: user.userId });
      return NextResponse.json({ ok: true });
    }

    if (resource === "reasons") {
      const existing = await prisma.reasonCode.findUnique({ where: { id } });
      if (!existing) return apiError("Reason code not found.", 404);
      const inUse = await prisma.transaction.findFirst({ where: { reasonId: id } });
      if (inUse) return apiError("This reason is used on existing transactions and can't be deleted.", 409);
      await prisma.reasonCode.delete({ where: { id } });
      await writeAuditLog({ entityType: "ReasonCode", entityId: id, action: "DELETE", oldValue: existing, userId: user.userId });
      return NextResponse.json({ ok: true });
    }

    return apiError("Unknown settings resource.", 404);
  } catch (error) {
    return handleApiError(error);
  }
}
