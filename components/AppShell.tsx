/**
 * AppShell wraps all authenticated pages.
 *
 * Ansvar:
 *  - Sidebar offset (md:pl-56) + mobil top/bottom-bar offset
 *  - Rendrer <Nav> med fulde tilladelser og system-feature-flags
 *  - Rendrer <TopBar>
 *
 * Hver side wrapper sit indhold i <AppShell>...</AppShell>. AppShell henter
 * selv session + system-indstillinger, så siden ikke behøver passere props
 * ned (eliminerer fragmentation hvor nogle sider sendte shiftsVisible og
 * andre sendte vacationBalanceEnabled — inkonsistens der gjorde at fx
 * vagtplan-linket forsvandt på admin-sider).
 *
 * Login-, offline- og error-sider bruger IKKE AppShell.
 */
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { TopBar } from "@/components/TopBar";
import { canSeeShifts, isVacationBalanceEnabled } from "@/lib/settings";
import { buildSubject } from "@/lib/can";
import type { SessionUser } from "@/types";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;

  // Byg subject så vi har de effektive permissions.
  // session.user.permissions er allerede udfyldt af auth.ts, men vi går
  // gennem buildSubject for at få en konsistent Permissions-værdi selv
  // hvis token-claim mangler (legacy fallback).
  const subject = buildSubject(user);
  const orgId = (user as any).organizationId as string;

  // Feature-flags hentes parallelt — settings cached i 1 time, så billig.
  const [shiftsVisible, vacationBalanceEnabled] = await Promise.all([
    canSeeShifts(user.role, user.departmentId, user.canManageShifts),
    isVacationBalanceEnabled(orgId),
  ]);

  return (
    <div className="md:pl-56 pt-14 md:pt-0 pb-20 md:pb-0 min-h-screen">
      <Nav
        role={user.role}
        name={user.name ?? ""}
        departmentId={user.departmentId}
        permissions={subject.permissions}
        shiftsVisible={shiftsVisible}
        vacationBalanceEnabled={vacationBalanceEnabled}
      />
      <TopBar />
      {children}
    </div>
  );
}
