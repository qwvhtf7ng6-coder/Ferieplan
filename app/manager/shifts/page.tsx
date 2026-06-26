import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { can, buildSubject, scopeOf } from "@/lib/can";
import { canSeeShifts } from "@/lib/settings";
import ShiftsClient from "./ShiftsClient";
import type { SessionUser } from "@/types";

export default async function ManagerShiftsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const subject = buildSubject(user);

  const orgId = (user as any).organizationId as string;

  // Tjek om brugeren overhovedet må se vagtplan
  const shiftsVisible = await canSeeShifts(user.role, user.departmentId, user.canManageShifts);
  if (!shiftsVisible) redirect("/dashboard");

  const readOnly = !can(subject, "shift.edit_templates");
  const assignScope = scopeOf(subject, "shift.assign");
  const seeAllDepartments = assignScope === "ALL";

  const [departments, employees] = await Promise.all([
    seeAllDepartments
      ? prisma.department.findMany({ where: { organizationId: orgId, shiftsEnabled: true }, orderBy: { name: "asc" } })
      : prisma.department.findMany({
          where: { organizationId: orgId, id: user.departmentId ?? "", shiftsEnabled: true },
          orderBy: { name: "asc" },
        }),
    seeAllDepartments
      ? prisma.user.findMany({
          where: { organizationId: orgId, department: { shiftsEnabled: true } },
          select: { id: true, name: true, departmentId: true, department: { select: { name: true } } },
          orderBy: { name: "asc" },
        })
      : prisma.user.findMany({
          where: { organizationId: orgId, departmentId: user.departmentId ?? "" },
          select: { id: true, name: true, departmentId: true, department: { select: { name: true } } },
          orderBy: { name: "asc" },
        }),
  ]);

  return (
    <AppShell>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <ShiftsClient
          departments={departments}
          employees={employees}
          isAdmin={seeAllDepartments}
          managerDepartmentId={user.departmentId ?? null}
          readOnly={readOnly}
        />
      </main>
    </AppShell>
  );
}
