import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/api-utils";
import { createUserSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    await requireRole(["ADMIN"]);
    const users = await prisma.user.findMany({
      select: { id: true, name: true, username: true, role: true, active: true, createdAt: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireRole(["ADMIN"]);
    const body = await req.json();
    const data = createUserSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { username: data.username } });
    if (existing) return apiError("That username is already taken.", 409);

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: { name: data.name, username: data.username, passwordHash, role: data.role },
      select: { id: true, name: true, username: true, role: true, active: true, createdAt: true },
    });

    await writeAuditLog({ entityType: "User", entityId: user.id, action: "CREATE", newValue: user, userId: admin.userId });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
