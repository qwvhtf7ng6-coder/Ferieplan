import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.department.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { name, maxConcurrent, shiftsEnabled } = await req.json();

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Navn er påkrævet" }, { status: 400 });
  }
  if (!maxConcurrent || typeof maxConcurrent !== "number" || maxConcurrent < 1) {
    return NextResponse.json({ error: "Max samtidige skal være mindst 1" }, { status: 400 });
  }

  const updated = await prisma.department.update({
    where: { id },
    data: { name: name.trim(), maxConcurrent, shiftsEnabled: shiftsEnabled !== false },
  });

  return NextResponse.json(updated);
}
