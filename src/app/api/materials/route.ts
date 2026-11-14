import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAllCurrentStocks } from "@/lib/stock";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";
import { materialSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit";
import type { MaterialWithStock } from "@/types";

export async function GET(req: Request) {
  try {
    await requireRole(["ADMIN", "SUPERVISOR", "OPERATOR"]);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const categoryId = searchParams.get("categoryId");
    const q = searchParams.get("q");

    const where: Record<string, unknown> = {};
    if (status === "ALL") {
      // no status filter
    } else if (status) {
      where.status = status;
    } else {
      where.status = { not: "ARCHIVED" };
    }
    if (categoryId) where.categoryId = categoryId;
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { colourName: { contains: q } },
      ];
    }

    const materials = await prisma.material.findMany({
      where,
      include: { category: true },
      orderBy: { name: "asc" },
    });
    const stocks = await getAllCurrentStocks(materials.map((m) => m.id));

    const result: MaterialWithStock[] = materials.map((m) => ({ ...m, currentStock: stocks.get(m.id) ?? 0 }));
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireRole(["ADMIN", "SUPERVISOR"]);
    const body = await req.json();
    const data = materialSchema.parse(body);

    const material = await prisma.material.create({ data });
    await writeAuditLog({
      entityType: "Material",
      entityId: material.id,
      action: "CREATE",
      newValue: material,
      userId: user.userId,
    });

    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
