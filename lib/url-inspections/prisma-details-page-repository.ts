import "server-only";

import type { PrismaClient } from "@/lib/generated/prisma/client";
import type { UrlInspectionDetailsRepository } from "@/lib/url-inspections/details-page";

export function createPrismaUrlInspectionDetailsRepository(
  prisma: PrismaClient
): UrlInspectionDetailsRepository {
  return {
    getWebsiteById(websiteId) {
      return prisma.website.findUnique({
        where: { id: websiteId },
        select: {
          id: true,
        },
      });
    },
    getInspectionDetails({ websiteId, inspectionId, organizationId }) {
      return prisma.urlInspection.findFirst({
        where: {
          id: inspectionId,
          websiteId,
          organizationId,
        },
        select: {
          inspectedUrl: true,
          status: true,
          verdict: true,
          coverageState: true,
          indexingState: true,
          robotsTxtState: true,
          createdAt: true,
          updatedAt: true,
          completedAt: true,
          pageFetchState: true,
          crawledAs: true,
          userCanonical: true,
          googleCanonical: true,
          lastCrawlTime: true,
        },
      });
    },
  };
}
