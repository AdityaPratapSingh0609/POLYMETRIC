import { prisma } from "./prisma";

export type AuditAction = "CREATE" | "UPDATE" | "ARCHIVE" | "RESTORE" | "DELETE";

export async function writeAuditLog(params: {
  entityType: string;
  entityId: string;
  action: AuditAction;
  oldValue?: unknown;
  newValue?: unknown;
  userId?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      oldValue: params.oldValue !== undefined ? JSON.stringify(params.oldValue) : null,
      newValue: params.newValue !== undefined ? JSON.stringify(params.newValue) : null,
      userId: params.userId ?? null,
    },
  });
}
