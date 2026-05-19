import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { AppShell } from "@/components/AppShell";
import { isAdmin, canEditShifts } from "@/lib/permissions";
import { canSeeCalendar, canSeeShifts } from "@/lib/settings";
import ShiftsClient from "./ShiftsClient";
import type { SessionUser } from "@/types";

export default async function ManagerShiftsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;

  // Tjek om brugeren overhovedet må se vagtplan
  const shiftsVisible = await canSeeShifts(user.role, user.departmentId, user.canManageShifts);
  if (!shiftsVisible) redirect("/dashboard");

  // Employees og canManageShifts-brugere uden manager-rolle får read-only visning
  const readOnly = !canEditShifts(user.role, user.canManageShifts);

  const [calendarVisible, departments, employees] = await Promise.all([
    canSeeCalendar(user.role),
    isAdmin(user.role)
      ? prisma.department.findMany({ where: { shiftsEnabled: true }, orderBy: { name: "asc" } })
      : prisma.department.findMany({
          where: { id: user.departmentId ?? "", shiftsEnabled: true },
          orderBy: { name: "asc" },
        }),
    isAdmin(user.role)
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
        <Nav role={user.role} name={user.name ?? ""} calendarVisible={calendarVisible} shiftsVisible={shiftsVisible} />
      </div>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <ShiftsClient
          departments={departments}
          employees={employees}
          isAdmin={isAdmin(user.role)}
          managerDepartmentId={user.departmentId ?? null}
          readOnly={readOnly}
        />
      </main>
    </AppShell>
  );
}
