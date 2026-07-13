-- =============================================================================
-- WorkPlan — Fase 1: Multi-tenant schema migration
-- ✅ HISTORISK: Allerede kørt i produktion (juli 2026). Beholdes som dokumentation.
-- Schema-sync fremadrettet sker via `prisma db push` i build-scriptet.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Nye enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "OrgStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Organization-tabel
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Organization" (
  "id"        TEXT NOT NULL,
  "slug"      TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "status"    "OrgStatus" NOT NULL DEFAULT 'ACTIVE',
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX IF NOT EXISTS "Organization_status_idx" ON "Organization"("status");

-- ---------------------------------------------------------------------------
-- 3. Indsæt default-org med eksisterende data
-- ---------------------------------------------------------------------------
INSERT INTO "Organization" ("id", "slug", "name", "updatedAt")
VALUES ('org-default', 'default', 'WorkPlan', CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Tilføj organizationId (nullable) til alle tabeller
-- ---------------------------------------------------------------------------
ALTER TABLE "Department"       ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "User"             ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "VacationRequest"  ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Holiday"          ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "AppSettings"      ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "AuditLog"         ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Notification"     ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "ShiftTemplate"    ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "ShiftPattern"     ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "VacationBalance"  ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "ShiftAssignment"  ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- ---------------------------------------------------------------------------
-- 5. Backfill alle eksisterende rækker med default-org
-- ---------------------------------------------------------------------------
UPDATE "Department"      SET "organizationId" = 'org-default' WHERE "organizationId" IS NULL;
UPDATE "VacationRequest" SET "organizationId" = 'org-default' WHERE "organizationId" IS NULL;
UPDATE "Holiday"         SET "organizationId" = 'org-default' WHERE "organizationId" IS NULL;
UPDATE "AppSettings"     SET "organizationId" = 'org-default' WHERE "organizationId" IS NULL;
UPDATE "AuditLog"        SET "organizationId" = 'org-default' WHERE "organizationId" IS NULL;
UPDATE "Notification"    SET "organizationId" = 'org-default' WHERE "organizationId" IS NULL;
UPDATE "ShiftTemplate"   SET "organizationId" = 'org-default' WHERE "organizationId" IS NULL;
UPDATE "ShiftPattern"    SET "organizationId" = 'org-default' WHERE "organizationId" IS NULL;
UPDATE "VacationBalance" SET "organizationId" = 'org-default' WHERE "organizationId" IS NULL;
UPDATE "ShiftAssignment" SET "organizationId" = 'org-default' WHERE "organizationId" IS NULL;

-- User: backfill alle IKKE-SUPER_ADMIN brugere
-- SUPER_ADMIN får null (ingen org)
UPDATE "User" SET "organizationId" = 'org-default'
WHERE "organizationId" IS NULL AND "role" != 'SUPER_ADMIN';

-- ---------------------------------------------------------------------------
-- 6. NOT NULL constraint på alt undtagen User (SUPER_ADMIN har null)
-- ---------------------------------------------------------------------------
ALTER TABLE "Department"      ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "VacationRequest" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Holiday"         ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "AuditLog"        ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Notification"    ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "ShiftTemplate"   ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "ShiftPattern"    ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "VacationBalance" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "ShiftAssignment" ALTER COLUMN "organizationId" SET NOT NULL;

-- AppSettings: sæt NOT NULL og indfør unique på organizationId
ALTER TABLE "AppSettings" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "AppSettings_organizationId_key" ON "AppSettings"("organizationId");

-- ---------------------------------------------------------------------------
-- 7. Fjern gammel @unique på User.email, tilføj composite unique
-- ---------------------------------------------------------------------------
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_email_key";

-- Composite unique: (email, organizationId) — kun for brugere MED org
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_organizationId_key"
  ON "User"("email", "organizationId")
  WHERE "organizationId" IS NOT NULL;

-- SUPER_ADMIN (organizationId IS NULL): unik på email alene
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_superadmin_key"
  ON "User"("email")
  WHERE "organizationId" IS NULL;

-- ---------------------------------------------------------------------------
-- 8. Foreign keys
-- ---------------------------------------------------------------------------
ALTER TABLE "Department" DROP CONSTRAINT IF EXISTS "Department_organizationId_fkey";
ALTER TABLE "Department" ADD CONSTRAINT "Department_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;

ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_organizationId_fkey";
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;

ALTER TABLE "VacationRequest" DROP CONSTRAINT IF EXISTS "VacationRequest_organizationId_fkey";
ALTER TABLE "VacationRequest" ADD CONSTRAINT "VacationRequest_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;

ALTER TABLE "Holiday" DROP CONSTRAINT IF EXISTS "Holiday_organizationId_fkey";
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;

ALTER TABLE "AppSettings" DROP CONSTRAINT IF EXISTS "AppSettings_organizationId_fkey";
ALTER TABLE "AppSettings" ADD CONSTRAINT "AppSettings_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;

ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_organizationId_fkey";
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;

ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_organizationId_fkey";
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;

ALTER TABLE "ShiftTemplate" DROP CONSTRAINT IF EXISTS "ShiftTemplate_organizationId_fkey";
ALTER TABLE "ShiftTemplate" ADD CONSTRAINT "ShiftTemplate_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;

ALTER TABLE "ShiftPattern" DROP CONSTRAINT IF EXISTS "ShiftPattern_organizationId_fkey";
ALTER TABLE "ShiftPattern" ADD CONSTRAINT "ShiftPattern_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;

ALTER TABLE "VacationBalance" DROP CONSTRAINT IF EXISTS "VacationBalance_organizationId_fkey";
ALTER TABLE "VacationBalance" ADD CONSTRAINT "VacationBalance_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;

ALTER TABLE "ShiftAssignment" DROP CONSTRAINT IF EXISTS "ShiftAssignment_organizationId_fkey";
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- 9. Indexes på organizationId
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "Department_organizationId_idx"      ON "Department"("organizationId");
CREATE INDEX IF NOT EXISTS "User_organizationId_idx"            ON "User"("organizationId");
CREATE INDEX IF NOT EXISTS "User_organizationId_role_idx"       ON "User"("organizationId", "role");
CREATE INDEX IF NOT EXISTS "VacationRequest_orgId_status_idx"   ON "VacationRequest"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "VacationRequest_orgId_created_idx"  ON "VacationRequest"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "Holiday_orgId_date_idx"             ON "Holiday"("organizationId", "date");
CREATE INDEX IF NOT EXISTS "AuditLog_orgId_created_idx"         ON "AuditLog"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_orgId_userId_read_idx" ON "Notification"("organizationId", "userId", "readAt");
CREATE INDEX IF NOT EXISTS "ShiftTemplate_organizationId_idx"   ON "ShiftTemplate"("organizationId");
CREATE INDEX IF NOT EXISTS "ShiftPattern_orgId_userId_idx"      ON "ShiftPattern"("organizationId", "userId");
CREATE INDEX IF NOT EXISTS "VacationBalance_orgId_userId_idx"   ON "VacationBalance"("organizationId", "userId");
CREATE INDEX IF NOT EXISTS "ShiftAssignment_orgId_date_idx"     ON "ShiftAssignment"("organizationId", "date");

COMMIT;
