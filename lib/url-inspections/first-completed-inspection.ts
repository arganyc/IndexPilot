import "server-only";

import type { PrismaClient } from "@/lib/generated/prisma/client";
import type { UrlInspectionStatus } from "@/lib/url-inspections/validation";

export type FirstCompletedInspectionCandidate = {
  id: string;
  organizationId: string;
  status: UrlInspectionStatus;
  completedAt: Date | null;
};

export type EarlierCompletedInspectionInput = {
  organizationId: string;
  currentInspectionId: string;
  completedAt: Date;
};

export type FirstCompletedInspectionRepository = {
  hasEarlierCompletedInspection: (
    input: EarlierCompletedInspectionInput
  ) => Promise<boolean>;
};

export async function isFirstCompletedInspection({
  inspection,
  repository,
}: {
  inspection: FirstCompletedInspectionCandidate;
  repository: FirstCompletedInspectionRepository;
}) {
  if (
    inspection.status !== "COMPLETED" ||
    !inspection.id ||
    !inspection.organizationId ||
    !isUsableDate(inspection.completedAt)
  ) {
    return false;
  }

  try {
    const hasEarlierCompletedInspection =
      await repository.hasEarlierCompletedInspection({
        organizationId: inspection.organizationId,
        currentInspectionId: inspection.id,
        completedAt: inspection.completedAt,
      });

    return !hasEarlierCompletedInspection;
  } catch {
    return false;
  }
}

export function createPrismaFirstCompletedInspectionRepository(
  prisma: PrismaClient
): FirstCompletedInspectionRepository {
  return {
    async hasEarlierCompletedInspection({
      organizationId,
      currentInspectionId,
      completedAt,
    }) {
      const earlierInspection = await prisma.urlInspection.findFirst({
        where: {
          organizationId,
          status: "COMPLETED",
          id: {
            not: currentInspectionId,
          },
          OR: [
            {
              completedAt: {
                lt: completedAt,
              },
            },
            {
              completedAt,
              id: {
                lt: currentInspectionId,
              },
            },
          ],
        },
        orderBy: [
          {
            completedAt: "asc",
          },
          {
            id: "asc",
          },
        ],
        select: {
          id: true,
        },
      });

      return earlierInspection !== null;
    },
  };
}

function isUsableDate(value: Date | null): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}
