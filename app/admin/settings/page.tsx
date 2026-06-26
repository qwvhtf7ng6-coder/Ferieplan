import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import SettingsClient from "./SettingsClient";
import { can, buildSubject } from "@/lib/can";
import { getAllVacationBalances } from "@/actions/vacation-balance";

interface Settings {
  id: string;
  calendarVisibility: "ALL_EMPLOYEES" | "MANAGEMENT_ONLY";
  reminderThresholdDays: number;
  vacationBalanceEnabled: boolean;
}

type TabId = "general" | "calendar" | "holidays" | "balance" | "departments";

const VALID_TABS: TabId[] = ["general", "calendar", "holidays", "balance", "departments"];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; year?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;
  const subject = buildSubject(user);

  // Tjek tilladelser pr. tab. Mindst én af dem skal være sand, ellers redirect.
  const perms = {
    settings: can(subject, "settings.edit"),
    holidays: can(subject, "holidays.edit"),
    departments: can(subject, "departments.edit"),
    balance: can(subject, "balance.view_others"),
  };

  if (!perms.settings && !perms.holidays && !perms.departments && !perms.balance) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const orgId = user.organizationId as string;

  // Hent settings (altid — bruges blandt andet til at vide om balance-tab skal vises)
  const settings = await prisma.appSettings.findUnique({ where: { organizationId: orgId } });

  // Hent data parallelt — kun det brugeren har lov til at se
  const [holidays, departments, balanceResult] = await Promise.all([
    perms.holidays
      ? prisma.holiday.findMany({ where: { organizationId: orgId }, orderBy: { date: "asc" } })
      : Promise.resolve([]),
    perms.departments
      ? prisma.department.findMany({
          where: { organizationId: orgId },
          include: { _count: { select: { users: true } } },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    perms.balance && settings?.vacationBalanceEnabled
      ? getAllVacationBalances(parseInt(sp.year ?? String(new Date().getFullYear())))
      : Promise.resolve(null),
  ]);

  const balanceYear = parseInt(sp.year ?? String(new Date().getFullYear()));
  const balanceRows =
    balanceResult && "ok" in balanceResult && balanceResult.ok ? (balanceResult.data ?? []) : [];

  // Validér og udled startfane.
  //  1) Brug ?tab=… hvis den er gyldig og brugeren har lov.
  //  2) Ellers første tab brugeren har adgang til.
  function resolveInitialTab(): TabId {
    const requested = sp.tab as TabId | undefined;
    const allowed = (t: TabId) => {
      if (t === "general" || t === "calendar") return perms.settings;
      if (t === "holidays") return perms.holidays;
      if (t === "balance") return perms.balance && !!settings?.vacationBalanceEnabled;
      if (t === "departments") return perms.departments;
      return false;
    };
    if (requested && VALID_TABS.includes(requested) && allowed(requested)) {
      return requested;
    }
    // Faldordre matcher tab-rækkefølgen i UI'et
    if (perms.settings) return "general";
    if (perms.holidays) return "holidays";
    if (perms.balance && settings?.vacationBalanceEnabled) return "balance";
    if (perms.departments) return "departments";
    return "general"; // unreachable pga. redirect ovenfor
  }

  return (
    <AppShell>
      <main className="max-w-[860px] mx-auto px-4 sm:px-9 py-6 sm:py-8">
        <SettingsClient
          settings={settings as Settings | null}
          holidays={holidays as any}
          departments={departments as any}
          balanceRows={balanceRows as any}
          balanceYear={balanceYear}
          perms={perms}
          initialTab={resolveInitialTab()}
        />
      </main>
    </AppShell>
  );
}
