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
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId,
      requestId: requestId ?? null,
      action,
      details: details ?? null,
    },
  });
}
