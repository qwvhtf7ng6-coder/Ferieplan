/**
 * Sidste-admin-beskyttelse.
 *
 * Scoped til en specifik org — hver org skal have mindst én ADMIN.
 */

import { prisma } from "@/lib/prisma";

export async function countAdmins(organizationId: string): Promise<number> {
  return prisma.user.count({ where: { role: "ADMIN", organizationId } });
}

export async function wouldRemoveLastAdminByDelete(
  target: { role: string; organizationId: string | null }
): Promise<boolean> {
  if (target.role !== "ADMIN" || !target.organizationId) return false;
  const count = await countAdmins(target.organizationId);
  return count <= 1;
}

export async function wouldRemoveLastAdminByRoleChange(
  target: { role: string; organizationId: string | null },
  newRole: string,
): Promise<boolean> {
  if (target.role !== "ADMIN" || !target.organizationId) return false;
  if (newRole === "ADMIN") return false;
  const count = await countAdmins(target.organizationId);
  return count <= 1;
}
