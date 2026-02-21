/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,number]` on the table `contracts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,number]` on the table `properties` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,voen]` on the table `tenants` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,email]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `organizationId` to the `audit_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `contracts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `expenses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `periodMonth` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `periodYear` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `properties` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `tenants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `users` table without a default value. This is not possible if the table is not empty.

*/

-- CreateEnum
CREATE TYPE "MeterType" AS ENUM ('ELECTRICITY', 'WATER_COLD', 'WATER_HOT', 'GAS', 'HEAT');

-- AlterEnum: add new DocumentType values
ALTER TYPE "DocumentType" ADD VALUE 'INVOICE';
ALTER TYPE "DocumentType" ADD VALUE 'RECEIPT';
ALTER TYPE "DocumentType" ADD VALUE 'ADDENDUM';
ALTER TYPE "DocumentType" ADD VALUE 'TERMINATION';
ALTER TYPE "DocumentType" ADD VALUE 'PHOTO_REPORT';

-- DropIndex
DROP INDEX "contracts_number_key";

-- DropIndex
DROP INDEX "properties_number_key";

-- DropIndex
DROP INDEX "tenants_voen_key";

-- DropIndex
DROP INDEX "users_email_key";

-- ─── Step 1: Create organizations table ──────────────────────────────────────
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- ─── Step 2: Insert default organization for existing data ───────────────────
INSERT INTO "organizations" ("id", "name", "slug", "isActive", "createdAt")
VALUES ('default-org-icare-pro', 'İcarə Pro', 'icare-pro', true, NOW());

-- ─── Step 3: Add organizationId as nullable first (backfill safe) ─────────────

ALTER TABLE "users"      ADD COLUMN "organizationId" TEXT;
ALTER TABLE "properties" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "tenants"    ADD COLUMN "organizationId" TEXT;
ALTER TABLE "contracts"  ADD COLUMN "organizationId" TEXT;
ALTER TABLE "payments"   ADD COLUMN "organizationId" TEXT;
ALTER TABLE "expenses"   ADD COLUMN "organizationId" TEXT;
ALTER TABLE "documents"  ADD COLUMN "organizationId" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "organizationId" TEXT;

-- ─── Step 4: Backfill existing rows ──────────────────────────────────────────
UPDATE "users"      SET "organizationId" = 'default-org-icare-pro';
UPDATE "properties" SET "organizationId" = 'default-org-icare-pro';
UPDATE "tenants"    SET "organizationId" = 'default-org-icare-pro';
UPDATE "contracts"  SET "organizationId" = 'default-org-icare-pro';
UPDATE "payments"   SET "organizationId" = 'default-org-icare-pro';
UPDATE "expenses"   SET "organizationId" = 'default-org-icare-pro';
UPDATE "documents"  SET "organizationId" = 'default-org-icare-pro';
UPDATE "audit_logs" SET "organizationId" = 'default-org-icare-pro';

-- ─── Step 5: Set NOT NULL now that all rows are backfilled ───────────────────
ALTER TABLE "users"      ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "properties" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "tenants"    ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "contracts"  ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "payments"   ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "expenses"   ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "documents"  ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "organizationId" SET NOT NULL;

-- ─── Step 6: Add periodMonth / periodYear to payments (with backfill) ─────────
ALTER TABLE "payments" ADD COLUMN "periodMonth" INTEGER;
ALTER TABLE "payments" ADD COLUMN "periodYear"  INTEGER;
UPDATE "payments" SET
    "periodMonth" = EXTRACT(MONTH FROM "paymentDate"),
    "periodYear"  = EXTRACT(YEAR  FROM "paymentDate");
ALTER TABLE "payments" ALTER COLUMN "periodMonth" SET NOT NULL;
ALTER TABLE "payments" ALTER COLUMN "periodYear"  SET NOT NULL;

-- ─── Step 7: Create new tables ────────────────────────────────────────────────

CREATE TABLE "meter_readings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "meterType" "MeterType" NOT NULL,
    "readingDate" DATE NOT NULL,
    "value" DECIMAL(12,3) NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "meter_readings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_photos" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "property_photos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "filePath" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenant_documents_pkey" PRIMARY KEY ("id")
);

-- ─── Step 8: Unique indexes ───────────────────────────────────────────────────
CREATE UNIQUE INDEX "contracts_organizationId_number_key"  ON "contracts"("organizationId", "number");
CREATE UNIQUE INDEX "properties_organizationId_number_key" ON "properties"("organizationId", "number");
CREATE UNIQUE INDEX "tenants_organizationId_voen_key"      ON "tenants"("organizationId", "voen");
CREATE UNIQUE INDEX "users_organizationId_email_key"       ON "users"("organizationId", "email");

-- ─── Step 9: Foreign keys ─────────────────────────────────────────────────────
ALTER TABLE "users"        ADD CONSTRAINT "users_organizationId_fkey"        FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "properties"   ADD CONSTRAINT "properties_organizationId_fkey"   FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenants"      ADD CONSTRAINT "tenants_organizationId_fkey"      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contracts"    ADD CONSTRAINT "contracts_organizationId_fkey"    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments"     ADD CONSTRAINT "payments_organizationId_fkey"     FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expenses"     ADD CONSTRAINT "expenses_organizationId_fkey"     FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "documents"    ADD CONSTRAINT "documents_organizationId_fkey"    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs"   ADD CONSTRAINT "audit_logs_organizationId_fkey"   FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_propertyId_fkey"     FOREIGN KEY ("propertyId")     REFERENCES "properties"("id")    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "property_photos"  ADD CONSTRAINT "property_photos_propertyId_fkey"  FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenant_documents" ADD CONSTRAINT "tenant_documents_tenantId_fkey"   FOREIGN KEY ("tenantId")   REFERENCES "tenants"("id")     ON DELETE RESTRICT ON UPDATE CASCADE;
