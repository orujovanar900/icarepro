-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('VACANT', 'OCCUPIED', 'UNDER_REPAIR');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentType" ADD VALUE 'PASSPORT';
ALTER TYPE "DocumentType" ADD VALUE 'OWNERSHIP_CERT';
ALTER TYPE "DocumentType" ADD VALUE 'TEX_PASSPORT';

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "autoRenewal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gracePeriodDays" INTEGER DEFAULT 0,
ADD COLUMN     "isDepositReturned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lateFeePercentage" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "status" "PropertyStatus" NOT NULL DEFAULT 'VACANT';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "jwtVersion" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "property_documents" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "filePath" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_documents_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "property_documents" ADD CONSTRAINT "property_documents_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
