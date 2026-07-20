import "server-only";

import type { PrismaClient } from "@/lib/generated/prisma/client";
import type { InspectionHistoryRepository } from "@/lib/url-inspections/history";

export function createPrismaInspectionHistoryRepository(
  prisma: PrismaClient
): InspectionHistoryRepository {
  return {
    getWebsite({ websiteId }) {
      return prisma.website.findUnique({
        where: { id: websiteId },
        select: {
          id: true,
          name: true,
          domain: true,
          status: true,
        },
      });
    },
    listInspectionPropertyOptions({ websiteId, organizationId }) {
      return prisma.searchConsoleProperty.findMany({
        where: {
          organizationId,
          urlInspections: {
            some: {
              organizationId,
              websiteId,
            },
          },
        },
        distinct: ["id"],
        orderBy: {
          siteUrl: "asc",
        },
        select: {
          id: true,
          siteUrl: true,
        },
      });
    },
    listRecentInspections({
      websiteId,
      organizationId,
      limit,
      search,
      status,
      selectedPropertyId,
    }) {
      return prisma.urlInspection.findMany({
        where: {
          organizationId,
          websiteId,
          ...(selectedPropertyId
            ? { searchConsolePropertyId: selectedPropertyId }
            : {}),
          ...(status ? { status } : {}),
          ...(search
            ? {
                inspectedUrl: {
                  contains: search,
                  mode: "insensitive",
                },
              }
            : {}),
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        select: {
          id: true,
          inspectedUrl: true,
          status: true,
          verdict: true,
          coverageState: true,
          createdAt: true,
          completedAt: true,
          searchConsolePropertyId: true,
          searchConsoleProperty: {
            select: {
              siteUrl: true,
            },
          },
        },
      });
    },
  };
}
