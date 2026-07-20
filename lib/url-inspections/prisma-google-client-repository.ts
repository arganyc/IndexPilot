import "server-only";

import type { PrismaClient } from "@/lib/generated/prisma/client";
import type { UrlInspectionGoogleRepository } from "@/lib/url-inspections/google-client";

export function createPrismaUrlInspectionGoogleRepository(
  prisma: PrismaClient
): UrlInspectionGoogleRepository {
  return {
    getGoogleAccount({ organizationId, googleAccountId }) {
      return prisma.googleAccount.findFirst({
        where: { id: googleAccountId, organizationId },
      });
    },
    getSearchConsoleProperty({ organizationId, searchConsolePropertyId }) {
      return prisma.searchConsoleProperty.findFirst({
        where: { id: searchConsolePropertyId, organizationId },
        select: {
          id: true,
          organizationId: true,
          googleAccountId: true,
          siteUrl: true,
          propertyType: true,
          verified: true,
          syncStatus: true,
        },
      });
    },
    async updateTokens(input) {
      await prisma.googleAccount.update({
        where: { id: input.accountId, organizationId: input.organizationId },
        data: {
          accessToken: input.encryptedAccessToken,
          ...(input.encryptedRefreshToken
            ? { refreshToken: input.encryptedRefreshToken }
            : {}),
          tokenExpiresAt: input.tokenExpiresAt,
        },
        select: { id: true },
      });
    },
  };
}
