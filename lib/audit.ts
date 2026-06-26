import { prisma } from "@/lib/prisma";

export async function createAuditLog({
  organizationId,
  userId,
  requestId,
  action,
  details,
}: {
  organizationId: string;
  userId: string;
  requestId?: string;
  action: string;
  details?: string;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      organizationId,
      userId,
      requestId: requestId ?? null,
      action,
      details: details ?? null,
    },
  });
}
