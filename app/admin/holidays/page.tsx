import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import HolidaysClient from "./HolidaysClient";
import { can, buildSubject } from "@/lib/can";

export default async function HolidaysPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;
  if (!can(buildSubject(user), "holidays.edit")) redirect("/dashboard");

  const holidays = await prisma.holiday.findMany({ orderBy: { date: "asc" } });

  return (
    <AppShell>
      <main className="max-w-[860px] mx-auto px-4 sm:px-9 py-6 sm:py-8">
        <HolidaysClient holidays={holidays as any} />
      </main>
    </AppShell>
  );
}
