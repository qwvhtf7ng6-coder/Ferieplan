import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { AppShell } from "@/components/AppShell";
import HolidaysClient from "./HolidaysClient";
import { isAdmin } from "@/lib/permissions";
import { isVacationBalanceEnabled } from "@/lib/settings";

export default async function HolidaysPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;
  if (!isAdmin(user.role)) redirect("/dashboard");

  const [holidays, balanceEnabled] = await Promise.all([
    prisma.holiday.findMany({ orderBy: { date: "asc" } }),
    isVacationBalanceEnabled(),
  ]);

  return (
    <AppShell>
      <Nav role={user.role} name={user.name ?? ""} vacationBalanceEnabled={balanceEnabled} />
      <main className="max-w-[860px] mx-auto px-4 sm:px-9 py-6 sm:py-8">
        <HolidaysClient holidays={holidays as any} />
      </main>
    </AppShell>
  );
}
