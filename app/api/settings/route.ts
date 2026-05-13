import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
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
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { calendarVisibility, reminderThresholdDays } = await req.json();

  const settings = await prisma.appSettings.upsert({
    where: { id: "settings" },
    update: {
      calendarVisibility,
      ...(reminderThresholdDays !== undefined && { reminderThresholdDays: Number(reminderThresholdDays) }),
    },
    create: {
      id: "settings",
      calendarVisibility,
      reminderThresholdDays: reminderThresholdDays !== undefined ? Number(reminderThresholdDays) : 3,
    },
  });

  return NextResponse.json(settings);
}
