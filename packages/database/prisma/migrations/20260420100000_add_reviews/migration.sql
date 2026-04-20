-- Add rating aggregates to users
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "averageRating" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "totalReviews"  INTEGER NOT NULL DEFAULT 0;

-- Reviews table
CREATE TABLE IF NOT EXISTS "reviews" (
  "id"        TEXT NOT NULL,
  "authorId"  TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "rating"    INTEGER NOT NULL,
  "comment"   TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "reviews_authorId_subjectId_key" ON "reviews"("authorId", "subjectId");
CREATE INDEX IF NOT EXISTS "reviews_subjectId_idx" ON "reviews"("subjectId");
CREATE INDEX IF NOT EXISTS "reviews_authorId_idx" ON "reviews"("authorId");

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
