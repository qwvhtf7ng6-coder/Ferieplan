import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { AppShell } from "@/components/AppShell";
import { isAdmin } from "@/lib/permissions";
import { isVacationBalanceEnabled } from "@/lib/settings";
import { getAllVacationBalances } from "@/actions/vacation-balance";
import VacationBalanceClient from "./VacationBalanceClient";

export default async function VacationBalancePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;
  if (!isAdmin(user.role)) redirect("/dashboard");

  const balanceEnabled = await isVacationBalanceEnabled();
  if (!balanceEnabled) redirect("/admin/settings");

  const sp = await searchParams;
  const year = parseInt(sp.year ?? String(new Date().getFullYear()));

  const result = await getAllVacationBalances(year);
  const rows = result.ok ? result.data : [];

  return (
    <AppShell>
      <Nav role={user.role} name={user.name ?? ""} calendarVisible={true} vacationBalanceEnabled={true} />
      <main className="max-w-[1100px] mx-auto px-4 sm:px-9 py-6 sm:py-8">
        <VacationBalanceClient rows={rows ?? []} year={year} />
      </main>
    </AppShell>
  );
}
