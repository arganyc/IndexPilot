-- CreateEnum
CREATE TYPE "SitemapType" AS ENUM ('INDEX', 'URL_SET', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "SitemapStatus" AS ENUM ('PENDING', 'FETCHING', 'IMPORTED', 'FAILED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Sitemap" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "type" "SitemapType" NOT NULL DEFAULT 'UNKNOWN',
    "status" "SitemapStatus" NOT NULL DEFAULT 'PENDING',
    "parentSitemapId" TEXT,
    "urlCount" INTEGER NOT NULL DEFAULT 0,
    "lastFetchedAt" TIMESTAMP(3),
    "lastSuccessfulFetchAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sitemap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UrlRecord" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "sitemapId" TEXT,
    "url" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "sitemapLastModifiedAt" TIMESTAMP(3),
    "firstDiscoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDiscoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UrlRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sitemap_websiteId_normalizedUrl_key" ON "Sitemap"("websiteId", "normalizedUrl");

-- CreateIndex
CREATE INDEX "Sitemap_websiteId_status_idx" ON "Sitemap"("websiteId", "status");

-- CreateIndex
CREATE INDEX "Sitemap_websiteId_type_idx" ON "Sitemap"("websiteId", "type");

-- CreateIndex
CREATE INDEX "Sitemap_parentSitemapId_idx" ON "Sitemap"("parentSitemapId");

-- CreateIndex
CREATE INDEX "Sitemap_lastFetchedAt_idx" ON "Sitemap"("lastFetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UrlRecord_websiteId_normalizedUrl_key" ON "UrlRecord"("websiteId", "normalizedUrl");

-- CreateIndex
CREATE INDEX "UrlRecord_websiteId_path_idx" ON "UrlRecord"("websiteId", "path");

-- CreateIndex
CREATE INDEX "UrlRecord_websiteId_sitemapLastModifiedAt_idx" ON "UrlRecord"("websiteId", "sitemapLastModifiedAt");

-- CreateIndex
CREATE INDEX "UrlRecord_sitemapId_idx" ON "UrlRecord"("sitemapId");

-- AddForeignKey
ALTER TABLE "Sitemap" ADD CONSTRAINT "Sitemap_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sitemap" ADD CONSTRAINT "Sitemap_parentSitemapId_fkey" FOREIGN KEY ("parentSitemapId") REFERENCES "Sitemap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UrlRecord" ADD CONSTRAINT "UrlRecord_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UrlRecord" ADD CONSTRAINT "UrlRecord_sitemapId_fkey" FOREIGN KEY ("sitemapId") REFERENCES "Sitemap"("id") ON DELETE SET NULL ON UPDATE CASCADE;
