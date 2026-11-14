import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/api-utils";
import { reasonCodeSchema, shiftSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ resource: string }> }) {
  try {
    await requireRole(["ADMIN", "SUPERVISOR", "OPERATOR"]);
    const { resource } = await params;

    if (resource === "shifts") {
      return NextResponse.json(await prisma.shift.findMany({ orderBy: { name: "asc" } }));
    }
    if (resource === "reasons") {
      return NextResponse.json(await prisma.reasonCode.findMany({ orderBy: { name: "asc" } }));
    }
    return apiError("Unknown settings resource.", 404);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ resource: string }> }) {
  try {
    const user = await requireRole(["ADMIN", "SUPERVISOR"]);
    const { resource } = await params;
    const body = await req.json();

    if (resource === "shifts") {
      const data = shiftSchema.parse(body);
      const row = await prisma.shift.create({ data });
      await writeAuditLog({ entityType: "Shift", entityId: row.id, action: "CREATE", newValue: row, userId: user.userId });
      return NextResponse.json(row, { status: 201 });
    }
    if (resource === "reasons") {
      const data = reasonCodeSchema.parse(body);
      const row = await prisma.reasonCode.create({ data });
      await writeAuditLog({ entityType: "ReasonCode", entityId: row.id, action: "CREATE", newValue: row, userId: user.userId });
      return NextResponse.json(row, { status: 201 });
    }
    return apiError("Unknown settings resource.", 404);
  } catch (error) {
    return handleApiError(error);
  }
}
