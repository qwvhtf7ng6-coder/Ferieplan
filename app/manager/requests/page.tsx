import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RequestFilters } from "@/components/manager/RequestFilters";
import { ManagerRequestsClient } from "./ManagerRequestsClient";
import { getManagerRequests } from "@/actions/manager";
import { can, buildSubject, scopeOf } from "@/lib/can";
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
  const subject = buildSubject(user);
  if (!can(subject, "application.view_others")) redirect("/dashboard");

  // ALL-scope = se på tværs af afdelinger. OWN_DEPARTMENT = kun egen.
  const viewScope = scopeOf(subject, "application.view_others");
  const seeAllDepartments = viewScope === "ALL";

  // Må brugeren oprette ansøgning på vegne af andre? (skjul knappen ellers)
  const canCreateOnBehalf = can(subject, "application.create_on_behalf");

  const sp = await searchParams;
  const orgId = (user as any).organizationId as string;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const [departments, result, todayAbsences, totalInDept] = await Promise.all([
    seeAllDepartments
      ? prisma.department.findMany({ where: { organizationId: orgId }, orderBy: { name: "asc" } })
      : [],
    getManagerRequests({
      status: sp.status,
      month: sp.month ? parseInt(sp.month) : undefined,
      year: sp.year ? parseInt(sp.year) : undefined,
      departmentId: sp.departmentId,
    }),
    prisma.vacationRequest.findMany({
      where: {
        organizationId: orgId,
        status: "APPROVED",
        ...(seeAllDepartments ? {} : { departmentId: user.departmentId ?? "" }),
        entries: { some: { date: { gte: today, lte: todayEnd } } },
      },
      include: {
        user: { select: { id: true, name: true } },
        department: { select: { name: true } },
        entries: { where: { date: { gte: today, lte: todayEnd } } },
      },
    }),
    prisma.user.count({
      where: seeAllDepartments
        ? { organizationId: orgId, departmentId: { not: null } }
        : { organizationId: orgId, departmentId: user.departmentId ?? "" },
    }),
  ]);

  const requests = result.ok ? result.data ?? [] : [];
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const absentCount = todayAbsences.length;
  const presentCount = Math.max(0, totalInDept - absentCount);

  return (
    <AppShell>
      <main className="max-w-[1100px] mx-auto px-4 sm:px-9 py-6 sm:py-8">

        {/* Today widget */}
        <div className="bg-surface border border-border rounded-lg shadow-xs p-4 mb-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <p className="text-[13px] font-semibold text-text">
              I dag — {today.toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: "var(--c-success)" }}>
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: "var(--c-success)" }} />
                {presentCount} til stede
              </span>
              <span className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: "var(--c-warning)" }}>
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: "var(--c-warning)" }} />
                {absentCount} fraværende
              </span>
            </div>
          </div>
          {absentCount === 0 ? (
            <p className="text-[12px] text-text-subtle italic">Ingen godkendte fraværsansøgninger i dag.</p>
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
                  <div key={req.id} className="flex items-center gap-1.5 bg-warning-bg border border-[rgba(217,119,6,.2)] rounded-md px-2.5 py-1 text-[12px]">
                    <span className="font-semibold text-text">{req.user.name}</span>
                    {seeAllDepartments && <span className="text-text-subtle">· {req.department.name}</span>}
                    <span className="text-warning-text font-medium">{label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-5 gap-4">
          <div>
            <h1 className="text-[22px] font-extrabold tracking-[-0.025em] text-text">Ansøgninger</h1>
            <p className="text-[13px] text-text-muted mt-0.5">
              {requests.length} ansøgning{requests.length !== 1 ? "er" : ""}
              {pendingCount > 0 && (
                <span className="ml-2 font-semibold text-warning">· {pendingCount} afventer</span>
              )}
            </p>
          </div>
          {canCreateOnBehalf && (
            <Link
              href="/manager/requests/new"
              className="inline-flex items-center gap-1.5 h-[38px] px-4 rounded-md text-[13px] font-semibold bg-primary text-white hover:bg-primary-hover transition-colors shadow-[0_1px_4px_rgba(79,70,229,.35)] shrink-0"
            >
              + Opret på vegne af
            </Link>
          )}
        </div>

        <RequestFilters
          departments={departments}
          showDeptFilter={seeAllDepartments}
        />

        <ManagerRequestsClient requests={requests} />
      </main>
    </AppShell>
  );
}
