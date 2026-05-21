/**
 * Sidste-admin-beskyttelse.
 *
 * Systemet kræver mindst én ADMIN-bruger for at være administrerbart.
 * Hvis den sidste admin slettes eller degraderes, kan ingen længere
 * tildele tilladelser, oprette brugere, eller rette systemindstillinger —
 * systemet er reelt låst.
 *
 * Disse helpers tilkaldes fra API-routes der kunne ændre admin-status:
 *   - DELETE /api/users/[id]
 *   - PATCH  /api/users/[id]  (når role-feltet ændres)
 *
 * Helperne svarer på spørgsmålet "ville denne ændring efterlade 0 admins?".
 * Hvis ja, returnerer route'en en 400-fejl med en meningsfuld besked.
 *
 * NB: Tjekket er ikke transaktionsbeskyttet. I et hypotetisk race-scenario
 * hvor to admins simultant sletter/degraderer hinanden kunne begge slippe
 * igennem fordi de hver især ser to admins. For den faktiske admin-flow
 * (én admin ad gangen klikker i UI'et) er det ikke et problem. En stærkere
 * løsning ville være en database-trigger eller SELECT FOR UPDATE.
 */

import { prisma } from "@/lib/prisma";

/** Antal brugere med role = ADMIN i DB. */
export async function countAdmins(): Promise<number> {
  return prisma.user.count({ where: { role: "ADMIN" } });
}

/**
 * Tjekker om sletning af given bruger ville efterlade systemet uden admins.
 *
 * Returnerer true KUN hvis target.role === "ADMIN" og det er den sidste admin.
 * Returnerer false for alle andre tilfælde (target er ikke admin, eller der
 * er flere admins tilbage).
 */
export async function wouldRemoveLastAdminByDelete(target: { role: string }): Promise<boolean> {
  if (target.role !== "ADMIN") return false;
  const count = await countAdmins();
  return count <= 1;
}

/**
 * Tjekker om en rolle-ændring fra ADMIN til noget andet ville efterlade
 * systemet uden admins.
 *
 * Returnerer true KUN hvis target nuværende rolle er ADMIN, ny rolle ikke er
 * ADMIN, og det er den sidste admin.
 */
export async function wouldRemoveLastAdminByRoleChange(
  target: { role: string },
  newRole: string,
): Promise<boolean> {
  if (target.role !== "ADMIN") return false;
  if (newRole === "ADMIN") return false;
  const count = await countAdmins();
  return count <= 1;
}
