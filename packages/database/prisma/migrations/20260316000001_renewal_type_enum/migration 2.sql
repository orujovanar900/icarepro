CREATE TYPE "RenewalType" AS ENUM ('SAME_PERIOD', 'MONTHLY');
ALTER TABLE "Contract" ALTER COLUMN "renewalType" TYPE "RenewalType" USING "renewalType"::"RenewalType";
