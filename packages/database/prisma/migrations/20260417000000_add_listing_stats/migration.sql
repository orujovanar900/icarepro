-- Add listing stats fields
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "listingNumber" SERIAL;
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "phoneRevealCount" INTEGER NOT NULL DEFAULT 0;

-- Make listingNumber unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listings_listingNumber_key'
  ) THEN
    ALTER TABLE "listings" ADD CONSTRAINT "listings_listingNumber_key" UNIQUE ("listingNumber");
  END IF;
END $$;
