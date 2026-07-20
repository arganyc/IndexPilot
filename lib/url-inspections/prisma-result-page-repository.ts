import "server-only";

import type { PrismaClient } from "@/lib/generated/prisma/client";
import type { UrlInspectionResultRepository } from "@/lib/url-inspections/result-page";

export function createPrismaUrlInspectionResultRepository(
  prisma: PrismaClient
): UrlInspectionResultRepository {
  return {
    async getWebsiteById(websiteId) {
      return prisma.website.findUnique({
        where: { id: websiteId },
        select: {
          id: true,
          name: true,
          domain: true,
        },
      });
    },
    async getInspectionById(inspectionId) {
      return prisma.urlInspection.findUnique({
        where: { id: inspectionId },
        select: {
          id: true,
          organizationId: true,
          websiteId: true,
          searchConsolePropertyId: true,
          urlRecordId: true,
          inspectedUrl: true,
          requestedAt: true,
          completedAt: true,
          status: true,
          inspectionResultLink: true,
          verdict: true,
          coverageState: true,
          indexingState: true,
          robotsTxtState: true,
          pageFetchState: true,
          googleCanonical: true,
          userCanonical: true,
          lastCrawlTime: true,
          crawledAs: true,
          referringUrls: true,
          sitemapUrls: true,
          errorCode: true,
          errorMessage: true,
          createdAt: true,
          updatedAt: true,
          website: {
            select: {
              id: true,
              name: true,
              domain: true,
            },
          },
          searchConsoleProperty: {
            select: {
              id: true,
              organizationId: true,
              siteUrl: true,
              normalizedSiteUrl: true,
            },
          },
        },
      });
    },
  };
}
