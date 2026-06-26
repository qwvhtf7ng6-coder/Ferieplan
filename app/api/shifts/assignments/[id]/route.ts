import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can, buildSubject } from "@/lib/can";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const orgId = user.organizationId as string;
  const subject = buildSubject(user);
  if (!can(subject, "shift.assign")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const assignment = await prisma.shiftAssignment.findFirst({
    where: { id, organizationId: orgId },
    include: { template: true },
  });
  if (!assignment) return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });

  if (!can(subject, "shift.assign", { targetDepartmentId: assignment.template.departmentId })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.shiftAssignment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
