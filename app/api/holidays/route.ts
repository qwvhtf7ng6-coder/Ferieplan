import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can, buildSubject } from "@/lib/can";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const orgId = user.organizationId as string;
  const holidays = await prisma.holiday.findMany({
    where: { organizationId: orgId },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(holidays);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const orgId = user.organizationId as string;
  if (!can(buildSubject(user), "holidays.edit")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, date, isNational } = await req.json();
  if (!name || !date) return NextResponse.json({ error: "Navn og dato påkrævet" }, { status: 400 });

  const holiday = await prisma.holiday.create({
    data: { organizationId: orgId, name, date: new Date(date), isNational: isNational ?? true },
  });
  return NextResponse.json(holiday, { status: 201 });
}
