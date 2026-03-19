-- AlterTable: add subType to contracts
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "subType" TEXT;
