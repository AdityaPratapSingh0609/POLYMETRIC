import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/api-utils";
import { updateUserSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireRole(["ADMIN"]);
    const { id } = await params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return apiError("User not found.", 404);

    const body = await req.json();
    const data = updateUserSchema.parse(body);

    if (id === admin.userId && (data.active === false || data.role !== undefined && data.role !== "ADMIN")) {
      return apiError("You can't remove your own admin access.", 400);
    }

    const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : undefined;
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.role !== undefined ? { role: data.role } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: { id: true, name: true, username: true, role: true, active: true, createdAt: true },
    });

    await writeAuditLog({
      entityType: "User",
      entityId: id,
      action: "UPDATE",
      oldValue: { name: existing.name, role: existing.role, active: existing.active },
      newValue: updated,
      userId: admin.userId,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
