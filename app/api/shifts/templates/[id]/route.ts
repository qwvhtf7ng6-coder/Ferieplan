import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isManager, isAdmin } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!isManager(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { name, startTime, endTime, color } = await req.json();

  if (!name || !startTime || !endTime) {
    return NextResponse.json({ error: "Navn, starttid og sluttid er påkrævet" }, { status: 400 });
  }

  const existing = await prisma.shiftTemplate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });

  if (!isAdmin(user.role) && existing.departmentId !== user.departmentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.shiftTemplate.update({
    where: { id },
    data: { name: name.trim(), startTime, endTime, color: color || "#3b82f6" },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!isManager(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const existing = await prisma.shiftTemplate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });

  if (!isAdmin(user.role) && existing.departmentId !== user.departmentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.shiftTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
