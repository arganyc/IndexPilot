-- CreateEnum
CREATE TYPE "UrlInspectionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- Backfill organization records from existing organization-scoped data.
INSERT INTO "Organization" ("id")
SELECT DISTINCT "organizationId"
FROM "GoogleAccount"
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Organization" ("id")
SELECT DISTINCT "organizationId"
FROM "SearchConsoleProperty"
ON CONFLICT ("id") DO NOTHING;

-- CreateTable
CREATE TABLE "UrlInspection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "searchConsolePropertyId" TEXT NOT NULL,
    "urlRecordId" TEXT,
    "inspectedUrl" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" "UrlInspectionStatus" NOT NULL DEFAULT 'PENDING',
    "inspectionResultLink" TEXT,
    "verdict" TEXT,
    "coverageState" TEXT,
    "indexingState" TEXT,
    "robotsTxtState" TEXT,
    "pageFetchState" TEXT,
    "googleCanonical" TEXT,
    "userCanonical" TEXT,
    "lastCrawlTime" TIMESTAMP(3),
    "crawledAs" TEXT,
    "referringUrls" JSONB,
    "sitemapUrls" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UrlInspection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UrlInspection_organizationId_idx" ON "UrlInspection"("organizationId");

-- CreateIndex
CREATE INDEX "UrlInspection_websiteId_idx" ON "UrlInspection"("websiteId");

-- CreateIndex
CREATE INDEX "UrlInspection_searchConsolePropertyId_idx" ON "UrlInspection"("searchConsolePropertyId");

-- CreateIndex
CREATE INDEX "UrlInspection_urlRecordId_idx" ON "UrlInspection"("urlRecordId");

-- CreateIndex
CREATE INDEX "UrlInspection_normalizedUrl_idx" ON "UrlInspection"("normalizedUrl");

-- CreateIndex
CREATE INDEX "UrlInspection_status_idx" ON "UrlInspection"("status");

-- CreateIndex
CREATE INDEX "UrlInspection_requestedAt_idx" ON "UrlInspection"("requestedAt");

-- CreateIndex
CREATE INDEX "UrlInspection_completedAt_idx" ON "UrlInspection"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UrlInspection_active_unique" ON "UrlInspection"("organizationId", "searchConsolePropertyId", "normalizedUrl")
WHERE "status" IN ('PENDING', 'RUNNING');

-- AddForeignKey
ALTER TABLE "UrlInspection" ADD CONSTRAINT "UrlInspection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UrlInspection" ADD CONSTRAINT "UrlInspection_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UrlInspection" ADD CONSTRAINT "UrlInspection_searchConsolePropertyId_fkey" FOREIGN KEY ("searchConsolePropertyId") REFERENCES "SearchConsoleProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UrlInspection" ADD CONSTRAINT "UrlInspection_urlRecordId_fkey" FOREIGN KEY ("urlRecordId") REFERENCES "UrlRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
