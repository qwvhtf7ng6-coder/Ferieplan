import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { AppShell } from "@/components/AppShell";
import { RequestForm } from "@/components/RequestForm";
import { canSeeCalendar, canSeeShifts } from "@/lib/settings";
import { PageHeader } from "@/components/ui/PageHeader";
import { Btn } from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import { AlertTriangle } from "lucide-react";
import type { SessionUser } from "@/types";

export default async function NewRequestPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;

  const [calendarVisible, shiftsVisible] = await Promise.all([
    canSeeCalendar(user.role),
    canSeeShifts(user.role, user.departmentId, user.canManageShifts),
  ]);

  if (!user.departmentId) {
    return (
      <AppShell>
        <Nav role={user.role} name={user.name ?? ""} calendarVisible={calendarVisible} shiftsVisible={shiftsVisible} />
        <main className="max-w-[860px] mx-auto px-4 sm:px-9 py-6 sm:py-8">
          <Card className="p-8 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: "var(--c-warning-bg)", color: "var(--c-warning)" }}>
              <AlertTriangle size={22} />
            </div>
            <p className="text-[15px] font-bold text-text">Du er ikke tilknyttet en afdeling</p>
            <p className="text-[13px] text-text-muted mt-1">Kontakt en administrator for at blive tilknyttet en afdeling.</p>
          </Card>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Nav role={user.role} name={user.name ?? ""} calendarVisible={calendarVisible} shiftsVisible={shiftsVisible} />
      <main className="max-w-[860px] mx-auto px-4 sm:px-9 py-6 sm:py-8">
        <PageHeader
          title="Ny ansøgning"
          subtitle="Ansøgningen sendes til godkendelse hos din leder."
          actions={
            <Link href="/dashboard">
              <Btn variant="secondary" size="sm">Annuller</Btn>
            </Link>
          }
        />
        <RequestForm />
      </main>
    </AppShell>
  );
}
