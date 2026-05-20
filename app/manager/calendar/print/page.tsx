import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { can, buildSubject } from "@/lib/can";
import { getCalendarVisibility } from "@/lib/settings";
import PrintCalendarClient from "./PrintCalendarClient";
import type { SessionUser } from "@/types";

export default async function PrintCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    year?: string;
    month?: string;
    scope?: string; // "all" | "dept" | "me" | deptId
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const subject = buildSubject(user);

  const visibility = await getCalendarVisibility();
  const hasApprovalRole = can(subject, "approval.decide");
  const hasExtendedCalendar = can(subject, "calendar.view_extended");
  const canSeeOthers = hasApprovalRole || hasExtendedCalendar || visibility === "ALL_EMPLOYEES";

  // Hvis MANAGEMENT_ONLY og brugeren ikke har udvidede rettigheder — afvis
  if (!canSeeOthers) {
    redirect("/dashboard");
  }

  if (!can(subject, "calendar.print")) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const now = new Date();
  const year  = parseInt(sp.year  ?? String(now.getFullYear()));
  const month = parseInt(sp.month ?? String(now.getMonth() + 1));
  const scope = sp.scope ?? "all";

  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 0, 23, 59, 59);

  const isManagerOrAdmin = hasApprovalRole;

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
        department: { select: { id: true, name: true } },
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
    status: r.status as string,
    note: r.note,
    user: r.user,
    departmentId: r.departmentId,
    department: r.department,
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
    <PrintCalendarClient
      year={year}
      month={month}
      scope={scope}
      departments={serializedDepts}
      requests={serializedRequests}
      holidays={serializedHolidays}
      currentUserId={user.id}
      currentUserDeptId={user.departmentId ?? null}
      currentUserName={user.name ?? ""}
      isManagerOrAdmin={isManagerOrAdmin}
    />
  );
}
