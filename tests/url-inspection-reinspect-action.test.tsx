import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  UrlInspectionDetailsRecord,
  UrlInspectionDetailsWebsite,
} from "../lib/url-inspections/details-page";

type InspectionFixture = UrlInspectionDetailsRecord & {
  id: string;
  organizationId: string;
  websiteId: string;
  searchConsolePropertyId: string;
};

const mockState = vi.hoisted(() => ({
  authFails: false,
  organizationId: "org-1",
  websites: [] as UrlInspectionDetailsWebsite[],
  inspections: [] as InspectionFixture[],
  workflowCalls: [] as Array<{
    input: {
      websiteId: string;
      searchConsolePropertyId: string;
      inspectedUrl: string;
      urlRecordId?: string;
    };
    repository: unknown;
    googleClient: unknown;
  }>,
  workflowResult: {
    outcome: "completed" as const,
    inspectionId: "new-inspection-1",
  },
  singleInspectionRepository: { kind: "single-inspection-repository" },
  singleInspectionGoogleClient: { kind: "single-inspection-google-client" },
  redirects: [] as string[],
}));

vi.mock("@/lib/auth/organization", () => ({
  getCurrentOrganizationContext: async () => {
    if (mockState.authFails) {
      throw new Error("Authentication is required.");
    }

    return {
      userId: "user-1",
      organizationId: mockState.organizationId,
    };
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    website: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        mockState.websites.find((website) => website.id === where.id) ?? null,
    },
    urlInspection: {
      findFirst: async ({
        where,
        select,
      }: {
        where: { id: string; websiteId: string; organizationId: string };
        select?: Record<string, boolean>;
      }) => {
        const inspection =
          mockState.inspections.find(
            (inspection) =>
              inspection.id === where.id &&
              inspection.websiteId === where.websiteId &&
              inspection.organizationId === where.organizationId
          ) ?? null;

        if (!inspection) {
          return null;
        }

        if (select) {
          return Object.fromEntries(
            Object.entries(select)
              .filter(([, selected]) => selected)
              .map(([field]) => [
                field,
                inspection[field as keyof InspectionFixture],
              ])
          );
        }

        return inspection;
      },
    },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    mockState.redirects.push(href);
    throw new Error(`NEXT_REDIRECT:${href}`);
  },
}));

vi.mock("@/lib/url-inspections/prisma-service-repository", () => ({
  createPrismaSingleUrlInspectionRepository: () =>
    mockState.singleInspectionRepository,
  createPrismaSingleUrlInspectionGoogleClient: () =>
    mockState.singleInspectionGoogleClient,
}));

vi.mock("@/lib/url-inspections/service", () => ({
  runSingleUrlInspection: async ({
    input,
    repository,
    googleClient,
  }: {
    input: {
      websiteId: string;
      searchConsolePropertyId: string;
      inspectedUrl: string;
      urlRecordId?: string;
    };
    repository: unknown;
    googleClient: unknown;
  }) => {
    mockState.workflowCalls.push({ input, repository, googleClient });

    return mockState.workflowResult;
  },
}));

function websiteFixture(
  input: Partial<UrlInspectionDetailsWebsite> = {}
): UrlInspectionDetailsWebsite {
  return {
    id: input.id ?? "website-1",
    organizationId: input.organizationId ?? "org-1",
  };
}

function inspectionFixture(
  input: Partial<InspectionFixture> = {}
): InspectionFixture {
  return {
    id: input.id ?? "inspection-1",
    organizationId: input.organizationId ?? "org-1",
    websiteId: input.websiteId ?? "website-1",
    searchConsolePropertyId:
      input.searchConsolePropertyId ?? "property-from-db",
    inspectedUrl: input.inspectedUrl ?? "https://example.com/page",
    status: input.status ?? "COMPLETED",
    verdict: input.verdict ?? "PASS",
    coverageState: input.coverageState ?? "Submitted and indexed",
    indexingState: input.indexingState ?? "INDEXING_ALLOWED",
    robotsTxtState: input.robotsTxtState ?? "ALLOWED",
    createdAt: input.createdAt ?? new Date("2026-07-18T12:00:00.000Z"),
    updatedAt: input.updatedAt ?? new Date("2026-07-18T12:01:00.000Z"),
    completedAt: input.completedAt ?? new Date("2026-07-18T12:01:00.000Z"),
    pageFetchState: input.pageFetchState ?? "SUCCESSFUL",
    crawledAs: input.crawledAs ?? "MOBILE",
    userCanonical: input.userCanonical ?? "https://example.com/user-canonical",
    googleCanonical:
      input.googleCanonical ?? "https://example.com/google-canonical",
    lastCrawlTime:
      input.lastCrawlTime ?? new Date("2026-07-17T18:30:00.000Z"),
  };
}

async function reinspect({
  websiteId = "website-1",
  inspectionId = "inspection-1",
}: {
  websiteId?: string;
  inspectionId?: string;
} = {}) {
  const { reinspectSavedUrlInspection } = await import(
    "../app/(app)/websites/[id]/inspections/[inspectionId]/actions"
  );

  return reinspectSavedUrlInspection({ websiteId, inspectionId });
}

beforeEach(() => {
  vi.resetModules();
  mockState.authFails = false;
  mockState.organizationId = "org-1";
  mockState.websites = [websiteFixture()];
  mockState.inspections = [inspectionFixture()];
  mockState.workflowCalls = [];
  mockState.redirects = [];
});

describe("reinspect ownership validation", () => {
  it("passes for valid ownership", async () => {
    await expect(reinspect()).resolves.toEqual({
      ok: true,
      inspectedUrl: "https://example.com/page",
      searchConsolePropertyId: "property-from-db",
      result: {
        outcome: "completed",
        inspectionId: "new-inspection-1",
      },
    });
  });

  it("rejects the wrong website", async () => {
    mockState.inspections = [inspectionFixture({ websiteId: "website-2" })];

    await expect(reinspect()).resolves.toEqual({
      ok: false,
      reason: "NOT_FOUND",
    });
  });

  it("rejects the wrong organization", async () => {
    mockState.inspections = [inspectionFixture({ organizationId: "org-2" })];

    await expect(reinspect()).resolves.toEqual({
      ok: false,
      reason: "NOT_FOUND",
    });
  });

  it("rejects a missing inspection", async () => {
    mockState.inspections = [];

    await expect(reinspect()).resolves.toEqual({
      ok: false,
      reason: "NOT_FOUND",
    });
  });

  it("loads the inspected URL from the database", async () => {
    mockState.inspections = [
      inspectionFixture({ inspectedUrl: "https://db.example.com/trusted" }),
    ];

    await expect(reinspect()).resolves.toMatchObject({
      ok: true,
      inspectedUrl: "https://db.example.com/trusted",
    });
  });

  it("loads the Search Console property from the database", async () => {
    mockState.inspections = [
      inspectionFixture({ searchConsolePropertyId: "property-db" }),
    ];

    await expect(reinspect()).resolves.toMatchObject({
      ok: true,
      searchConsolePropertyId: "property-db",
    });
  });

  it("ignores client-supplied inspected URL and property values", async () => {
    mockState.inspections = [
      inspectionFixture({
        inspectedUrl: "https://db.example.com/trusted",
        searchConsolePropertyId: "property-db",
      }),
    ];
    const { reinspectSavedUrlInspection } = await import(
      "../app/(app)/websites/[id]/inspections/[inspectionId]/actions"
    );

    const result = await reinspectSavedUrlInspection({
      websiteId: "website-1",
      inspectionId: "inspection-1",
      inspectedUrl: "https://client.example.com/untrusted",
      searchConsolePropertyId: "property-client",
    } as unknown as Parameters<typeof reinspectSavedUrlInspection>[0]);

    expect(result).toEqual({
      ok: true,
      inspectedUrl: "https://db.example.com/trusted",
      searchConsolePropertyId: "property-db",
      result: {
        outcome: "completed",
        inspectionId: "new-inspection-1",
      },
    });
    expect(mockState.workflowCalls[0]?.input).toEqual({
      websiteId: "website-1",
      inspectedUrl: "https://db.example.com/trusted",
      searchConsolePropertyId: "property-db",
    });
  });

  it("calls the existing inspection workflow", async () => {
    await reinspect();

    expect(mockState.workflowCalls).toHaveLength(1);
    expect(mockState.workflowCalls[0]).toMatchObject({
      input: {
        websiteId: "website-1",
        inspectedUrl: "https://example.com/page",
        searchConsolePropertyId: "property-from-db",
      },
      repository: mockState.singleInspectionRepository,
      googleClient: mockState.singleInspectionGoogleClient,
    });
  });

  it("returns the successful workflow result", async () => {
    await expect(reinspect()).resolves.toMatchObject({
      ok: true,
      result: {
        outcome: "completed",
        inspectionId: "new-inspection-1",
      },
    });
  });

  it("submits through the server action and runs the existing workflow", async () => {
    const { submitReinspectSavedUrlInspection } = await import(
      "../app/(app)/websites/[id]/inspections/[inspectionId]/actions"
    );

    await expect(
      submitReinspectSavedUrlInspection({
        websiteId: "website-1",
        inspectionId: "inspection-1",
      })
    ).rejects.toThrow("NEXT_REDIRECT:/websites/website-1/inspections/new-inspection-1");

    expect(mockState.workflowCalls).toHaveLength(1);
  });

  it("navigates to the new inspection result after successful reinspection", async () => {
    const { submitReinspectSavedUrlInspection } = await import(
      "../app/(app)/websites/[id]/inspections/[inspectionId]/actions"
    );

    await expect(
      submitReinspectSavedUrlInspection({
        websiteId: "website-1",
        inspectionId: "inspection-1",
      })
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockState.redirects).toEqual([
      "/websites/website-1/inspections/new-inspection-1",
    ]);
  });
});
