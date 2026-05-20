import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
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

  // Tjek om brugeren overhovedet må se vagtplan
  const shiftsVisible = await canSeeShifts(user.role, user.departmentId, user.canManageShifts);
  if (!shiftsVisible) redirect("/dashboard");

  // Read-only hvis brugeren ikke må redigere vagtskabeloner
  const readOnly = !can(subject, "shift.edit_templates");

  // ALL-scope = se på tværs, OWN_DEPARTMENT eller NONE = kun egen afdeling
  const assignScope = scopeOf(subject, "shift.assign");
  const seeAllDepartments = assignScope === "ALL";

  const [departments, employees] = await Promise.all([
    seeAllDepartments
      ? prisma.department.findMany({ where: { shiftsEnabled: true }, orderBy: { name: "asc" } })
      : prisma.department.findMany({
          where: { id: user.departmentId ?? "", shiftsEnabled: true },
          orderBy: { name: "asc" },
        }),
    seeAllDepartments
      ? prisma.user.findMany({
          where: { department: { shiftsEnabled: true } },
          select: { id: true, name: true, departmentId: true, department: { select: { name: true } } },
          orderBy: { name: "asc" },
        })
      : prisma.user.findMany({
          where: { departmentId: user.departmentId ?? "" },
          select: { id: true, name: true, departmentId: true, department: { select: { name: true } } },
          orderBy: { name: "asc" },
        }),
  ]);

  return (
    <AppShell>
      <div className="no-print">
        <Nav role={user.role} name={user.name ?? ""} shiftsVisible={shiftsVisible} />
      </div>
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
