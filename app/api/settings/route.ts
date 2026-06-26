import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can, buildSubject } from "@/lib/can";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const orgId = user.organizationId as string;
  const settings = await prisma.appSettings.findUnique({ where: { organizationId: orgId } });
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const orgId = user.organizationId as string;
  if (!can(buildSubject(user), "settings.edit")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { calendarVisibility, reminderThresholdDays, vacationBalanceEnabled } = await req.json();

  const settings = await prisma.appSettings.upsert({
    where: { organizationId: orgId },
    update: {
      calendarVisibility,
      ...(reminderThresholdDays !== undefined && { reminderThresholdDays: Number(reminderThresholdDays) }),
      ...(vacationBalanceEnabled !== undefined && { vacationBalanceEnabled: Boolean(vacationBalanceEnabled) }),
    },
    create: {
      organizationId: orgId,
      calendarVisibility,
      reminderThresholdDays: reminderThresholdDays !== undefined ? Number(reminderThresholdDays) : 3,
      vacationBalanceEnabled: vacationBalanceEnabled !== undefined ? Boolean(vacationBalanceEnabled) : false,
    },
  });

  return NextResponse.json(settings);
}
