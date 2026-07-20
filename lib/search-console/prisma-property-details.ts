import "server-only";

import type { PrismaClient } from "@/lib/generated/prisma/client";
import type { SearchConsolePropertyDetailsRepository } from "@/lib/search-console/property-details";

export function createPrismaSearchConsolePropertyDetailsRepository(
  prisma: PrismaClient
): SearchConsolePropertyDetailsRepository {
  return {
    async getPropertyById(propertyId) {
      const property = await prisma.searchConsoleProperty.findUnique({
        where: { id: propertyId },
        select: {
          id: true,
          organizationId: true,
          siteUrl: true,
          normalizedSiteUrl: true,
          propertyType: true,
          permissionLevel: true,
          verified: true,
          syncStatus: true,
          lastSyncedAt: true,
          lastSeenAt: true,
          removedFromGoogleAt: true,
          createdAt: true,
          updatedAt: true,
          googleAccount: {
            select: {
              id: true,
              organizationId: true,
              email: true,
              displayName: true,
            },
          },
          website: {
            select: {
              id: true,
              name: true,
              domain: true,
              status: true,
            },
          },
        },
      });

      if (!property) {
        return null;
      }

      return {
        ...property,
        website: property.website
          ? {
              ...property.website,
              organizationId: property.organizationId,
            }
          : null,
      };
    },
  };
}
