import "server-only";

import type { PrismaClient } from "@/lib/generated/prisma/client";
import type { UrlInspectionFormRepository } from "@/lib/url-inspections/form-page";

export function createPrismaUrlInspectionFormRepository(
  prisma: PrismaClient
): UrlInspectionFormRepository {
  return {
    getWebsite({ websiteId }) {
      return prisma.website.findUnique({
        where: { id: websiteId },
        select: {
          id: true,
          name: true,
          domain: true,
          normalizedDomain: true,
          status: true,
        },
      });
    },
    countGoogleAccounts({ organizationId }) {
      return prisma.googleAccount.count({ where: { organizationId } });
    },
    listSearchConsoleProperties({ organizationId }) {
      return prisma.searchConsoleProperty.findMany({
        where: {
          organizationId,
          syncStatus: "ACTIVE",
          verified: true,
        },
        orderBy: [{ siteUrl: "asc" }, { id: "asc" }],
        select: {
          id: true,
          organizationId: true,
          siteUrl: true,
          normalizedSiteUrl: true,
          propertyType: true,
          verified: true,
          syncStatus: true,
          googleAccount: {
            select: {
              email: true,
            },
          },
        },
      });
    },
    getUrlRecord({ websiteId, urlRecordId }) {
      return prisma.urlRecord.findFirst({
        where: { id: urlRecordId, websiteId },
        select: {
          id: true,
          websiteId: true,
          url: true,
        },
      });
    },
  };
}
