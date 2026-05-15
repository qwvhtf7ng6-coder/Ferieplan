import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = session.user as any;
  if (!isAdmin(actor.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (id === actor.id) return NextResponse.json({ error: "Kan ikke slette dig selv" }, { status: 400 });

  // mode=keep → anonymise (set userId=null on related records), keep data
  // mode=delete → cascade delete all user data (default)
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "delete";

  if (mode === "keep") {
    // Anonymise: set userId=null on requests and audit logs, then delete user
    await prisma.$transaction([
      prisma.vacationRequest.updateMany({ where: { userId: id }, data: { userId: null } }),
      prisma.auditLog.updateMany({ where: { userId: id }, data: { userId: null } }),
      prisma.user.delete({ where: { id } }),
    ]);
  } else {
    // Delete all related data first (ShiftAssignments cascade, but VacationRequests don't)
    await prisma.$transaction([
      prisma.vacationRequest.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);
  }

  return NextResponse.json({ ok: true });
}

// GET a user's data summary before deletion
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = session.user as any;
  if (!isAdmin(actor.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const [requestCount, shiftCount] = await Promise.all([
    prisma.vacationRequest.count({ where: { userId: id } }),
    prisma.shiftAssignment.count({ where: { userId: id } }),
  ]);

  return NextResponse.json({ requestCount, shiftCount });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = session.user as any;
  if (!isAdmin(actor.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { name, email, role, departmentId, newPassword } = await req.json();

  if (!name || !email) {
    return NextResponse.json({ error: "Navn og email er påkrævet" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Ugyldig email-adresse" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({ where: { email, NOT: { id } } });
  if (existing) return NextResponse.json({ error: "Email allerede i brug" }, { status: 400 });

  const data: any = {
    name: name.trim(),
    email: email.trim(),
    role: role || "EMPLOYEE",
    departmentId: departmentId || null,
  };

  if (newPassword) {
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Adgangskode skal være mindst 8 tegn" }, { status: 400 });
    }
    data.password = await bcrypt.hash(newPassword, 10);
  }

  const updated = await prisma.user.update({ where: { id }, data });
  return NextResponse.json({ id: updated.id });
}
