import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { canManageDepartment } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const { id } = await params;

  const request = await prisma.vacationRequest.findUnique({
    where: { id },
    include: { entries: true, department: true },
  });

  if (!request) return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });

  // Authorization
  if (!canManageDepartment(user.role, user.departmentId, request.departmentId)) {
    return NextResponse.json({ error: "Ingen adgang" }, { status: 403 });
  }

  const body = await req.json();
  const { status, note } = body;

  // Check capacity warning on approval
  let capacityWarning = null;
  if (status === "APPROVED") {
    const dept = await prisma.department.findUnique({ where: { id: request.departmentId } });
    const dates = request.entries.map((e: { date: Date }) => e.date);

    for (const date of dates) {
      const count = await prisma.vacationRequestEntry.count({
        where: {
          date,
          request: {
            departmentId: request.departmentId,
            status: "APPROVED",
            id: { not: id },
          },
        },
      });
      if (dept && count + 1 > dept.maxConcurrent) {
        const dateStr = (date as Date).toISOString().slice(0, 10);
        capacityWarning = `Kapacitetsgrænse overskredet for ${dateStr}`;
        break;
      }
    }
  }

  const updated = await prisma.vacationRequest.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(note !== undefined && { note }),
    },
    include: { entries: true, user: { select: { name: true } } },
  });

  await createAuditLog({
    userId: user.id,
    requestId: id,
    action: status || "UPDATE",
    details: capacityWarning || undefined,
  });

  return NextResponse.json({ ...updated, capacityWarning });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const { id } = await params;

  const request = await prisma.vacationRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });

  if (!canManageDepartment(user.role, user.departmentId, request.departmentId)) {
    return NextResponse.json({ error: "Ingen adgang" }, { status: 403 });
  }

  await prisma.vacationRequest.delete({ where: { id } });
  await createAuditLog({ userId: user.id, requestId: id, action: "DELETE" });

  return NextResponse.json({ ok: true });
}
