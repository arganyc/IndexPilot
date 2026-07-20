import "server-only";

import { Prisma, type PrismaClient } from "@/lib/generated/prisma/client";
import {
  inspectUrlWithGoogle,
  type UrlInspectionClientResult,
} from "@/lib/url-inspections/google-client";
import { createPrismaUrlInspectionGoogleRepository } from "@/lib/url-inspections/prisma-google-client-repository";
import {
  DuplicateActiveInspectionError,
  activeSingleUrlInspectionStatuses,
  type CreatePendingInspectionData,
  type RunGoogleSingleUrlInspection,
  type SingleUrlInspectionRepository,
} from "@/lib/url-inspections/service";

export function createPrismaSingleUrlInspectionRepository(
  prisma: PrismaClient
): SingleUrlInspectionRepository {
  return {
    getWebsite({ websiteId }) {
      return prisma.website.findUnique({
        where: { id: websiteId },
        select: {
          id: true,
          domain: true,
          normalizedDomain: true,
        },
      });
    },
    getSearchConsoleProperty({ searchConsolePropertyId, organizationId }) {
      return prisma.searchConsoleProperty.findFirst({
        where: { id: searchConsolePropertyId, organizationId },
        select: {
          id: true,
          organizationId: true,
          googleAccountId: true,
          websiteId: true,
          siteUrl: true,
          propertyType: true,
          verified: true,
          syncStatus: true,
        },
      });
    },
    getUrlRecord({ urlRecordId, websiteId }) {
      return prisma.urlRecord.findFirst({
        where: { id: urlRecordId, websiteId },
        select: {
          id: true,
          websiteId: true,
          normalizedUrl: true,
        },
      });
    },
    findActiveInspection(input) {
      return prisma.urlInspection.findFirst({
        where: createActiveInspectionWhere(input),
        orderBy: { requestedAt: "desc" },
        select: { id: true, status: true },
      });
    },
    async createPendingInspection(data) {
      try {
        return await prisma.$transaction(async (tx) => {
          await tx.organization.upsert({
            where: { id: data.organizationId },
            create: { id: data.organizationId },
            update: {},
          });

          const existing = await tx.urlInspection.findFirst({
            where: createActiveInspectionWhere(data),
            orderBy: { requestedAt: "desc" },
            select: { id: true, status: true },
          });

          if (existing) {
            throw new DuplicateActiveInspectionError(existing.id);
          }

          return tx.urlInspection.create({
            data: {
              organizationId: data.organizationId,
              websiteId: data.websiteId,
              searchConsolePropertyId: data.searchConsolePropertyId,
              urlRecordId: data.urlRecordId ?? null,
              inspectedUrl: data.inspectedUrl,
              normalizedUrl: data.normalizedUrl,
              requestedAt: data.requestedAt,
              status: "PENDING",
            },
            select: { id: true, status: true },
          });
        });
      } catch (error) {
        if (error instanceof DuplicateActiveInspectionError) {
          throw error;
        }

        if (isPrismaUniqueConstraintError(error)) {
          const existing = await prisma.urlInspection.findFirst({
            where: createActiveInspectionWhere(data),
            orderBy: { requestedAt: "desc" },
            select: { id: true },
          });

          if (existing) {
            throw new DuplicateActiveInspectionError(existing.id);
          }
        }

        throw error;
      }
    },
    async markInspectionRunning({ inspectionId, organizationId }) {
      await prisma.urlInspection.updateMany({
        where: { id: inspectionId, organizationId },
        data: { status: "RUNNING" },
      });
    },
    async saveCompletedInspection({ inspectionId, organizationId, completedAt, result }) {
      await prisma.urlInspection.updateMany({
        where: { id: inspectionId, organizationId },
        data: {
          completedAt,
          status: "COMPLETED",
          inspectionResultLink: result.inspectionResultLink,
          verdict: result.verdict,
          coverageState: result.coverageState,
          indexingState: result.indexingState,
          robotsTxtState: result.robotsTxtState,
          pageFetchState: result.pageFetchState,
          googleCanonical: result.googleCanonical,
          userCanonical: result.userCanonical,
          lastCrawlTime: result.lastCrawlTime,
          crawledAs: result.crawledAs,
          referringUrls: result.referringUrls,
          sitemapUrls: result.sitemapUrls,
          rawResponse: result.rawResponse as Prisma.InputJsonValue,
          errorCode: null,
          errorMessage: null,
        },
      });
    },
    async saveFailedInspection({ inspectionId, organizationId, completedAt, result }) {
      await prisma.urlInspection.updateMany({
        where: { id: inspectionId, organizationId },
        data: {
          completedAt,
          status: "FAILED",
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
        },
      });
    },
  };
}

export function createPrismaSingleUrlInspectionGoogleClient(
  prisma: PrismaClient
): RunGoogleSingleUrlInspection {
  const repository = createPrismaUrlInspectionGoogleRepository(prisma);

  return (input): Promise<UrlInspectionClientResult> =>
    inspectUrlWithGoogle({
      ...input,
      repository,
    });
}

function createActiveInspectionWhere({
  organizationId,
  searchConsolePropertyId,
  normalizedUrl,
}: Pick<
  CreatePendingInspectionData,
  "organizationId" | "searchConsolePropertyId" | "normalizedUrl"
>) {
  return {
    organizationId,
    searchConsolePropertyId,
    normalizedUrl,
    status: { in: [...activeSingleUrlInspectionStatuses] },
  };
}

function isPrismaUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
