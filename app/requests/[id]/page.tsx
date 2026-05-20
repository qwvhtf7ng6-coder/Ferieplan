import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Nav from "@/components/Nav";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { formatDate, ENTRY_TYPE_LABELS, ABSENCE_TYPE_LABELS, ABSENCE_TYPE_COLORS, totalDaysFromEntries } from "@/lib/utils";
import { canSeeShifts } from "@/lib/settings";
import { can, buildSubject } from "@/lib/can";
import { RequestTimeline } from "@/components/RequestTimeline";
import type { SessionUser } from "@/types";

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const subject = buildSubject(user);

  const [{ id }, shiftsVisible] = await Promise.all([
    params,
    canSeeShifts(user.role, user.departmentId, user.canManageShifts),
  ]);

  const request = await prisma.vacationRequest.findUnique({
    where: { id },
    include: {
      entries: { orderBy: { date: "asc" } },
      user: { select: { id: true, name: true, email: true } },
      department: { select: { id: true, name: true, maxConcurrent: true } },
      auditLogs: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!request) notFound();

  // Adgangskontrol:
  //  - Egne ansøgninger må altid ses
  //  - Andres ansøgninger kræver application.view_others-scope der dækker afdelingen
  const isOwnRequest = request.userId === user.id;
  const canView =
    isOwnRequest ||
    can(subject, "application.view_others", {
      targetDepartmentId: request.departmentId,
    });

  if (!canView) redirect("/dashboard");

  const totalDays = totalDaysFromEntries(request.entries.map((e: { days: number }) => ({ days: e.days })));

  return (
    <AppShell>
      <Nav role={user.role} name={user.name ?? ""} shiftsVisible={shiftsVisible} />
      <main className="max-w-[860px] mx-auto px-4 sm:px-9 py-6 sm:py-8">
        <PageHeader
          title="Ansøgning"
          actions={<StatusBadge status={request.status} />}
        />

        <div className="space-y-4">
          {/* Info card */}
          <Card className="p-5">
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div>
                <p className="text-[11px] font-bold text-text-subtle uppercase tracking-wide mb-0.5">Medarbejder</p>
                <p className="font-semibold text-text">{request.user.name}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-text-subtle uppercase tracking-wide mb-0.5">Afdeling</p>
                <p className="font-semibold text-text">{request.department.name}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-text-subtle uppercase tracking-wide mb-0.5">Oprettet</p>
                <p className="text-text-muted">{formatDate(request.createdAt)}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-text-subtle uppercase tracking-wide mb-0.5">Dage i alt</p>
                <p className="font-semibold text-text">{totalDays} dag{totalDays !== 1 ? "e" : ""}</p>
              </div>
            </div>

            {request.note && (
              <div className="pt-3 mt-3 border-t border-border">
                <p className="text-[11px] font-bold text-text-subtle uppercase tracking-wide mb-1">Note</p>
                <p className="text-[13px] text-text-muted italic">"{request.note}"</p>
              </div>
            )}

            {request.status === "REJECTED" && (request as any).rejectionReason && (
              <div className="pt-3 mt-3 border-t border-border">
                <p className="text-[11px] font-bold uppercase tracking-wide mb-1 text-danger">Begrundelse for afvisning</p>
                <div className="bg-danger-bg border border-[rgba(220,38,38,.2)] rounded-lg px-3 py-2">
                  <p className="text-[13px] text-danger-text italic">"{(request as any).rejectionReason}"</p>
                </div>
              </div>
            )}
          </Card>

          {/* Entries card */}
          <Card className="p-5">
            <SectionLabel>Datolinjer ({request.entries.length})</SectionLabel>
            <div className="space-y-1">
              {request.entries.map((entry: { id: string; date: Date; type: string; absenceType: string; days: number }) => {
                const absColor = ABSENCE_TYPE_COLORS[entry.absenceType];
                return (
                  <div key={entry.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-[13px]">
                    <span className="text-text">{formatDate(entry.date)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ backgroundColor: absColor?.bg ?? "var(--c-bg)", color: absColor?.text ?? "var(--c-text-muted)" }}>
                        {ABSENCE_TYPE_LABELS[entry.absenceType] ?? entry.absenceType}
                      </span>
                      <span className="text-[11px] text-text-subtle">{ENTRY_TYPE_LABELS[entry.type] ?? entry.type}</span>
                      <span className="text-[11px] text-text-muted font-semibold">{entry.days} dag{entry.days !== 1 ? "e" : ""}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Timeline */}
          <RequestTimeline logs={request.auditLogs} />
        </div>
      </main>
    </AppShell>
  );
}
