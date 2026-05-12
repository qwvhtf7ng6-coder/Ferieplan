import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import CalendarGrid from "@/components/CalendarGrid";
import { isManager } from "@/lib/permissions";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;

  if (!isManager(user.role)) redirect("/dashboard");

  const sp = await searchParams;
  const now = new Date();
  const year = parseInt(sp.year ?? String(now.getFullYear()));
  const month = parseInt(sp.month ?? String(now.getMonth() + 1));

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const where: any =
    user.role === "ADMIN" ? {} : { departmentId: user.departmentId };

  const [departments, requests, holidays] = await Promise.all([
    prisma.department.findMany({
      include: {
        users: {
          where: { role: { not: "ADMIN" } },
          select: { id: true, name: true, departmentId: true },
        },
      },
      ...(user.role !== "ADMIN" ? { where: { id: user.departmentId } } : {}),
    }),
    prisma.vacationRequest.findMany({
      where: {
        ...where,
        entries: { some: { date: { gte: start, lte: end } } },
        status: { in: ["APPROVED", "PENDING"] },
      },
      include: {
        entries: { where: { date: { gte: start, lte: end } } },
        user: { select: { id: true, name: true } },
      },
    }),
    prisma.holiday.findMany({
      where: { date: { gte: start, lte: end } },
    }),
  ]);

  return (
    <div>
      <Nav role={user.role} name={user.name ?? ""} />
      <main className="p-4">
        <CalendarGrid
          year={year}
          month={month}
          departments={departments as any}
          requests={requests as any}
          holidays={holidays as any}
        />
      </main>
    </div>
  );
}
