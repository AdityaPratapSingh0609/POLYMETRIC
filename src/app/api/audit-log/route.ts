import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";

export async function GET(req: Request) {
  try {
    await requireRole(["ADMIN"]);
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Record<string, unknown> = {};
    if (entityType) where.entityType = entityType;
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(new Date(to).setUTCHours(23, 59, 59, 999)) } : {}),
      };
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, username: true } } },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return NextResponse.json(logs);
  } catch (error) {
    return handleApiError(error);
  }
}
