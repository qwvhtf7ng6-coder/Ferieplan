import { PrismaClient, Role, EntryType, RequestStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ⚠️  VIGTIGT: seed.ts bruges KUN til lokal udvikling og test.
// Kør ALDRIG seed mod en produktionsdatabase.
const ADMIN_PW = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
const USER_PW  = process.env.SEED_USER_PASSWORD  ?? "user123";

if (process.env.NODE_ENV === "production") {
  console.error("⛔ seed.ts må ikke køres i produktion. Afbryder.");
  process.exit(1);
}

async function main() {
  const adminPw = await bcrypt.hash(ADMIN_PW, 10);
  const userPw  = await bcrypt.hash(USER_PW, 10);

  // ---------------------------------------------------------------------------
  // Org 1: Odense (primær test-org)
  // ---------------------------------------------------------------------------
  const odense = await prisma.organization.upsert({
    where: { slug: "odense" },
    update: {},
    create: { id: "org-odense", slug: "odense", name: "Firma A/S – Odense" },
  });

  const devDept = await prisma.department.upsert({
    where: { id: "dept-dev" },
    update: {},
    create: { id: "dept-dev", organizationId: odense.id, name: "Udvikling", maxConcurrent: 3 },
  });
  const salesDept = await prisma.department.upsert({
    where: { id: "dept-sales" },
    update: {},
    create: { id: "dept-sales", organizationId: odense.id, name: "Salg", maxConcurrent: 2 },
  });

  const admin = await prisma.user.upsert({
    where: { email_organizationId: { email: "admin@firma.dk", organizationId: odense.id } },
    update: {},
    create: {
      name: "Admin Bruger",
      email: "admin@firma.dk",
      password: adminPw,
      role: Role.ADMIN,
      organizationId: odense.id,
      departmentId: devDept.id,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email_organizationId: { email: "leder@firma.dk", organizationId: odense.id } },
    update: {},
    create: {
      name: "Lars Leder",
      email: "leder@firma.dk",
      password: userPw,
      role: Role.MANAGER,
      organizationId: odense.id,
      departmentId: devDept.id,
    },
  });

  const emp1 = await prisma.user.upsert({
    where: { email_organizationId: { email: "anna@firma.dk", organizationId: odense.id } },
    update: {},
    create: {
      name: "Anna Andersen",
      email: "anna@firma.dk",
      password: userPw,
      role: Role.EMPLOYEE,
      organizationId: odense.id,
      departmentId: devDept.id,
    },
  });

  const emp2 = await prisma.user.upsert({
    where: { email_organizationId: { email: "bo@firma.dk", organizationId: odense.id } },
    update: {},
    create: {
      name: "Bo Bentsen",
      email: "bo@firma.dk",
      password: userPw,
      role: Role.EMPLOYEE,
      organizationId: odense.id,
      departmentId: salesDept.id,
    },
  });

  // AppSettings for Odense
  await prisma.appSettings.upsert({
    where: { organizationId: odense.id },
    update: {},
    create: {
      organizationId: odense.id,
      calendarVisibility: "ALL_EMPLOYEES",
    },
  });

  // Danish holidays 2025 — Odense
  const holidays2025 = [
    { name: "Nytårsdag",               date: new Date("2025-01-01") },
    { name: "Skærtorsdag",             date: new Date("2025-04-17") },
    { name: "Langfredag",              date: new Date("2025-04-18") },
    { name: "Påskedag",                date: new Date("2025-04-20") },
    { name: "2. Påskedag",             date: new Date("2025-04-21") },
    { name: "Store Bededag",           date: new Date("2025-05-16") },
    { name: "Kristi Himmelfartsdag",   date: new Date("2025-05-29") },
    { name: "Pinsedag",                date: new Date("2025-06-08") },
    { name: "2. Pinsedag",             date: new Date("2025-06-09") },
    { name: "Grundlovsdag",            date: new Date("2025-06-05") },
    { name: "Juledag",                 date: new Date("2025-12-25") },
    { name: "2. Juledag",              date: new Date("2025-12-26") },
  ];
  for (const h of holidays2025) {
    const id = `holiday-odense-${h.date.toISOString().slice(0, 10)}`;
    await prisma.holiday.upsert({
      where: { id },
      update: {},
      create: { id, organizationId: odense.id, ...h },
    });
  }

  // Sample request — Odense
  await prisma.vacationRequest.upsert({
    where: { id: "req-sample-1" },
    update: {},
    create: {
      id: "req-sample-1",
      organizationId: odense.id,
      userId: emp1.id,
      departmentId: devDept.id,
      status: RequestStatus.APPROVED,
      note: "Sommerferie",
      entries: {
        create: [
          { date: new Date("2025-07-07"), type: EntryType.FULL_DAY, days: 1 },
          { date: new Date("2025-07-08"), type: EntryType.FULL_DAY, days: 1 },
          { date: new Date("2025-07-09"), type: EntryType.FULL_DAY, days: 1 },
          { date: new Date("2025-07-10"), type: EntryType.FULL_DAY, days: 1 },
          { date: new Date("2025-07-11"), type: EntryType.FULL_DAY, days: 1 },
        ],
      },
    },
  });

  // ---------------------------------------------------------------------------
  // Org 2: Kolding (isolation-test org)
  // ---------------------------------------------------------------------------
  const kolding = await prisma.organization.upsert({
    where: { slug: "kolding" },
    update: {},
    create: { id: "org-kolding", slug: "kolding", name: "Firma A/S – Kolding" },
  });

  const kDept = await prisma.department.upsert({
    where: { id: "dept-kolding" },
    update: {},
    create: { id: "dept-kolding", organizationId: kolding.id, name: "Operations", maxConcurrent: 2 },
  });

  // Same email as odense admin — tests composite unique
  await prisma.user.upsert({
    where: { email_organizationId: { email: "admin@firma.dk", organizationId: kolding.id } },
    update: {},
    create: {
      name: "Admin Kolding",
      email: "admin@firma.dk",
      password: adminPw,
      role: Role.ADMIN,
      organizationId: kolding.id,
      departmentId: kDept.id,
    },
  });

  await prisma.user.upsert({
    where: { email_organizationId: { email: "medarbejder@firma.dk", organizationId: kolding.id } },
    update: {},
    create: {
      name: "Mette Medarbejder",
      email: "medarbejder@firma.dk",
      password: userPw,
      role: Role.EMPLOYEE,
      organizationId: kolding.id,
      departmentId: kDept.id,
    },
  });

  await prisma.appSettings.upsert({
    where: { organizationId: kolding.id },
    update: {},
    create: {
      organizationId: kolding.id,
      calendarVisibility: "ALL_EMPLOYEES",
    },
  });

  // ---------------------------------------------------------------------------
  // SUPER_ADMIN (ingen org)
  // ---------------------------------------------------------------------------
  // Super-admin identificeres ved email alene (organizationId = null)
  const existingSA = await prisma.user.findFirst({
    where: { email: "super@workplan.dk", organizationId: null },
  });
  if (!existingSA) {
    await prisma.user.create({
      data: {
        name: "Super Admin",
        email: "super@workplan.dk",
        password: adminPw,
        role: Role.SUPER_ADMIN,
        organizationId: null,
      },
    });
  }

  console.log("✅ Seed complete — 2 orgs (odense, kolding) + super admin");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
