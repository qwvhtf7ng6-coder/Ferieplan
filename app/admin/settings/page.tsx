import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { AppShell } from "@/components/AppShell";
import SettingsClient from "./SettingsClient";
import { isAdmin } from "@/lib/permissions";
import { isVacationBalanceEnabled } from "@/lib/settings";

interface Settings {
  id: string;
  calendarVisibility: "ALL_EMPLOYEES" | "MANAGEMENT_ONLY";
  reminderThresholdDays: number;
  vacationBalanceEnabled: boolean;
}

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;
  if (!isAdmin(user.role)) redirect("/dashboard");

  const [settings, balanceEnabled] = await Promise.all([
    prisma.appSettings.findFirst(),
    isVacationBalanceEnabled(),
  ]);

  return (
    <AppShell>
      <Nav role={user.role} name={user.name ?? ""} calendarVisible={true} vacationBalanceEnabled={balanceEnabled} />
      <main className="max-w-xl mx-auto p-6">
        <SettingsClient settings={settings as Settings | null} />
      </main>
    </AppShell>
  );
}
