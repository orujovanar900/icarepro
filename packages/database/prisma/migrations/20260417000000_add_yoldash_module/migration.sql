-- CreateTable
CREATE TABLE "roommate_ads" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "districts" TEXT[],
    "budgetMin" INTEGER NOT NULL,
    "budgetMax" INTEGER NOT NULL,
    "startMonth" INTEGER NOT NULL,
    "startYear" INTEGER NOT NULL,
    "durationMonths" INTEGER,
    "isLongTerm" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "telegram" TEXT,
    "photoUrl" TEXT,
    "occupation" TEXT,
    "smokes" BOOLEAN,
    "hasPets" BOOLEAN,
    "schedule" TEXT,
    "guests" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roommate_ads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "roommate_ads_status_idx" ON "roommate_ads"("status");

-- CreateIndex
CREATE INDEX "roommate_ads_createdAt_idx" ON "roommate_ads"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "roommate_ads" ADD CONSTRAINT "roommate_ads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
