-- CreateEnum
CREATE TYPE "SearchConsolePropertySyncStatus" AS ENUM ('ACTIVE', 'MISSING', 'ERROR');

-- Drop old raw siteUrl uniqueness before switching to normalized identity.
DROP INDEX IF EXISTS "SearchConsoleProperty_googleAccountId_siteUrl_key";
DROP INDEX IF EXISTS "SearchConsoleProperty_organizationId_siteUrl_idx";

-- AlterTable
ALTER TABLE "SearchConsoleProperty"
ADD COLUMN "websiteId" TEXT,
ADD COLUMN "normalizedSiteUrl" TEXT,
ADD COLUMN "syncStatus" "SearchConsolePropertySyncStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN "lastSeenAt" TIMESTAMP(3),
ADD COLUMN "removedFromGoogleAt" TIMESTAMP(3);

-- Backfill existing rows.
UPDATE "SearchConsoleProperty"
SET
  "normalizedSiteUrl" = "siteUrl",
  "lastSyncedAt" = "updatedAt",
  "lastSeenAt" = "updatedAt"
WHERE "normalizedSiteUrl" IS NULL;

-- Enforce required sync fields after backfill.
ALTER TABLE "SearchConsoleProperty"
ALTER COLUMN "normalizedSiteUrl" SET NOT NULL,
ALTER COLUMN "lastSyncedAt" SET NOT NULL,
ALTER COLUMN "lastSeenAt" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SearchConsoleProperty_googleAccountId_normalizedSiteUrl_key" ON "SearchConsoleProperty"("googleAccountId", "normalizedSiteUrl");

-- CreateIndex
CREATE INDEX "SearchConsoleProperty_websiteId_idx" ON "SearchConsoleProperty"("websiteId");

-- CreateIndex
CREATE INDEX "SearchConsoleProperty_syncStatus_idx" ON "SearchConsoleProperty"("syncStatus");

-- CreateIndex
CREATE INDEX "SearchConsoleProperty_organizationId_normalizedSiteUrl_idx" ON "SearchConsoleProperty"("organizationId", "normalizedSiteUrl");

-- CreateIndex
CREATE INDEX "SearchConsoleProperty_googleAccountId_syncStatus_idx" ON "SearchConsoleProperty"("googleAccountId", "syncStatus");

-- AddForeignKey
ALTER TABLE "SearchConsoleProperty" ADD CONSTRAINT "SearchConsoleProperty_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE SET NULL ON UPDATE CASCADE;
