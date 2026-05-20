import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { AppShell } from "@/components/AppShell";
import { RequestList } from "@/components/RequestList";
import { getMyRequests } from "@/actions/requests";
import { canSeeShifts, isVacationBalanceEnabled } from "@/lib/settings";
import { PageHeader } from "@/components/ui/PageHeader";
import { Btn } from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import { Plus, Clock, CheckCircle, CalendarDays, TrendingUp } from "lucide-react";
import { getMyVacationBalance } from "@/actions/vacation-balance";
import type { SessionUser } from "@/types";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;

  const [result, shiftsVisible, balanceResult, balanceFeatureEnabled] = await Promise.all([
    getMyRequests(),
    canSeeShifts(user.role, user.departmentId, user.canManageShifts),
    getMyVacationBalance(),
    isVacationBalanceEnabled(),
  ]);

  const requests = result.ok ? result.data ?? [] : [];
  const totalCount   = requests.length;
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;
  const approvedDays = requests.reduce(
    (sum, r) => r.status === "APPROVED" ? sum + r.entries.reduce((s, e) => s + e.days, 0) : sum,
    0,
  );

  const balance = balanceResult.ok && balanceFeatureEnabled ? balanceResult.data : null;

  const stats = [
    { label: "I alt",           value: totalCount,    icon: <CalendarDays size={18} />, color: "#4f46e5", bg: "rgba(79,70,229,.1)" },
    { label: "Afventer",        value: pendingCount,  icon: <Clock size={18} />,        color: "#d97706", bg: "rgba(217,119,6,.1)" },
    { label: "Godkendt",        value: approvedCount, icon: <CheckCircle size={18} />,  color: "#059669", bg: "rgba(5,150,105,.1)" },
    { label: "Godkendte dage",  value: approvedDays,  icon: <TrendingUp size={18} />,   color: "#7c3aed", bg: "rgba(124,58,237,.1)" },
  ];

  return (
    <AppShell>
      <Nav role={user.role} name={user.name ?? ""} shiftsVisible={shiftsVisible} />
      <main className="max-w-[860px] mx-auto px-4 sm:px-9 py-6 sm:py-8">
        <PageHeader
          title="Mine ansøgninger"
          subtitle={`${user.name} · ${totalCount} ansøgning${totalCount !== 1 ? "er" : ""}`}
          actions={
            <Link href="/requests/new">
              <Btn icon={<Plus size={14} />} size="sm">Ny ansøgning</Btn>
            </Link>
          }
        />

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {stats.map((s) => (
            <Card key={s.label} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="w-[38px] h-[38px] rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: s.bg, color: s.color }}>
                  {s.icon}
                </div>
              </div>
              <p className="text-[28px] font-extrabold tracking-[-0.03em] leading-none" style={{ color: s.color }}>
                {s.value}
              </p>
              <p className="text-[12px] font-semibold text-text-muted mt-1">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Vacation balance widget */}
        {balance && (
          <Card className="p-4 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold text-text-subtle uppercase tracking-widest mb-1">
                  Feriesaldo {balance.year}
                </p>
                <div className="flex items-baseline gap-3">
                  <span className="text-[28px] font-extrabold tracking-[-0.03em] leading-none"
                    style={{ color: balance.remainingDays < 0 ? "var(--c-danger)" : balance.remainingDays <= 5 ? "var(--c-warning)" : "var(--c-success)" }}>
                    {balance.remainingDays}
                  </span>
                  <span className="text-[13px] text-text-muted font-medium">dage tilbage</span>
                </div>
                {balance.note && (
                  <p className="text-[11px] text-text-subtle mt-1 italic">{balance.note}</p>
                )}
              </div>
              <div className="flex gap-5 shrink-0">
                <div className="text-right">
                  <p className="text-[11px] font-semibold text-text-subtle uppercase tracking-wide">Tildelt</p>
                  <p className="text-[18px] font-extrabold text-text">{balance.allottedDays}</p>
                  {balance.carryOverDays > 0 && (
                    <p className="text-[10px] text-text-subtle">inkl. {balance.carryOverDays} overførte</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold text-text-subtle uppercase tracking-wide">Brugt</p>
                  <p className="text-[18px] font-extrabold text-text">{balance.usedDays}</p>
                </div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-3">
              <div className="h-2 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${balance.allottedDays > 0 ? Math.min(100, (balance.usedDays / balance.allottedDays) * 100) : 0}%`,
                    background: balance.remainingDays < 0 ? "var(--c-danger)" : balance.remainingDays <= 5 ? "var(--c-warning)" : "var(--c-success)",
                  }}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Request list */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-[17px] font-extrabold tracking-[-0.02em] text-text">
            Alle ansøgninger
            <span className="ml-2 text-[13px] font-semibold text-text-subtle">{totalCount}</span>
          </p>
        </div>
        <RequestList
          requests={requests}
          showCancelButton
          emptyMessage="Du har ingen ansøgninger endnu."
        />
      </main>
    </AppShell>
  );
}
