import { describe, expect, it } from "vitest";

import type { PrismaClient } from "../lib/generated/prisma/client";
import {
  createPrismaFirstCompletedInspectionRepository,
  isFirstCompletedInspection,
  type EarlierCompletedInspectionInput,
  type FirstCompletedInspectionCandidate,
  type FirstCompletedInspectionRepository,
} from "../lib/url-inspections/first-completed-inspection";
import type { UrlInspectionStatus } from "../lib/url-inspections/validation";

type StoredInspection = FirstCompletedInspectionCandidate;

class FakeFirstCompletedInspectionRepository
  implements FirstCompletedInspectionRepository
{
  inspections: StoredInspection[] = [];
  calls: EarlierCompletedInspectionInput[] = [];
  throwOnLookup = false;

  async hasEarlierCompletedInspection(input: EarlierCompletedInspectionInput) {
    this.calls.push(input);

    if (this.throwOnLookup) {
      throw new Error("database unavailable");
    }

    return this.inspections.some((inspection) => {
      if (
        inspection.organizationId !== input.organizationId ||
        inspection.id === input.currentInspectionId ||
        inspection.status !== "COMPLETED" ||
        !inspection.completedAt
      ) {
        return false;
      }

      if (inspection.completedAt.getTime() < input.completedAt.getTime()) {
        return true;
      }

      return (
        inspection.completedAt.getTime() === input.completedAt.getTime() &&
        inspection.id < input.currentInspectionId
      );
    });
  }
}

function inspectionFixture(
  input: Partial<StoredInspection> = {}
): StoredInspection {
  return {
    id: input.id ?? "inspection-2",
    organizationId: input.organizationId ?? "org-1",
    status: input.status ?? "COMPLETED",
    completedAt:
      input.completedAt === undefined
        ? new Date("2026-07-18T12:00:00.000Z")
        : input.completedAt,
  };
}

async function checkFirstCompletedInspection({
  inspection = inspectionFixture(),
  earlierInspections = [],
  throwOnLookup = false,
}: {
  inspection?: FirstCompletedInspectionCandidate;
  earlierInspections?: StoredInspection[];
  throwOnLookup?: boolean;
} = {}) {
  const repository = new FakeFirstCompletedInspectionRepository();
  repository.inspections = earlierInspections;
  repository.throwOnLookup = throwOnLookup;

  const result = await isFirstCompletedInspection({
    inspection,
    repository,
  });

  return { result, repository };
}

describe("first completed URL inspection detection", () => {
  it("returns true for the first successful completed inspection", async () => {
    const { result } = await checkFirstCompletedInspection();

    expect(result).toBe(true);
  });

  it("returns false for a second completed inspection", async () => {
    const { result } = await checkFirstCompletedInspection({
      earlierInspections: [
        inspectionFixture({
          id: "inspection-1",
          completedAt: new Date("2026-07-18T11:00:00.000Z"),
        }),
      ],
    });

    expect(result).toBe(false);
  });

  it("ignores earlier failed inspections", async () => {
    const { result } = await checkFirstCompletedInspection({
      earlierInspections: [
        inspectionFixture({
          id: "inspection-1",
          status: "FAILED",
          completedAt: new Date("2026-07-18T11:00:00.000Z"),
        }),
      ],
    });

    expect(result).toBe(true);
  });

  it("ignores earlier pending inspections", async () => {
    const { result } = await checkFirstCompletedInspection({
      earlierInspections: [
        inspectionFixture({
          id: "inspection-1",
          status: "PENDING",
          completedAt: null,
        }),
      ],
    });

    expect(result).toBe(true);
  });

  it("ignores another user's organization-scoped inspection", async () => {
    const { result } = await checkFirstCompletedInspection({
      earlierInspections: [
        inspectionFixture({
          id: "inspection-1",
          organizationId: "org-2",
          completedAt: new Date("2026-07-18T11:00:00.000Z"),
        }),
      ],
    });

    expect(result).toBe(true);
  });

  it("does not classify a later inspection as first", async () => {
    const { result } = await checkFirstCompletedInspection({
      inspection: inspectionFixture({
        id: "inspection-2",
        completedAt: new Date("2026-07-18T12:00:00.000Z"),
      }),
      earlierInspections: [
        inspectionFixture({
          id: "inspection-1",
          completedAt: new Date("2026-07-18T12:00:00.000Z"),
        }),
      ],
    });

    expect(result).toBe(false);
  });

  it("returns false safely for non-completed current inspections", async () => {
    const { result, repository } = await checkFirstCompletedInspection({
      inspection: inspectionFixture({ status: "FAILED" }),
    });

    expect(result).toBe(false);
    expect(repository.calls).toHaveLength(0);
  });

  it("returns false safely when completion data is missing", async () => {
    const { result, repository } = await checkFirstCompletedInspection({
      inspection: inspectionFixture({ completedAt: null }),
    });

    expect(result).toBe(false);
    expect(repository.calls).toHaveLength(0);
  });

  it("returns false safely when the lookup cannot be determined", async () => {
    const { result } = await checkFirstCompletedInspection({
      throwOnLookup: true,
    });

    expect(result).toBe(false);
  });

  it("uses a scoped existence query in the Prisma repository", async () => {
    let findFirstArgs: unknown = null;
    const prisma = {
      urlInspection: {
        findFirst: async (args: unknown) => {
          findFirstArgs = args;

          return null;
        },
      },
    } as unknown as PrismaClient;
    const repository = createPrismaFirstCompletedInspectionRepository(prisma);

    await repository.hasEarlierCompletedInspection({
      organizationId: "org-1",
      currentInspectionId: "inspection-2",
      completedAt: new Date("2026-07-18T12:00:00.000Z"),
    });

    expect(findFirstArgs).toEqual({
      where: {
        organizationId: "org-1",
        status: "COMPLETED" satisfies UrlInspectionStatus,
        id: {
          not: "inspection-2",
        },
        OR: [
          {
            completedAt: {
              lt: new Date("2026-07-18T12:00:00.000Z"),
            },
          },
          {
            completedAt: new Date("2026-07-18T12:00:00.000Z"),
            id: {
              lt: "inspection-2",
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
  });
});
