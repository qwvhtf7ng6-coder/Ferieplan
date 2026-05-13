import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import CalendarGrid from "@/components/CalendarGrid";
import { isManager } from "@/lib/permissions";
import { getCalendarVisibility } from "@/lib/settings";
import type { SessionUser } from "@/types";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;

  const visibility = await getCalendarVisibility();
  if (!isManager(user.role) && visibility === "MANAGEMENT_ONLY") {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const now = new Date();
  const year  = parseInt(sp.year  ?? String(now.getFullYear()));
  const month = parseInt(sp.month ?? String(now.getMonth() + 1));

  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month,     0, 23, 59, 59);

  const isManagerOrAdmin = isManager(user.role);

  const [departments, requests, holidays] = await Promise.all([
    prisma.department.findMany({
      orderBy: { name: "asc" },
      include: {
        users: {
          where: { departmentId: { not: null } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        },
      },
    }),
    prisma.vacationRequest.findMany({
      where: {
        status: { in: isManagerOrAdmin ? ["APPROVED", "PENDING"] : ["APPROVED"] },
        entries: { some: { date: { gte: start, lte: end } } },
      },
      include: {
        entries: {
          where: { date: { gte: start, lte: end } },
          orderBy: { date: "asc" },
        },
        user: { select: { id: true, name: true } },
      },
    }),
    prisma.holiday.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: "asc" },
    }),
  ]);

  type DeptRow = typeof departments[0];
  type ReqRow  = typeof requests[0];
  type HolRow  = typeof holidays[0];

  const serializedDepts = departments.map((d: DeptRow) => ({
    id: d.id,
    name: d.name,
    maxConcurrent: d.maxConcurrent,
    users: d.users,
  }));

  const serializedRequests = requests.map((r: ReqRow) => ({
    id: r.id,
    status: r.status as "APPROVED" | "PENDING",
    note: r.note,
    user: r.user,
    entries: r.entries.map((e: ReqRow["entries"][0]) => ({
      date: e.date.toISOString(),
      type: e.type as string,
      absenceType: (e as any).absenceType as string ?? "VACATION",
      days: e.days,
    })),
  }));

  const serializedHolidays = holidays.map((h: HolRow) => ({
    id: h.id,
    name: h.name,
    date: h.date.toISOString(),
    isNational: h.isNational,
  }));

  return (
    <div className="flex flex-col h-full">
      <Nav role={user.role} name={user.name ?? ""} calendarVisible={true} />
      <main className="flex-1 overflow-hidden p-4">
        <CalendarGrid
          year={year}
          month={month}
          departments={serializedDepts}
          requests={serializedRequests}
          holidays={serializedHolidays}
          currentUserId={user.id}
          currentUserDeptId={user.departmentId}
          isManagerOrAdmin={isManagerOrAdmin}
        />
      </main>
    </div>
  );
}
