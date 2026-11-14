import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";
import { categorySchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    await requireRole(["ADMIN", "SUPERVISOR", "OPERATOR"]);
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(categories);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireRole(["ADMIN", "SUPERVISOR"]);
    const body = await req.json();
    const data = categorySchema.parse(body);
    const category = await prisma.category.create({ data });
    await writeAuditLog({ entityType: "Category", entityId: category.id, action: "CREATE", newValue: category, userId: user.userId });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
