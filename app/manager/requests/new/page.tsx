import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { OnBehalfForm } from "./OnBehalfForm";
import { isManager, isAdmin } from "@/lib/permissions";
import { canSeeCalendar, canSeeShifts } from "@/lib/settings";
import type { SessionUser } from "@/types";

export default async function NewRequestOnBehalfPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  if (!isManager(user.role)) redirect("/dashboard");

  const [calendarVisible, shiftsVisible] = await Promise.all([
    canSeeCalendar(user.role),
    canSeeShifts(user.role, user.departmentId),
  ]);

  const employees = await prisma.user.findMany({
    where: isAdmin(user.role)
      ? { departmentId: { not: null } }
      : { departmentId: user.departmentId ?? "" },
    select: {
      id: true,
      name: true,
      departmentId: true,
      department: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <Nav role={user.role} name={user.name ?? ""} calendarVisible={calendarVisible} shiftsVisible={shiftsVisible} />
      <main className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Opret på vegne af</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Ansøgningen oprettes direkte som godkendt — nyttigt ved sygdom, barsel eller bagudregistrering.
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <OnBehalfForm employees={employees} />
        </div>
      </main>
    </div>
  );
}
