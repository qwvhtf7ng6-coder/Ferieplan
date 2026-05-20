import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can, buildSubject, scopeOf } from "@/lib/can";
import { isValidTime, isValidHexColor } from "@/lib/validators";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const subject = buildSubject(user);
  if (!can(subject, "shift.edit_templates")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get("departmentId");

  // ALL-scope brugere (admin + give-de-rettighed managers) kan filtrere på enhver afdeling.
  // OWN_DEPARTMENT-brugere låses til egen afdeling.
  const assignScope = scopeOf(subject, "shift.assign");
  const where = assignScope === "ALL"
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
  const subject = buildSubject(user);
  if (!can(subject, "shift.edit_templates")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, startTime, endTime, color, departmentId, dayTimeRules } = await req.json();

  if (!name || !startTime || !endTime || !departmentId) {
    return NextResponse.json({ error: "Navn, starttid, sluttid og afdeling er påkrævet" }, { status: 400 });
  }
  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    return NextResponse.json({ error: "Ugyldigt tidsformat — brug HH:MM (fx 08:00)" }, { status: 400 });
  }
  const safeColor = isValidHexColor(color) ? color : "#3b82f6";

  // Scope-tjek: må brugeren tildele vagter i denne afdeling?
  if (!can(subject, "shift.assign", { targetDepartmentId: departmentId })) {
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
