import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isManager, isAdmin } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!isManager(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
  if (!isManager(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, startTime, endTime, color, departmentId } = await req.json();

  if (!name || !startTime || !endTime || !departmentId) {
    return NextResponse.json({ error: "Navn, starttid, sluttid og afdeling er påkrævet" }, { status: 400 });
  }

  // Non-admin managers can only create for their own department
  if (!isAdmin(user.role) && departmentId !== user.departmentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const template = await prisma.shiftTemplate.create({
    data: {
      name: name.trim(),
      startTime,
      endTime,
      color: color || "#3b82f6",
      departmentId,
    },
  });

  return NextResponse.json(template, { status: 201 });
}
