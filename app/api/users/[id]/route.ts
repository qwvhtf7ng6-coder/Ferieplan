import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can, buildSubject } from "@/lib/can";
import { isValidRole } from "@/lib/validators";
import { sanitizePermissions } from "@/lib/permission-types";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = session.user as any;
  const subject = buildSubject(actor);
  // Sletning kræver "edit" på den specifikke bruger — vi skal kende deres afdeling først
  const { id } = await params;
  if (id === actor.id) return NextResponse.json({ error: "Kan ikke slette dig selv" }, { status: 400 });

  const target = await prisma.user.findUnique({
    where: { id },
    select: { departmentId: true, role: true },
  });
  if (!target) return NextResponse.json({ error: "Bruger ikke fundet" }, { status: 404 });

  if (!can(subject, "user.edit", { targetDepartmentId: target.departmentId })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
  const subject = buildSubject(actor);

  const { id } = await params;
  const body = await req.json();
  const { name, email, role, departmentId, newPassword, canManageShifts, permissions } = body;

  // Find målbruger først så vi kan tjekke scope mod deres aktuelle afdeling
  const target = await prisma.user.findUnique({
    where: { id },
    select: { departmentId: true },
  });
  if (!target) return NextResponse.json({ error: "Bruger ikke fundet" }, { status: 404 });

  // Generel redigerings-adgang
  if (!can(subject, "user.edit", { targetDepartmentId: target.departmentId })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Adgangskode-reset kræver separat tilladelse med scope
  if (newPassword && !can(subject, "user.reset_password", { targetDepartmentId: target.departmentId })) {
    return NextResponse.json({ error: "Ingen tilladelse til at nulstille adgangskode" }, { status: 403 });
  }

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

  // Permissions-overrides: kun tilladt for brugere med permissions.edit-tilladelsen.
  // Nøglen optræder kun i body hvis admin eksplicit har redigeret tilladelser
  // (frontend sender ikke feltet ellers), så vi ignorerer fraværet.
  if (permissions !== undefined) {
    if (!can(subject, "permissions.edit")) {
      return NextResponse.json({ error: "Ingen tilladelse til at redigere tilladelser" }, { status: 403 });
    }
    if (permissions === null) {
      // Eksplicit nulstilling — bruger arver rolle-defaults fremover.
      data.permissions = null;
    } else {
      // Saniter input og gem som JSON.
      data.permissions = sanitizePermissions(permissions);
    }
  }

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
