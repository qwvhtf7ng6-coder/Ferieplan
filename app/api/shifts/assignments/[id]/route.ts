import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isManager, isAdmin } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!isManager(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const assignment = await prisma.shiftAssignment.findUnique({
    where: { id },
    include: { template: true },
  });

  if (!assignment) return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });

  if (!isAdmin(user.role) && assignment.template.departmentId !== user.departmentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.shiftAssignment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
