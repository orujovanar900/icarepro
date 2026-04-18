-- Add roommate preference fields + configurable ad duration
ALTER TABLE "roommate_ads"
  ADD COLUMN "acceptsSmoker"  BOOLEAN,
  ADD COLUMN "acceptsPets"    BOOLEAN,
  ADD COLUMN "adDurationDays" INTEGER NOT NULL DEFAULT 60;
