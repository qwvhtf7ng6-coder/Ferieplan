import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { isManager, isAdmin } from "@/lib/permissions";
import { canSeeCalendar } from "@/lib/settings";
import ShiftsClient from "./ShiftsClient";
import type { SessionUser } from "@/types";

export default async function ManagerShiftsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  if (!isManager(user.role)) redirect("/dashboard");

  const calendarVisible = await canSeeCalendar(user.role);

  const [departments, employees] = await Promise.all([
    isAdmin(user.role)
      ? prisma.department.findMany({ orderBy: { name: "asc" } })
      : prisma.department.findMany({
          where: { id: user.departmentId ?? "" },
          orderBy: { name: "asc" },
        }),
    isAdmin(user.role)
      ? prisma.user.findMany({
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
    <div>
      <Nav role={user.role} name={user.name ?? ""} calendarVisible={calendarVisible} />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <ShiftsClient
          departments={departments}
          employees={employees}
          isAdmin={isAdmin(user.role)}
          managerDepartmentId={user.departmentId ?? null}
        />
      </main>
    </div>
  );
}
