import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { AppShell } from "@/components/AppShell";
import { OnBehalfForm } from "./OnBehalfForm";
import { can, buildSubject, scopeOf } from "@/lib/can";
import { canSeeShifts } from "@/lib/settings";
import { PageHeader } from "@/components/ui/PageHeader";
import { Btn } from "@/components/ui/Btn";
import type { SessionUser } from "@/types";

export default async function NewRequestOnBehalfPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  const subject = buildSubject(user);
  if (!can(subject, "application.create_on_behalf")) redirect("/dashboard");

  // ALL-scope = se medarbejdere på tværs. OWN_DEPARTMENT = kun egen afdeling.
  const scope = scopeOf(subject, "application.create_on_behalf");
  const seeAllDepartments = scope === "ALL";

  const [shiftsVisible, employees] = await Promise.all([
    canSeeShifts(user.role, user.departmentId, user.canManageShifts),
    prisma.user.findMany({
      where: seeAllDepartments
        ? { departmentId: { not: null } }
        : { departmentId: user.departmentId ?? "" },
      select: {
        id: true,
        name: true,
        departmentId: true,
        department: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AppShell>
      <Nav role={user.role} name={user.name ?? ""} shiftsVisible={shiftsVisible} />
      <main className="max-w-[860px] mx-auto px-4 sm:px-9 py-6 sm:py-8">
        <PageHeader
          title="Opret på vegne af"
          subtitle="Ansøgningen oprettes direkte som godkendt — nyttigt ved sygdom, barsel eller bagudregistrering."
          actions={
            <Link href="/manager/requests">
              <Btn variant="secondary" size="sm">Annuller</Btn>
            </Link>
          }
        />
        <OnBehalfForm employees={employees} />
      </main>
    </AppShell>
  );
}
