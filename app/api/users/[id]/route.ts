import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can, buildSubject } from "@/lib/can";
import { isValidRole } from "@/lib/validators";
import { sanitizePermissions } from "@/lib/permission-types";
import { wouldRemoveLastAdminByDelete, wouldRemoveLastAdminByRoleChange } from "@/lib/admin-guard";
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
  const { id } = await params;
  if (id === actor.id) return NextResponse.json({ error: "Kan ikke slette dig selv" }, { status: 400 });

  const target = await prisma.user.findUnique({
    where: { id },
    select: { departmentId: true, role: true, organizationId: true },
  });
  if (!target) return NextResponse.json({ error: "Bruger ikke fundet" }, { status: 404 });

  // Org-isolation: kan kun slette brugere i samme org
  if (target.organizationId !== actor.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!can(subject, "user.edit", { targetDepartmentId: target.departmentId })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (await wouldRemoveLastAdminByDelete(target)) {
    return NextResponse.json(
      { error: "Kan ikke slette den sidste administrator. Opret en anden administrator først." },
      { status: 400 },
    );
  }

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
  const orgId = actor.organizationId as string | null;

  const { id } = await params;
  const body = await req.json();
  const { name, email, role, departmentId, newPassword, canManageShifts, permissions } = body;

  const target = await prisma.user.findUnique({
    where: { id },
    select: { departmentId: true, role: true, organizationId: true },
  });
  if (!target) return NextResponse.json({ error: "Bruger ikke fundet" }, { status: 404 });

  // Org-isolation
  if (target.organizationId !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!can(subject, "user.edit", { targetDepartmentId: target.departmentId })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (newPassword && !can(subject, "user.reset_password", { targetDepartmentId: target.departmentId })) {
    return NextResponse.json({ error: "Ingen tilladelse til at nulstille adgangskode" }, { status: 403 });
  }

  if (!name || !email) {
    return NextResponse.json({ error: "Navn og email er påkrævet" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Ugyldig email-adresse" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Email-uniqueness inden for org (ekskluder den bruger vi redigerer)
  const existing = await prisma.user.findFirst({
    where: { email: normalizedEmail, organizationId: orgId ?? undefined, NOT: { id } },
  });
  if (existing) return NextResponse.json({ error: "Email allerede i brug i denne organisation" }, { status: 400 });

  const safeRole = isValidRole(role) ? role : "EMPLOYEE";

  if (await wouldRemoveLastAdminByRoleChange(target, safeRole)) {
    return NextResponse.json(
      { error: "Kan ikke ændre rolle på den sidste administrator. Opret en anden administrator først." },
      { status: 400 },
    );
  }

  const data: any = {
    name: name.trim(),
    email: normalizedEmail,
    role: safeRole,
    departmentId: departmentId || null,
    canManageShifts: canManageShifts === true,
  };

  if (permissions !== undefined) {
    if (!can(subject, "permissions.edit")) {
      return NextResponse.json({ error: "Ingen tilladelse til at redigere tilladelser" }, { status: 403 });
    }
    data.permissions = permissions === null ? null : sanitizePermissions(permissions);
  }

  if (newPassword) {
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Adgangskode skal være mindst 8 tegn" }, { status: 400 });
    }
    data.password = await bcrypt.hash(newPassword, 10);
    data.loginAttempts = 0;
    data.lockedUntil = null;
  }

  const updated = await prisma.user.update({ where: { id }, data });
  return NextResponse.json({ id: updated.id });
}
