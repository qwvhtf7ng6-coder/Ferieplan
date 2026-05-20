import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can, buildSubject } from "@/lib/can";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await prisma.appSettings.findFirst();
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!can(buildSubject(user), "settings.edit")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { calendarVisibility, reminderThresholdDays, vacationBalanceEnabled } = await req.json();

  const settings = await prisma.appSettings.upsert({
    where: { id: "settings" },
    update: {
      calendarVisibility,
      ...(reminderThresholdDays !== undefined && { reminderThresholdDays: Number(reminderThresholdDays) }),
      ...(vacationBalanceEnabled !== undefined && { vacationBalanceEnabled: Boolean(vacationBalanceEnabled) }),
    },
    create: {
      id: "settings",
      calendarVisibility,
      reminderThresholdDays: reminderThresholdDays !== undefined ? Number(reminderThresholdDays) : 3,
      vacationBalanceEnabled: vacationBalanceEnabled !== undefined ? Boolean(vacationBalanceEnabled) : false,
    },
  });

  return NextResponse.json(settings);
}
