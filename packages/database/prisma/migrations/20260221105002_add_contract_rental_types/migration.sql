-- CreateEnum
CREATE TYPE "OrgPlan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "RentalType" AS ENUM ('RESIDENTIAL_LONG', 'COMMERCIAL', 'RESIDENTIAL_SHORT', 'PARKING', 'SUBLEASE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentType" ADD VALUE 'CARD';
ALTER TYPE "PaymentType" ADD VALUE 'ONLINE';

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "baseRent" DECIMAL(12,2),
ADD COLUMN     "dailyRate" DECIMAL(12,2),
ADD COLUMN     "depositAmount" DECIMAL(12,2),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "parentContractId" TEXT,
ADD COLUMN     "rentalType" "RentalType" NOT NULL DEFAULT 'RESIDENTIAL_LONG',
ADD COLUMN     "revenuePercent" DECIMAL(5,2),
ADD COLUMN     "taxRate" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "meter_readings" ADD COLUMN     "consumption" DECIMAL(12,3);

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "plan" "OrgPlan" NOT NULL DEFAULT 'FREE';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "isPenalty" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "penaltyNote" TEXT,
ADD COLUMN     "periodEnd" DATE,
ADD COLUMN     "periodStart" DATE,
ALTER COLUMN "periodMonth" DROP NOT NULL,
ALTER COLUMN "periodYear" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_parentContractId_fkey" FOREIGN KEY ("parentContractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
