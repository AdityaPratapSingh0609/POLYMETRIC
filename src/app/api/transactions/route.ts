import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { apiError, handleApiError } from "@/lib/api-utils";
import { createTransactionSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit";

// Which roles may create which transaction type. Day-to-day floor entries
// (usage/wastage/return) are open to Operators; anything touching vendors,
// signed corrections, transfers, or the one-time opening balance is reserved
// for Supervisor/Admin so there's a layer of oversight on those.
const TYPE_PERMISSIONS: Record<string, Array<"ADMIN" | "SUPERVISOR" | "OPERATOR">> = {
  USAGE: ["ADMIN", "SUPERVISOR", "OPERATOR"],
  WASTAGE: ["ADMIN", "SUPERVISOR", "OPERATOR"],
  RETURN: ["ADMIN", "SUPERVISOR", "OPERATOR"],
  PURCHASE: ["ADMIN", "SUPERVISOR"],
  ADJUSTMENT: ["ADMIN", "SUPERVISOR"],
  TRANSFER: ["ADMIN", "SUPERVISOR"],
  OPENING: ["ADMIN"],
};

export async function GET(req: Request) {
  try {
    await requireRole(["ADMIN", "SUPERVISOR", "OPERATOR"]);
    const { searchParams } = new URL(req.url);

    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const materialId = searchParams.get("materialId");
    const categoryId = searchParams.get("categoryId");
    const type = searchParams.get("type");
    const shiftId = searchParams.get("shiftId");
    const batchNumber = searchParams.get("batchNumber");
    const q = searchParams.get("q");
    const all = searchParams.get("all");

    const where: Record<string, unknown> = {};
    if (dateFrom || dateTo) {
      where.date = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }
    if (materialId) where.materialId = materialId;
    if (type) where.type = type;
    if (shiftId) where.shiftId = shiftId;
    if (batchNumber) where.batchNumber = { contains: batchNumber };
    if (categoryId) where.material = { categoryId };
    if (q) {
      where.OR = [
        { notes: { contains: q } },
        { vendor: { contains: q } },
        { invoiceNumber: { contains: q } },
        { batchNumber: { contains: q } },
        { material: { name: { contains: q } } },
      ];
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { material: true, shift: true, reason: true, createdBy: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: all ? undefined : 300,
    });

    return NextResponse.json(transactions);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireRole(["ADMIN", "SUPERVISOR", "OPERATOR"]);
    const body = await req.json();
    const data = createTransactionSchema.parse(body);

    const allowedRoles = TYPE_PERMISSIONS[data.type] ?? [];
    if (!allowedRoles.includes(user.role)) {
      return apiError(`Your role (${user.role}) can't record ${data.type.toLowerCase()} entries.`, 403);
    }

    const material = await prisma.material.findUnique({ where: { id: data.materialId } });
    if (!material) return apiError("Material not found.", 404);
    if (material.status === "ARCHIVED") {
      return apiError("This material is archived and can't receive new transactions.", 400);
    }

    const transaction = await prisma.transaction.create({
      data: {
        date: new Date(data.date),
        type: data.type,
        materialId: data.materialId,
        quantity: data.quantity,
        shiftId: data.shiftId || null,
        reasonId: data.reasonId || null,
        vendor: data.vendor || null,
        invoiceNumber: data.invoiceNumber || null,
        batchNumber: data.batchNumber || null,
        destination: data.destination || null,
        notes: data.notes || null,
        createdById: user.userId,
      },
      include: { material: true, shift: true, reason: true, createdBy: true },
    });

    await writeAuditLog({
      entityType: "Transaction",
      entityId: transaction.id,
      action: "CREATE",
      newValue: transaction,
      userId: user.userId,
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
