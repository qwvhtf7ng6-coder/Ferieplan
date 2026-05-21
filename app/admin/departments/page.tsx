import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import DepartmentsClient from "./DepartmentsClient";
import { can, buildSubject } from "@/lib/can";

export default async function DepartmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;
  if (!can(buildSubject(user), "departments.edit")) redirect("/dashboard");

  const departments = await prisma.department.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <AppShell>
      <main className="max-w-[860px] mx-auto px-4 sm:px-9 py-6 sm:py-8">
        <DepartmentsClient departments={departments as any} />
      </main>
    </AppShell>
  );
}
