import { prisma } from "@/lib/prisma";

export async function createAuditLog({
  userId,
  requestId,
  action,
  details,
}: {
  userId: string;
  requestId?: string;
  action: string;
  details?: string;
}) {
  await prisma.auditLog.create({
    data: { userId, requestId, action, details },
  });
}
