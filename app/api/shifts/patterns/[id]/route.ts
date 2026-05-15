import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isManager, isAdmin } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { generateAssignmentsFromPattern } from "@/lib/shift-patterns";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!isManager(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.shiftPattern.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  if (!isAdmin(user.role) && existing.departmentId !== user.departmentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { active, name, note } = await req.json();
  const updated = await prisma.shiftPattern.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(note !== undefined ? { note: note || null } : {}),
      ...(active !== undefined ? { active } : {}),
    },
    include: {
      template: { select: { id: true, name: true, color: true, startTime: true, endTime: true } },
      user: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!isManager(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.shiftPattern.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  if (!isAdmin(user.role) && existing.departmentId !== user.departmentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.shiftPattern.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// POST /api/shifts/patterns/[id] => regenerer vagter
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!isManager(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const pattern = await prisma.shiftPattern.findUnique({ where: { id } });
  if (!pattern) return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });

  const count = await generateAssignmentsFromPattern(pattern);
  return NextResponse.json({ ok: true, generated: count });
}
