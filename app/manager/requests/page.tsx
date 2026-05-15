import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { RequestFilters } from "@/components/manager/RequestFilters";
import { ManagerRequestsClient } from "./ManagerRequestsClient";
import { getManagerRequests } from "@/actions/manager";
import { isManager, isAdmin } from "@/lib/permissions";
import { canSeeShifts } from "@/lib/settings";
import type { SessionUser } from "@/types";

export default async function ManagerRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    month?: string;
    year?: string;
    departmentId?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  if (!isManager(user.role)) redirect("/dashboard");

  const shiftsVisible = await canSeeShifts(user.role, user.departmentId);

  const sp = await searchParams;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const [departments, result, todayAbsences, totalInDept] = await Promise.all([
    isAdmin(user.role)
      ? prisma.department.findMany({ orderBy: { name: "asc" } })
      : [],
    getManagerRequests({
      status: sp.status,
      month: sp.month ? parseInt(sp.month) : undefined,
      year: sp.year ? parseInt(sp.year) : undefined,
      departmentId: sp.departmentId,
    }),
    // Who is absent today
    prisma.vacationRequest.findMany({
      where: {
        status: "APPROVED",
        ...(isAdmin(user.role) ? {} : { departmentId: user.departmentId ?? "" }),
        entries: { some: { date: { gte: today, lte: todayEnd } } },
      },
      include: {
        user: { select: { id: true, name: true } },
        department: { select: { name: true } },
        entries: { where: { date: { gte: today, lte: todayEnd } } },
      },
    }),
    // Total employees in dept
    prisma.user.count({
      where: isAdmin(user.role)
        ? { departmentId: { not: null } }
        : { departmentId: user.departmentId ?? "" },
    }),
  ]);

  const requests = result.ok ? result.data ?? [] : [];
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const absentCount = todayAbsences.length;
  const presentCount = Math.max(0, totalInDept - absentCount);

  return (
    <div>
      <Nav role={user.role} name={user.name ?? ""} calendarVisible={true} shiftsVisible={shiftsVisible} />
      <main className="max-w-5xl mx-auto px-4 py-8">

        {/* Today widget */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">
              I dag — {today.toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1.5 text-green-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                {presentCount} til stede
              </span>
              <span className="flex items-center gap-1.5 text-orange-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                {absentCount} fraværende
              </span>
            </div>
          </div>

          {absentCount === 0 ? (
            <p className="text-sm text-gray-400 italic">Ingen godkendte fraværsansøgninger i dag.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {todayAbsences.map((req: any) => {
                const entry = req.entries[0];
                const absLabels: Record<string, string> = {
                  VACATION: "Ferie", VACATION_FREE: "Feriefri", MATERNITY: "Barsel",
                  CHILD_SICK_DAY: "Barns 1. sygedag", SICK: "Sygdom",
                };
                const label = entry ? (absLabels[(entry as any).absenceType] ?? "Fravær") : "Fravær";
                return (
                  <div key={req.id} className="flex items-center gap-1.5 bg-orange-50 border border-orange-100 rounded-lg px-2.5 py-1 text-xs">
                    <span className="font-medium text-gray-800">{req.user.name}</span>
                    {isAdmin(user.role) && (
                      <span className="text-gray-400">· {req.department.name}</span>
                    )}
                    <span className="text-orange-600">{label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ansøgninger</h1>
            <p className="text-sm text-gray-500 mt-1">
              {requests.length} ansøgning{requests.length !== 1 ? "er" : ""}
              {pendingCount > 0 && (
                <span className="ml-2 text-yellow-700 font-medium">
                  · {pendingCount} afventer
                </span>
              )}
            </p>
          </div>
          <Link
            href="/manager/requests/new"
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            + Opret på vegne af
          </Link>
        </div>

        <RequestFilters
          departments={departments}
          showDeptFilter={isAdmin(user.role)}
        />

        <ManagerRequestsClient requests={requests} />
      </main>
    </div>
  );
}
