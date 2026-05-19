import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { isValidRole } from "@/lib/validators";
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

  // Cascade: slet bruger og alle tilknyttede data
  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
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
  const { name, email, role, departmentId, newPassword, canManageShifts } = await req.json();

  if (!name || !email) {
    return NextResponse.json({ error: "Navn og email er påkrævet" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Ugyldig email-adresse" }, { status: 400 });
  }

  // Normalisér email til lowercase før både lookup og storage
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findFirst({ where: { email: normalizedEmail, NOT: { id } } });
  if (existing) return NextResponse.json({ error: "Email allerede i brug" }, { status: 400 });

  const safeRole = isValidRole(role) ? role : "EMPLOYEE";

  const data: any = {
    name: name.trim(),
    email: normalizedEmail,
    role: safeRole,
    departmentId: departmentId || null,
    canManageShifts: canManageShifts === true,
  };

  if (newPassword) {
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Adgangskode skal være mindst 8 tegn" }, { status: 400 });
    }
    data.password = await bcrypt.hash(newPassword, 10);
    // Når admin nulstiller adgangskode, nulstil også login-attempts og lockout
    // så brugeren straks kan logge ind med den nye adgangskode
    data.loginAttempts = 0;
    data.lockedUntil = null;
  }

  const updated = await prisma.user.update({ where: { id }, data });
  return NextResponse.json({ id: updated.id });
}
