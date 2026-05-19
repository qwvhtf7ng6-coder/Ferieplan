import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isManager, isAdmin, canEditShifts } from "@/lib/permissions";
import { isValidTime, isValidHexColor } from "@/lib/validators";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!canEditShifts(user.role, user.canManageShifts)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get("departmentId");

  const where = isAdmin(user.role)
    ? departmentId ? { departmentId } : {}
    : { departmentId: user.departmentId };

  const templates = await prisma.shiftTemplate.findMany({
    where,
    include: { department: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!canEditShifts(user.role, user.canManageShifts)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, startTime, endTime, color, departmentId, dayTimeRules } = await req.json();

  if (!name || !startTime || !endTime || !departmentId) {
    return NextResponse.json({ error: "Navn, starttid, sluttid og afdeling er påkrævet" }, { status: 400 });
  }
  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    return NextResponse.json({ error: "Ugyldigt tidsformat — brug HH:MM (fx 08:00)" }, { status: 400 });
  }
  const safeColor = isValidHexColor(color) ? color : "#3b82f6";

  // Non-admin managers can only create for their own department
  if (!isAdmin(user.role) && departmentId !== user.departmentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const template = await prisma.shiftTemplate.create({
    data: {
      name: name.trim(),
      startTime,
      endTime,
      color: safeColor,
      departmentId,
      dayTimeRules: dayTimeRules ? JSON.stringify(dayTimeRules) : null,
    },
  });

  return NextResponse.json(template, { status: 201 });
}
