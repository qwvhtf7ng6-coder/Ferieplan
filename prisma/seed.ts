import { PrismaClient, Role, EntryType, RequestStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ⚠️  VIGTIGT: seed.ts bruges KUN til lokal udvikling og test.
// Kør ALDRIG seed mod en produktionsdatabase.
// Skift adgangskoderne i SEED_ADMIN_PASSWORD / SEED_USER_PASSWORD
// miljøvariabler, eller skift dem manuelt efter seeding.
const ADMIN_PW = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
const USER_PW  = process.env.SEED_USER_PASSWORD  ?? "user123";

if (process.env.NODE_ENV === "production") {
  console.error("⛔ seed.ts må ikke køres i produktion. Afbryder.");
  process.exit(1);
}

async function main() {
  // Departments
  const devDept = await prisma.department.upsert({
    where: { id: "dept-dev" },
    update: {},
    create: { id: "dept-dev", name: "Udvikling", maxConcurrent: 3 },
  });
  const salesDept = await prisma.department.upsert({
    where: { id: "dept-sales" },
    update: {},
    create: { id: "dept-sales", name: "Salg", maxConcurrent: 2 },
  });

  // Users
  const adminPw = await bcrypt.hash(ADMIN_PW, 10);
  const userPw = await bcrypt.hash(USER_PW, 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@firma.dk" },
    update: {},
    create: {
      name: "Admin Bruger",
      email: "admin@firma.dk",
      password: adminPw,
      role: Role.ADMIN,
      departmentId: devDept.id,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "leder@firma.dk" },
    update: {},
    create: {
      name: "Lars Leder",
      email: "leder@firma.dk",
      password: userPw,
      role: Role.MANAGER,
      departmentId: devDept.id,
    },
  });

  const emp1 = await prisma.user.upsert({
    where: { email: "anna@firma.dk" },
    update: {},
    create: {
      name: "Anna Andersen",
      email: "anna@firma.dk",
      password: userPw,
      role: Role.EMPLOYEE,
      departmentId: devDept.id,
    },
  });

  const emp2 = await prisma.user.upsert({
    where: { email: "bo@firma.dk" },
    update: {},
    create: {
      name: "Bo Bentsen",
      email: "bo@firma.dk",
      password: userPw,
      role: Role.EMPLOYEE,
      departmentId: salesDept.id,
    },
  });

  // Danish holidays 2025
  const holidays2025 = [
    { name: "Nytårsdag", date: new Date("2025-01-01") },
    { name: "Skærtorsdag", date: new Date("2025-04-17") },
    { name: "Langfredag", date: new Date("2025-04-18") },
    { name: "Påskedag", date: new Date("2025-04-20") },
    { name: "2. Påskedag", date: new Date("2025-04-21") },
    { name: "Store Bededag", date: new Date("2025-05-16") },
    { name: "Kristi Himmelfartsdag", date: new Date("2025-05-29") },
    { name: "Pinsedag", date: new Date("2025-06-08") },
    { name: "2. Pinsedag", date: new Date("2025-06-09") },
    { name: "Grundlovsdag", date: new Date("2025-06-05") },
    { name: "Juledag", date: new Date("2025-12-25") },
    { name: "2. Juledag", date: new Date("2025-12-26") },
  ];

  for (const h of holidays2025) {
    await prisma.holiday.upsert({
      where: { id: `holiday-${h.date.toISOString().slice(0, 10)}` },
      update: {},
      create: { id: `holiday-${h.date.toISOString().slice(0, 10)}`, ...h },
    });
  }

  // App settings
  await prisma.appSettings.upsert({
    where: { id: "settings" },
    update: {},
    create: { id: "settings", calendarVisibility: "ALL_EMPLOYEES" },
  });

  // Sample vacation request
  await prisma.vacationRequest.upsert({
    where: { id: "req-sample-1" },
    update: {},
    create: {
      id: "req-sample-1",
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

  console.log("✅ Seed complete");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
