import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getInspectionHistoryPageData,
  normalizeInspectionHistoryStatus,
  normalizeInspectionHistoryPropertyCandidate,
  validateInspectionHistoryPropertyId,
  type InspectionHistoryItem,
  type InspectionHistoryPropertyOption,
  type InspectionHistoryRepository,
  type InspectionHistoryWebsite,
} from "../lib/url-inspections/history";

type InspectionFixture = InspectionHistoryItem & {
  organizationId: string;
  websiteId: string;
  rawResponse?: unknown;
};

type PropertyFixture = InspectionHistoryPropertyOption & {
  organizationId: string;
  accessToken?: string;
  refreshToken?: string;
  credentials?: string;
};

const mockState = vi.hoisted(() => ({
  organizationId: "org-1",
  websites: [] as InspectionHistoryWebsite[],
  inspections: [] as InspectionFixture[],
  properties: [] as PropertyFixture[],
  lastFindManyArgs: null as unknown,
  lastPropertyFindManyArgs: null as unknown,
  lastPropertyResults: [] as InspectionHistoryPropertyOption[],
  forceEmptyInspectionResults: false,
}));

vi.mock("@/lib/auth/organization", () => ({
  getCurrentOrganizationContext: async () => ({
    userId: "user-1",
    organizationId: mockState.organizationId,
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    website: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        mockState.websites.find((website) => website.id === where.id) ?? null,
    },
    searchConsoleProperty: {
      findMany: async (args: {
        where: {
          organizationId: string;
          urlInspections: {
            some: {
              organizationId: string;
              websiteId: string;
            };
          };
        };
        distinct: ["id"];
        orderBy: { siteUrl: "asc" };
        select: { id: true; siteUrl: true };
      }) => {
        mockState.lastPropertyFindManyArgs = args;

        const referencedPropertyIds = new Set(
          mockState.inspections
            .filter(
              (inspection) =>
                inspection.organizationId ===
                  args.where.urlInspections.some.organizationId &&
                inspection.websiteId === args.where.urlInspections.some.websiteId
            )
            .map((inspection) => inspection.searchConsolePropertyId)
        );
        const seenPropertyIds = new Set<string>();
        const results = mockState.properties
          .filter(
            (property) =>
              property.organizationId === args.where.organizationId &&
              referencedPropertyIds.has(property.id)
          )
          .filter((property) => {
            if (seenPropertyIds.has(property.id)) {
              return false;
            }

            seenPropertyIds.add(property.id);
            return true;
          })
          .sort((a, b) => a.siteUrl.localeCompare(b.siteUrl))
          .map(({ id, siteUrl }) => ({ id, siteUrl }));

        mockState.lastPropertyResults = results;

        return results;
      },
    },
    urlInspection: {
      findMany: async (args: {
        where: {
          organizationId: string;
          websiteId: string;
          inspectedUrl?: { contains: string; mode: "insensitive" };
          status?: InspectionHistoryItem["status"];
          searchConsolePropertyId?: string;
        };
        orderBy: { createdAt: "desc" };
        take: number;
      }) => {
        mockState.lastFindManyArgs = args;

        if (mockState.forceEmptyInspectionResults) {
          return [];
        }

        return mockState.inspections
          .filter(
            (inspection) =>
              inspection.organizationId === args.where.organizationId &&
              inspection.websiteId === args.where.websiteId &&
              (!args.where.status || inspection.status === args.where.status) &&
              (!args.where.searchConsolePropertyId ||
                inspection.searchConsolePropertyId ===
                  args.where.searchConsolePropertyId) &&
              (!args.where.inspectedUrl?.contains ||
                inspection.inspectedUrl
                  .toLowerCase()
                  .includes(args.where.inspectedUrl.contains.toLowerCase()))
          )
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, args.take);
      },
    },
  },
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

function websiteFixture(
  input: Partial<InspectionHistoryWebsite> = {}
): InspectionHistoryWebsite {
  return {
    id: input.id ?? "website-1",
    name: input.name ?? "Example",
    domain: input.domain ?? "example.com",
    status: input.status ?? "ACTIVE",
    organizationId: input.organizationId ?? "org-1",
  };
}

function inspectionFixture(input: Partial<InspectionFixture> = {}): InspectionFixture {
  const index = input.id?.replace(/\D/g, "") || "1";

  return {
    id: input.id ?? `inspection-${index}`,
    organizationId: input.organizationId ?? "org-1",
    websiteId: input.websiteId ?? "website-1",
    inspectedUrl: input.inspectedUrl ?? `https://example.com/page-${index}`,
    status: input.status ?? "COMPLETED",
    verdict: Object.prototype.hasOwnProperty.call(input, "verdict")
      ? (input.verdict as InspectionFixture["verdict"])
      : "PASS",
    coverageState: Object.prototype.hasOwnProperty.call(input, "coverageState")
      ? (input.coverageState as InspectionFixture["coverageState"])
      : "Submitted and indexed",
    createdAt: input.createdAt ?? new Date(`2026-07-${index.padStart(2, "0")}T12:00:00.000Z`),
    completedAt: Object.prototype.hasOwnProperty.call(input, "completedAt")
      ? (input.completedAt as InspectionFixture["completedAt"])
      : new Date(`2026-07-${index.padStart(2, "0")}T12:01:00.000Z`),
    searchConsolePropertyId: input.searchConsolePropertyId ?? "property-1",
    searchConsoleProperty: input.searchConsoleProperty ?? {
      siteUrl: "https://example.com/",
    },
    rawResponse: input.rawResponse ?? { secretRawGooglePayload: true },
  };
}

function propertyFixture(input: Partial<PropertyFixture> = {}): PropertyFixture {
  return {
    id: input.id ?? "property-1",
    organizationId: input.organizationId ?? "org-1",
    siteUrl: input.siteUrl ?? "https://example.com/",
    accessToken: input.accessToken ?? "access-token-secret",
    refreshToken: input.refreshToken ?? "refresh-token-secret",
    credentials: input.credentials ?? "credential-secret",
  };
}

function manyInspections(count: number) {
  return Array.from({ length: count }, (_, index) =>
    inspectionFixture({
      id: `inspection-${index + 1}`,
      createdAt: new Date(2026, 6, index + 1, 12, 0, 0),
      completedAt: new Date(2026, 6, index + 1, 12, 1, 0),
    })
  );
}

async function renderHistoryPage(
  websiteId = "website-1",
  searchParams: {
    q?: string | string[];
    status?: string | string[];
    property?: string | string[];
  } = {}
) {
  const { default: Page } = await import(
    "../app/(app)/websites/[id]/inspections/page"
  );
  const element = await Page({
    params: Promise.resolve({ id: websiteId }),
    searchParams: Promise.resolve(searchParams),
  });

  return renderToStaticMarkup(element);
}

function expectSelectedStatus(markup: string, value: string) {
  expect(markup).toMatch(
    new RegExp(
      `<option(?: selected="" value="${value}"| value="${value}" selected="")>`
    )
  );
}

function expectSelectedProperty(markup: string, value: string) {
  expect(markup).toMatch(
    new RegExp(
      `<option(?: selected="" value="${value}"| value="${value}" selected="")>`
    )
  );
}

function getClearAllHref(markup: string) {
  return markup.match(/<a[^>]*href="([^"]*)"[^>]*>Clear all<\/a>/)?.[1] ?? null;
}

function getClearFiltersHref(markup: string) {
  return (
    markup.match(/<a[^>]*href="([^"]*)"[^>]*>Clear filters<\/a>/)?.[1] ??
    null
  );
}

function getStatusFilterFormMarkup(markup: string) {
  return (
    markup.match(
      /<form[^>]*method="get"[^>]*>[\s\S]*?id="inspection-status-filter"[\s\S]*?<\/form>/
    )?.[0] ?? ""
  );
}

function getHiddenPropertyInputValues(markup: string) {
  return Array.from(
    markup.matchAll(/<input type="hidden" name="property" value="([^"]*)"\/?>/g),
    (match) => match[1]
  );
}

function createHistoryRepository(
  propertyOptions: InspectionHistoryPropertyOption[] = []
): InspectionHistoryRepository {
  return {
    getWebsite: async () => websiteFixture(),
    listInspectionPropertyOptions: async () => propertyOptions,
    listRecentInspections: async () => [],
  };
}

beforeEach(() => {
  vi.resetModules();
  mockState.organizationId = "org-1";
  mockState.websites = [websiteFixture()];
  mockState.inspections = [inspectionFixture()];
  mockState.properties = [propertyFixture()];
  mockState.lastFindManyArgs = null;
  mockState.lastPropertyFindManyArgs = null;
  mockState.lastPropertyResults = [];
  mockState.forceEmptyInspectionResults = false;
});

describe("inspection history status query normalization", () => {
  it("normalizes pending", () => {
    expect(normalizeInspectionHistoryStatus("pending")).toBe("PENDING");
  });

  it("normalizes running", () => {
    expect(normalizeInspectionHistoryStatus("running")).toBe("RUNNING");
  });

  it("normalizes completed", () => {
    expect(normalizeInspectionHistoryStatus("completed")).toBe("COMPLETED");
  });

  it("normalizes failed", () => {
    expect(normalizeInspectionHistoryStatus("failed")).toBe("FAILED");
  });

  it("treats status=all as no filter", () => {
    expect(normalizeInspectionHistoryStatus("all")).toBeNull();
  });

  it("treats a missing status as no filter", () => {
    expect(normalizeInspectionHistoryStatus(undefined)).toBeNull();
  });

  it("treats an empty status as no filter", () => {
    expect(normalizeInspectionHistoryStatus("   ")).toBeNull();
  });

  it("treats unsupported status values as no filter", () => {
    expect(normalizeInspectionHistoryStatus("deleted")).toBeNull();
  });
});

describe("inspection history active filter state", () => {
  it("is active when q is active", async () => {
    const data = await getInspectionHistoryPageData({
      websiteId: "website-1",
      organizationId: "org-1",
      searchParams: { q: "contact" },
      repository: createHistoryRepository(),
    });

    expect(data).toMatchObject({ ok: true, hasActiveFilters: true });
  });

  it("is active when status is active", async () => {
    const data = await getInspectionHistoryPageData({
      websiteId: "website-1",
      organizationId: "org-1",
      searchParams: { status: "failed" },
      repository: createHistoryRepository(),
    });

    expect(data).toMatchObject({ ok: true, hasActiveFilters: true });
  });

  it("is active when q and status are both active", async () => {
    const data = await getInspectionHistoryPageData({
      websiteId: "website-1",
      organizationId: "org-1",
      searchParams: { q: "contact", status: "completed" },
      repository: createHistoryRepository(),
    });

    expect(data).toMatchObject({ ok: true, hasActiveFilters: true });
  });

  it("is active when selectedPropertyId is active", async () => {
    const data = await getInspectionHistoryPageData({
      websiteId: "website-1",
      organizationId: "org-1",
      searchParams: { property: "property-1" },
      repository: createHistoryRepository([
        { id: "property-1", siteUrl: "https://example.com/" },
      ]),
    });

    expect(data).toMatchObject({
      ok: true,
      selectedPropertyId: "property-1",
      hasActiveFilters: true,
    });
  });

  it("sets hasActiveProperty true when selectedPropertyId exists", async () => {
    const data = await getInspectionHistoryPageData({
      websiteId: "website-1",
      organizationId: "org-1",
      searchParams: { property: "property-1" },
      repository: createHistoryRepository([
        { id: "property-1", siteUrl: "https://example.com/" },
      ]),
    });

    expect(data).toMatchObject({
      ok: true,
      selectedPropertyId: "property-1",
      hasActiveProperty: true,
    });
  });

  it("sets hasActiveProperty false when selectedPropertyId is null", async () => {
    const data = await getInspectionHistoryPageData({
      websiteId: "website-1",
      organizationId: "org-1",
      searchParams: { property: "all" },
      repository: createHistoryRepository([
        { id: "property-1", siteUrl: "https://example.com/" },
      ]),
    });

    expect(data).toMatchObject({
      ok: true,
      selectedPropertyId: null,
      hasActiveProperty: false,
    });
  });

  it("treats a property-only filter as active", async () => {
    const data = await getInspectionHistoryPageData({
      websiteId: "website-1",
      organizationId: "org-1",
      searchParams: { property: "property-1" },
      repository: createHistoryRepository([
        { id: "property-1", siteUrl: "https://example.com/" },
      ]),
    });

    expect(data).toMatchObject({ ok: true, hasActiveFilters: true });
  });

  it("is inactive when neither q nor status nor property is active", async () => {
    const data = await getInspectionHistoryPageData({
      websiteId: "website-1",
      organizationId: "org-1",
      searchParams: { q: "  ", status: "all", property: "all" },
      repository: createHistoryRepository(),
    });

    expect(data).toMatchObject({ ok: true, hasActiveFilters: false });
  });

  it("is inactive when status is invalid", async () => {
    const data = await getInspectionHistoryPageData({
      websiteId: "website-1",
      organizationId: "org-1",
      searchParams: { status: "deleted" },
      repository: createHistoryRepository(),
    });

    expect(data).toMatchObject({ ok: true, hasActiveFilters: false });
  });

  it("is inactive when property is missing", async () => {
    const data = await getInspectionHistoryPageData({
      websiteId: "website-1",
      organizationId: "org-1",
      searchParams: {},
      repository: createHistoryRepository([
        { id: "property-1", siteUrl: "https://example.com/" },
      ]),
    });

    expect(data).toMatchObject({ ok: true, hasActiveFilters: false });
  });

  it("is inactive when property is all", async () => {
    const data = await getInspectionHistoryPageData({
      websiteId: "website-1",
      organizationId: "org-1",
      searchParams: { property: "all" },
      repository: createHistoryRepository([
        { id: "property-1", siteUrl: "https://example.com/" },
      ]),
    });

    expect(data).toMatchObject({ ok: true, hasActiveFilters: false });
  });

  it("is inactive when property is invalid", async () => {
    const data = await getInspectionHistoryPageData({
      websiteId: "website-1",
      organizationId: "org-1",
      searchParams: { property: "missing-property" },
      repository: createHistoryRepository([
        { id: "property-1", siteUrl: "https://example.com/" },
      ]),
    });

    expect(data).toMatchObject({ ok: true, hasActiveFilters: false });
  });

  it("is inactive when property belongs to another organization", async () => {
    const data = await getInspectionHistoryPageData({
      websiteId: "website-1",
      organizationId: "org-1",
      searchParams: { property: "other-org-property" },
      repository: createHistoryRepository([
        { id: "property-1", siteUrl: "https://example.com/" },
      ]),
    });

    expect(data).toMatchObject({ ok: true, hasActiveFilters: false });
  });

  it("is inactive when property is unrelated to the selected website", async () => {
    const data = await getInspectionHistoryPageData({
      websiteId: "website-1",
      organizationId: "org-1",
      searchParams: { property: "other-website-property" },
      repository: createHistoryRepository([
        { id: "property-1", siteUrl: "https://example.com/" },
      ]),
    });

    expect(data).toMatchObject({ ok: true, hasActiveFilters: false });
  });

  it("is active when property and q are active", async () => {
    const data = await getInspectionHistoryPageData({
      websiteId: "website-1",
      organizationId: "org-1",
      searchParams: { q: "contact", property: "property-1" },
      repository: createHistoryRepository([
        { id: "property-1", siteUrl: "https://example.com/" },
      ]),
    });

    expect(data).toMatchObject({ ok: true, hasActiveFilters: true });
  });

  it("is active when property and status are active", async () => {
    const data = await getInspectionHistoryPageData({
      websiteId: "website-1",
      organizationId: "org-1",
      searchParams: { status: "failed", property: "property-1" },
      repository: createHistoryRepository([
        { id: "property-1", siteUrl: "https://example.com/" },
      ]),
    });

    expect(data).toMatchObject({ ok: true, hasActiveFilters: true });
  });

  it("is active when property, q, and status are active", async () => {
    const data = await getInspectionHistoryPageData({
      websiteId: "website-1",
      organizationId: "org-1",
      searchParams: {
        q: "contact",
        status: "completed",
        property: "property-1",
      },
      repository: createHistoryRepository([
        { id: "property-1", siteUrl: "https://example.com/" },
      ]),
    });

    expect(data).toMatchObject({ ok: true, hasActiveFilters: true });
  });
});

describe("inspection history property query normalization", () => {
  it("returns null when property is missing", () => {
    expect(normalizeInspectionHistoryPropertyCandidate(undefined)).toBeNull();
  });

  it("returns null when property is empty", () => {
    expect(normalizeInspectionHistoryPropertyCandidate("")).toBeNull();
  });

  it("returns null when property is whitespace only", () => {
    expect(normalizeInspectionHistoryPropertyCandidate("   ")).toBeNull();
  });

  it("returns null when property is all", () => {
    expect(normalizeInspectionHistoryPropertyCandidate("all")).toBeNull();
  });

  it("trims surrounding whitespace from a property candidate", () => {
    expect(normalizeInspectionHistoryPropertyCandidate("  property-1  ")).toBe(
      "property-1"
    );
  });

  it("returns the property ID when it is in the allowlist", () => {
    expect(
      validateInspectionHistoryPropertyId({
        propertyId: "property-1",
        propertyOptions: [{ id: "property-1", siteUrl: "https://example.com/" }],
      })
    ).toBe("property-1");
  });

  it("returns null when the property ID is invalid", () => {
    expect(
      validateInspectionHistoryPropertyId({
        propertyId: "missing-property",
        propertyOptions: [{ id: "property-1", siteUrl: "https://example.com/" }],
      })
    ).toBeNull();
  });

  it("returns null for a cross-organization property ID", async () => {
    const data = await getInspectionHistoryPageData({
      websiteId: "website-1",
      organizationId: "org-1",
      searchParams: { property: "other-org-property" },
      repository: createHistoryRepository([
        { id: "property-1", siteUrl: "https://example.com/" },
      ]),
    });

    expect(data).toMatchObject({ ok: true, selectedPropertyId: null });
  });

  it("returns null for a property unrelated to the selected website", async () => {
    const data = await getInspectionHistoryPageData({
      websiteId: "website-1",
      organizationId: "org-1",
      searchParams: { property: "other-website-property" },
      repository: createHistoryRepository([
        { id: "property-1", siteUrl: "https://example.com/" },
      ]),
    });

    expect(data).toMatchObject({ ok: true, selectedPropertyId: null });
  });

  it("sets selectedPropertyId to null without a property query", async () => {
    const data = await getInspectionHistoryPageData({
      websiteId: "website-1",
      organizationId: "org-1",
      searchParams: {},
      repository: createHistoryRepository([
        { id: "property-1", siteUrl: "https://example.com/" },
      ]),
    });

    expect(data).toMatchObject({ ok: true, selectedPropertyId: null });
  });
});

describe("URL inspection history page", () => {
  it("renders for an owned website", async () => {
    const markup = await renderHistoryPage();

    expect(markup).toContain("URL Inspection History");
    expect(markup).toContain(
      "Inspection history shows previous Google URL inspection results so you can review how a URL&#x27;s reported status has changed over time."
    );
    expect(markup).toContain(
      'class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground"'
    );
    expect(markup).toContain('href="/websites/website-1/inspect"');
    expect(markup).toContain("Inspect a URL");
    expect(markup).toContain("Recent Inspections");
    expect(markup).toContain("View Result");
  });

  it("renders the history table", async () => {
    const markup = await renderHistoryPage();

    expect(markup).toContain("<table");
    expect(markup).toContain("max-w-full overflow-x-auto");
    expect(markup).toContain("URL");
    expect(markup).toContain("Status");
    expect(markup).toContain("Verdict");
    expect(markup).toContain("Coverage");
    expect(markup).toContain("Inspected");
    expect(markup).toContain("Action");
  });

  it("keeps history page actions aligned for mobile", async () => {
    const markup = await renderHistoryPage();

    expect(markup).toContain(
      'class="grid gap-2 sm:flex sm:flex-wrap sm:items-start"'
    );
    expect(markup).toContain("w-full sm:w-auto");
  });

  it("displays the inspected URL", async () => {
    mockState.inspections = [
      inspectionFixture({ inspectedUrl: "https://example.com/inspected-url" }),
    ];

    const markup = await renderHistoryPage();

    expect(markup).toContain("https://example.com/inspected-url");
  });

  it("renders the inspected URL as the primary row text", async () => {
    mockState.inspections = [
      inspectionFixture({ inspectedUrl: "https://example.com/primary-url" }),
    ];

    const markup = await renderHistoryPage();

    expect(markup).toContain(
      'class="block truncate text-sm font-semibold leading-6 text-foreground sm:text-base"'
    );
    expect(markup).toContain("https://example.com/primary-url");
  });

  it("preserves the full value for long URLs", async () => {
    const longUrl = `https://example.com/${"very-long-path/".repeat(12)}`;
    mockState.inspections = [inspectionFixture({ inspectedUrl: longUrl })];

    const markup = await renderHistoryPage();

    expect(markup).toContain(`title="${longUrl}"`);
    expect(markup).toContain("block truncate");
  });

  it("renders website name and domain", async () => {
    mockState.websites = [
      websiteFixture({ name: "Washingtonista", domain: "washingtonista.com" }),
    ];

    const markup = await renderHistoryPage();

    expect(markup).toContain("Washingtonista");
    expect(markup).toContain("washingtonista.com");
  });

  it("limits records to 25", async () => {
    mockState.inspections = manyInspections(30);

    const markup = await renderHistoryPage();

    expect(markup).toContain("Loaded inspections");
    expect(markup).toContain(">25</p>");
    expect(mockState.lastFindManyArgs).toMatchObject({ take: 25 });
  });

  it("orders records newest first", async () => {
    await renderHistoryPage();

    expect(mockState.lastFindManyArgs).toMatchObject({
      orderBy: { createdAt: "desc" },
    });
  });

  it("excludes cross-organization inspections", async () => {
    mockState.inspections = [
      inspectionFixture({ id: "owned-1", organizationId: "org-1" }),
      inspectionFixture({ id: "other-org", organizationId: "org-2" }),
    ];

    const markup = await renderHistoryPage();

    expect(markup).toContain("owned-1");
    expect(markup).not.toContain("other-org");
    expect(mockState.lastFindManyArgs).toMatchObject({
      where: { organizationId: "org-1", websiteId: "website-1" },
    });
  });

  it("excludes inspections from other websites", async () => {
    mockState.inspections = [
      inspectionFixture({ id: "owned-1", websiteId: "website-1" }),
      inspectionFixture({ id: "other-website", websiteId: "website-2" }),
    ];

    const markup = await renderHistoryPage();

    expect(markup).toContain("owned-1");
    expect(markup).not.toContain("other-website");
    expect(mockState.lastFindManyArgs).toMatchObject({
      where: { organizationId: "org-1", websiteId: "website-1" },
    });
  });

  it("loads properties referenced by the website inspections", async () => {
    mockState.properties = [
      propertyFixture({ id: "property-b", siteUrl: "https://b.example.com/" }),
      propertyFixture({ id: "property-a", siteUrl: "https://a.example.com/" }),
    ];
    mockState.inspections = [
      inspectionFixture({ id: "inspection-1", searchConsolePropertyId: "property-b" }),
      inspectionFixture({ id: "inspection-2", searchConsolePropertyId: "property-a" }),
    ];

    await renderHistoryPage();

    expect(mockState.lastPropertyResults).toEqual([
      { id: "property-a", siteUrl: "https://a.example.com/" },
      { id: "property-b", siteUrl: "https://b.example.com/" },
    ]);
    expect(mockState.lastPropertyFindManyArgs).toMatchObject({
      where: {
        organizationId: "org-1",
        urlInspections: {
          some: {
            organizationId: "org-1",
            websiteId: "website-1",
          },
        },
      },
      orderBy: { siteUrl: "asc" },
    });
  });

  it("loads duplicate referenced properties only once", async () => {
    mockState.properties = [
      propertyFixture({ id: "property-1", siteUrl: "https://example.com/" }),
    ];
    mockState.inspections = [
      inspectionFixture({ id: "inspection-1", searchConsolePropertyId: "property-1" }),
      inspectionFixture({ id: "inspection-2", searchConsolePropertyId: "property-1" }),
    ];

    await renderHistoryPage();

    expect(mockState.lastPropertyResults).toEqual([
      { id: "property-1", siteUrl: "https://example.com/" },
    ]);
    expect(mockState.lastPropertyFindManyArgs).toMatchObject({
      distinct: ["id"],
    });
  });

  it("excludes another organization's properties", async () => {
    mockState.properties = [
      propertyFixture({ id: "property-1", organizationId: "org-1" }),
      propertyFixture({
        id: "other-org-property",
        organizationId: "org-2",
        siteUrl: "https://other.example.com/",
      }),
    ];
    mockState.inspections = [
      inspectionFixture({ searchConsolePropertyId: "property-1" }),
      inspectionFixture({
        id: "inspection-2",
        organizationId: "org-2",
        searchConsolePropertyId: "other-org-property",
      }),
    ];

    await renderHistoryPage();

    expect(mockState.lastPropertyResults).toEqual([
      { id: "property-1", siteUrl: "https://example.com/" },
    ]);
    expect(JSON.stringify(mockState.lastPropertyResults)).not.toContain(
      "other-org-property"
    );
  });

  it("excludes properties unrelated to the selected website inspections", async () => {
    mockState.properties = [
      propertyFixture({ id: "property-1" }),
      propertyFixture({
        id: "other-website-property",
        siteUrl: "https://other-website.example.com/",
      }),
    ];
    mockState.inspections = [
      inspectionFixture({ searchConsolePropertyId: "property-1" }),
      inspectionFixture({
        id: "inspection-2",
        websiteId: "website-2",
        searchConsolePropertyId: "other-website-property",
      }),
    ];

    await renderHistoryPage();

    expect(mockState.lastPropertyResults).toEqual([
      { id: "property-1", siteUrl: "https://example.com/" },
    ]);
    expect(JSON.stringify(mockState.lastPropertyResults)).not.toContain(
      "other-website-property"
    );
  });

  it("selects the property ID for property options", async () => {
    await renderHistoryPage();

    expect(mockState.lastPropertyFindManyArgs).toMatchObject({
      select: { id: true },
    });
  });

  it("selects the property display URL for property options", async () => {
    await renderHistoryPage();

    expect(mockState.lastPropertyFindManyArgs).toMatchObject({
      select: { siteUrl: true },
    });
  });

  it("does not select OAuth access tokens for property options", async () => {
    await renderHistoryPage();

    expect(JSON.stringify(mockState.lastPropertyFindManyArgs)).not.toContain(
      "accessToken"
    );
  });

  it("does not select OAuth refresh tokens for property options", async () => {
    await renderHistoryPage();

    expect(JSON.stringify(mockState.lastPropertyFindManyArgs)).not.toContain(
      "refreshToken"
    );
  });

  it("does not select credentials for property options", async () => {
    await renderHistoryPage();

    const query = JSON.stringify(mockState.lastPropertyFindManyArgs);

    expect(query).not.toContain("credentials");
    expect(query).not.toContain("googleAccount");
    expect(query).not.toContain("rawResponse");
  });

  it("does not call Google APIs while loading property options", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await renderHistoryPage();

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("rejects unauthorized website access", async () => {
    mockState.websites = [websiteFixture({ organizationId: "org-2" })];

    await expect(renderHistoryPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("returns not found for a missing website", async () => {
    mockState.websites = [];

    await expect(renderHistoryPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("does not select rawResponse", async () => {
    await renderHistoryPage();

    expect(JSON.stringify(mockState.lastFindManyArgs)).not.toContain("rawResponse");
  });

  it("does not select OAuth credentials", async () => {
    await renderHistoryPage();

    const query = JSON.stringify(mockState.lastFindManyArgs);

    expect(query).not.toContain("accessToken");
    expect(query).not.toContain("refreshToken");
    expect(query).not.toContain("googleAccount");
  });

  it("renders completed status badge", async () => {
    mockState.inspections = [inspectionFixture({ status: "COMPLETED" })];

    expect(await renderHistoryPage()).toContain("Completed");
  });

  it("renders failed status badge", async () => {
    mockState.inspections = [inspectionFixture({ status: "FAILED" })];

    expect(await renderHistoryPage()).toContain("Failed");
  });

  it("renders pending status badge", async () => {
    mockState.inspections = [inspectionFixture({ status: "PENDING" })];

    expect(await renderHistoryPage()).toContain("Pending");
  });

  it("renders running status badge", async () => {
    mockState.inspections = [inspectionFixture({ status: "RUNNING" })];

    expect(await renderHistoryPage()).toContain("Running");
  });

  it("displays verdict when present", async () => {
    mockState.inspections = [inspectionFixture({ verdict: "PASS" })];

    expect(await renderHistoryPage()).toContain("Pass");
  });

  it("shows a placeholder for missing verdict", async () => {
    mockState.inspections = [inspectionFixture({ verdict: null })];

    expect(await renderHistoryPage()).toContain(">-</span>");
  });

  it("displays coverage when present", async () => {
    mockState.inspections = [
      inspectionFixture({ coverageState: "URL_IS_ON_GOOGLE" }),
    ];

    expect(await renderHistoryPage()).toContain("Url Is On Google");
  });

  it("uses a fallback for missing coverage", async () => {
    mockState.inspections = [inspectionFixture({ coverageState: null })];

    expect(await renderHistoryPage()).toContain("Not available");
  });

  it("prefers completedAt over createdAt for inspected date", async () => {
    mockState.inspections = [
      inspectionFixture({
        createdAt: new Date("2026-07-01T12:00:00.000Z"),
        completedAt: new Date("2026-07-03T12:00:00.000Z"),
      }),
    ];

    const markup = await renderHistoryPage();

    expect(markup).toContain("Jul 3, 2026");
    expect(markup).not.toContain("Jul 1, 2026");
  });

  it("renders the inspected label with a valid timestamp", async () => {
    mockState.inspections = [
      inspectionFixture({
        completedAt: new Date("2026-07-03T12:00:00.000Z"),
      }),
    ];

    const markup = await renderHistoryPage();

    expect(markup).toContain("<time");
    expect(markup).toContain('dateTime="2026-07-03T12:00:00.000Z"');
    expect(markup).toContain("Inspected Jul 3, 2026");
    expect(markup).toContain("Jul 3, 2026");
    expect(markup).toContain('class="whitespace-nowrap px-4 py-4"');
    expect(markup).toContain(
      'class="block text-xs leading-5 text-muted-foreground"'
    );
    expect(markup).toContain("View Result");
  });

  it("omits the inspected timestamp element when the timestamp is invalid", async () => {
    mockState.inspections = [
      inspectionFixture({
        createdAt: new Date("invalid-date"),
        completedAt: null,
      }),
    ];

    const markup = await renderHistoryPage();

    expect(markup).not.toContain("<time");
    expect(markup).not.toContain("Inspected Invalid Date");
    expect(markup).not.toContain("Invalid Date");
    expect(markup).not.toContain("N/A");
  });

  it("uses createdAt when completedAt is missing", async () => {
    mockState.inspections = [
      inspectionFixture({
        createdAt: new Date("2026-07-04T12:00:00.000Z"),
        completedAt: null,
      }),
    ];

    expect(await renderHistoryPage()).toContain("Jul 4, 2026");
  });

  it("keeps URL and status presentation unchanged with timestamp metadata", async () => {
    mockState.inspections = [
      inspectionFixture({
        inspectedUrl: "https://example.com/timestamp-row",
        status: "COMPLETED",
      }),
    ];

    const markup = await renderHistoryPage();

    expect(markup).toContain("https://example.com/timestamp-row");
    expect(markup).toContain(
      'class="block truncate text-sm font-semibold leading-6 text-foreground sm:text-base"'
    );
    expect(markup).toContain("Completed");
  });

  it("renders the correct View Result link", async () => {
    mockState.inspections = [inspectionFixture({ id: "inspection-result-1" })];

    const markup = await renderHistoryPage();

    expect(markup).toContain(
      'href="/websites/website-1/inspections/inspection-result-1"'
    );
  });

  it("renders the empty state", async () => {
    mockState.inspections = [];

    const markup = await renderHistoryPage();

    expect(markup).toContain("No website insights yet");
    expect(markup).toContain(
      "Inspect a few URLs to begin building an overview of how Google currently sees your website."
    );
    expect(markup).toContain(
      'class="grid max-w-md justify-items-center gap-4"'
    );
    expect(markup).toContain(
      'class="text-sm leading-6 text-slate-500"'
    );
  });

  it("renders the Inspect a URL link in the empty state", async () => {
    mockState.inspections = [];

    const markup = await renderHistoryPage();

    expect(markup).toContain('href="/websites/website-1/inspect"');
    expect(markup).toContain("Inspect a URL");
  });

  it("does not render sample history entries in the empty state", async () => {
    mockState.inspections = [];

    const markup = await renderHistoryPage();

    expect(markup).not.toContain("https://example.com/page");
    expect(markup).not.toContain("Sample inspection");
    expect(markup).not.toContain("View Result");
  });

  it("renders the loaded-inspections count", async () => {
    mockState.inspections = [
      inspectionFixture({ id: "inspection-1" }),
      inspectionFixture({ id: "inspection-2" }),
      inspectionFixture({ id: "inspection-3" }),
    ];

    const markup = await renderHistoryPage();

    expect(markup).toContain("Loaded inspections");
    expect(markup).toContain(">3</p>");
  });

  it("groups the inspection status breakdown for easier scanning", async () => {
    const markup = await renderHistoryPage();

    expect(markup).toContain("Inspection status breakdown");
    expect(markup).toContain(
      'aria-labelledby="inspection-status-breakdown-heading"'
    );
    expect(markup.indexOf("Loaded inspections")).toBeLessThan(
      markup.indexOf("Completed")
    );
    expect(markup.indexOf("Completed")).toBeLessThan(markup.indexOf("Failed"));
    expect(markup.indexOf("Failed")).toBeLessThan(
      markup.indexOf("In progress")
    );
  });

  it("makes the loaded-inspections metric visually primary", async () => {
    const markup = await renderHistoryPage();

    expect(markup).toContain(
      'class="text-3xl font-semibold leading-tight text-slate-950"'
    );
    expect(markup).toContain(
      'class="text-2xl font-semibold text-slate-950"'
    );
  });

  it("renders the completed count", async () => {
    mockState.inspections = [
      inspectionFixture({ status: "COMPLETED" }),
      inspectionFixture({ id: "inspection-2", status: "FAILED" }),
    ];

    const markup = await renderHistoryPage();

    expect(markup).toContain("Completed");
    expect(markup).toContain(">1</p>");
  });

  it("renders the failed count", async () => {
    mockState.inspections = [
      inspectionFixture({ status: "FAILED" }),
      inspectionFixture({ id: "inspection-2", status: "FAILED" }),
      inspectionFixture({ id: "inspection-3", status: "COMPLETED" }),
    ];

    const markup = await renderHistoryPage();

    expect(markup).toContain("Failed");
    expect(markup).toContain(">2</p>");
  });

  it("counts pending and running inspections as in progress", async () => {
    mockState.inspections = [
      inspectionFixture({ status: "PENDING" }),
      inspectionFixture({ id: "inspection-2", status: "RUNNING" }),
      inspectionFixture({ id: "inspection-3", status: "COMPLETED" }),
    ];

    const markup = await renderHistoryPage();

    expect(markup).toContain("In progress");
    expect(markup).toContain(">2</p>");
  });

  it("explains the 25-record summary scope", async () => {
    const markup = await renderHistoryPage();

    expect(markup).toContain("Based on the 25 most recent inspections.");
  });

  it("uses the correct website ID for the Inspect a URL button", async () => {
    mockState.websites = [websiteFixture({ id: "website-custom" })];
    mockState.inspections = [
      inspectionFixture({ websiteId: "website-custom" }),
    ];

    const markup = await renderHistoryPage("website-custom");

    expect(markup).toContain('href="/websites/website-custom/inspect"');
  });

  it("hides new-inspection actions for archived websites", async () => {
    mockState.websites = [websiteFixture({ status: "ARCHIVED" })];
    mockState.inspections = [];

    const markup = await renderHistoryPage();

    expect(markup).toContain("This website is archived");
    expect(markup).not.toContain("Inspect a URL");
    expect(markup).not.toContain('href="/websites/website-1/inspect"');
  });

  it("renders the Inspection History navigation link", async () => {
    const markup = await renderHistoryPage();

    expect(markup).toContain("Inspection History");
  });

  it("uses the correct website ID for the history navigation link", async () => {
    mockState.websites = [websiteFixture({ id: "website-custom" })];
    mockState.inspections = [
      inspectionFixture({ websiteId: "website-custom" }),
    ];

    const markup = await renderHistoryPage("website-custom");

    expect(markup).toContain('href="/websites/website-custom/inspections"');
  });

  it("marks the history navigation link active", async () => {
    const markup = await renderHistoryPage();

    expect(markup).toContain('href="/websites/website-1/inspections"');
    expect(markup).toContain('aria-current="page"');
  });

  it("does not create duplicate history navigation links", async () => {
    const markup = await renderHistoryPage();
    const matches = markup.match(/href="\/websites\/website-1\/inspections"/g);

    expect(matches).toHaveLength(1);
  });

  it("does not render rawResponse", async () => {
    mockState.inspections = [
      inspectionFixture({ rawResponse: { secretRawGooglePayload: true } }),
    ];

    expect(await renderHistoryPage()).not.toContain("secretRawGooglePayload");
  });

  it("does not render sensitive credentials", async () => {
    mockState.inspections = [
      {
        ...inspectionFixture(),
        searchConsoleProperty: {
          siteUrl: "https://example.com/",
          accessToken: "access-token-secret",
          refreshToken: "refresh-token-secret",
        } as InspectionFixture["searchConsoleProperty"],
      },
    ];

    const markup = await renderHistoryPage();

    expect(markup).not.toContain("access-token-secret");
    expect(markup).not.toContain("refresh-token-secret");
  });

  it("renders the search form", async () => {
    const markup = await renderHistoryPage();

    expect(markup).toContain("Search inspected URLs");
    expect(markup).toContain('name="q"');
    expect(markup).toContain("Search");
  });

  it("preserves pending status in the search form", async () => {
    const markup = await renderHistoryPage("website-1", { status: "pending" });

    expect(markup).toContain('type="hidden" name="status" value="pending"');
  });

  it("preserves running status in the search form", async () => {
    const markup = await renderHistoryPage("website-1", { status: "running" });

    expect(markup).toContain('type="hidden" name="status" value="running"');
  });

  it("preserves completed status in the search form", async () => {
    const markup = await renderHistoryPage("website-1", {
      status: "completed",
    });

    expect(markup).toContain('type="hidden" name="status" value="completed"');
  });

  it("preserves failed status in the search form", async () => {
    const markup = await renderHistoryPage("website-1", { status: "failed" });

    expect(markup).toContain('type="hidden" name="status" value="failed"');
  });

  it("uses status as the hidden input name", async () => {
    const markup = await renderHistoryPage("website-1", { status: "failed" });

    expect(markup).toContain('name="status"');
  });

  it("uses the lowercase normalized status value", async () => {
    const markup = await renderHistoryPage("website-1", { status: "FAILED" });

    expect(markup).toContain('value="failed"');
    expect(markup).not.toContain('value="FAILED"');
  });

  it("does not preserve missing status in the search form", async () => {
    const markup = await renderHistoryPage();

    expect(markup).not.toContain('type="hidden" name="status"');
  });

  it("does not preserve status=all in the search form", async () => {
    const markup = await renderHistoryPage("website-1", { status: "all" });

    expect(markup).not.toContain('type="hidden" name="status"');
  });

  it("does not preserve unsupported status in the search form", async () => {
    const markup = await renderHistoryPage("website-1", { status: "deleted" });

    expect(markup).not.toContain('type="hidden" name="status"');
  });

  it("renders a hidden property input in the search form when property is active", async () => {
    const markup = await renderHistoryPage("website-1", {
      property: "property-1",
    });

    expect(markup).toContain('type="hidden" name="property"');
  });

  it("uses selectedPropertyId in the search form hidden property input", async () => {
    const markup = await renderHistoryPage("website-1", {
      property: "property-1",
    });

    expect(markup).toContain('type="hidden" name="property" value="property-1"');
  });

  it("does not render a hidden property input when property is inactive", async () => {
    const markup = await renderHistoryPage("website-1", { property: "all" });

    expect(markup).not.toContain('type="hidden" name="property"');
  });

  it("keeps the existing q input unchanged when status is active", async () => {
    const markup = await renderHistoryPage("website-1", {
      q: "contact",
      status: "failed",
    });

    expect(markup).toContain('name="q"');
    expect(markup).toContain('value="contact"');
  });

  it("renders the status label", async () => {
    const markup = await renderHistoryPage();

    expect(markup).toContain('for="inspection-status-filter"');
    expect(markup).toContain(">Status</span>");
  });

  it("renders the status selector", async () => {
    const markup = await renderHistoryPage();

    expect(markup).toContain('id="inspection-status-filter"');
    expect(markup).toContain('name="status"');
  });

  it("renders the All statuses option", async () => {
    const markup = await renderHistoryPage();

    expect(markup).toContain('<option value="all"');
    expect(markup).toContain("All statuses");
  });

  it("renders the Pending option", async () => {
    const markup = await renderHistoryPage();

    expect(markup).toContain('<option value="pending"');
    expect(markup).toContain("Pending");
  });

  it("renders the Running option", async () => {
    const markup = await renderHistoryPage();

    expect(markup).toContain('<option value="running"');
    expect(markup).toContain("Running");
  });

  it("renders the Completed option", async () => {
    const markup = await renderHistoryPage();

    expect(markup).toContain('<option value="completed"');
    expect(markup).toContain("Completed");
  });

  it("renders the Failed option", async () => {
    const markup = await renderHistoryPage();

    expect(markup).toContain('<option value="failed"');
    expect(markup).toContain("Failed");
  });

  it("selects All statuses when status is missing", async () => {
    expectSelectedStatus(await renderHistoryPage(), "all");
  });

  it("selects All statuses when status is unsupported", async () => {
    expectSelectedStatus(
      await renderHistoryPage("website-1", { status: "deleted" }),
      "all"
    );
  });

  it("keeps the active status selected", async () => {
    expectSelectedStatus(
      await renderHistoryPage("website-1", { status: "failed" }),
      "failed"
    );
  });

  it("uses GET for the status filter form", async () => {
    const markup = await renderHistoryPage();

    expect(markup).toContain(
      'action="/websites/website-1/inspections" method="get"'
    );
  });

  it("submits the status filter to the current inspection-history route", async () => {
    mockState.websites = [websiteFixture({ id: "website-custom" })];
    mockState.inspections = [
      inspectionFixture({ websiteId: "website-custom" }),
    ];

    const markup = await renderHistoryPage("website-custom");

    expect(markup).toContain(
      'action="/websites/website-custom/inspections" method="get"'
    );
  });

  it("preserves the active q value in the status filter form", async () => {
    const markup = await renderHistoryPage("website-1", { q: "contact" });

    expect(markup).toContain('type="hidden" name="q" value="contact"');
  });

  it("uses the normalized q value in the status filter form", async () => {
    const markup = await renderHistoryPage("website-1", { q: "  contact  " });

    expect(markup).toContain('type="hidden" name="q" value="contact"');
    expect(markup).not.toContain('type="hidden" name="q" value="  contact  "');
  });

  it("does not render a hidden q field when q is inactive", async () => {
    const markup = await renderHistoryPage();

    expect(markup).not.toContain('type="hidden" name="q"');
  });

  it("does not render a hidden q field when q is empty", async () => {
    const markup = await renderHistoryPage("website-1", { q: "   " });

    expect(markup).not.toContain('type="hidden" name="q"');
  });

  it("renders a hidden property input in the status form when property is active", async () => {
    const markup = await renderHistoryPage("website-1", {
      property: "property-1",
    });

    expect(getStatusFilterFormMarkup(markup)).toContain(
      'type="hidden" name="property"'
    );
  });

  it("uses selectedPropertyId in the status form hidden property input", async () => {
    const markup = await renderHistoryPage("website-1", {
      property: "property-1",
    });

    expect(getStatusFilterFormMarkup(markup)).toContain(
      'type="hidden" name="property" value="property-1"'
    );
  });

  it("does not render a hidden property input in the status form when property is inactive", async () => {
    const markup = await renderHistoryPage("website-1", { property: "all" });

    expect(getStatusFilterFormMarkup(markup)).not.toContain(
      'type="hidden" name="property"'
    );
  });

  it("uses only selectedPropertyId for hidden property inputs", async () => {
    const markup = await renderHistoryPage("website-1", {
      property: "  property-1  ",
    });

    expect(getHiddenPropertyInputValues(markup)).toEqual([
      "property-1",
      "property-1",
    ]);
  });

  it("does not use the raw property query value in hidden property inputs", async () => {
    const markup = await renderHistoryPage("website-1", {
      property: "  property-1  ",
    });

    expect(getHiddenPropertyInputValues(markup)).not.toContain(
      "  property-1  "
    );
  });

  it("does not render hidden property inputs for an invalid property", async () => {
    const markup = await renderHistoryPage("website-1", {
      property: "missing-property",
    });

    expect(getHiddenPropertyInputValues(markup)).toEqual([]);
  });

  it("does not render hidden property inputs for a cross-organization property", async () => {
    const markup = await renderHistoryPage("website-1", {
      property: "other-org-property",
    });

    expect(getHiddenPropertyInputValues(markup)).toEqual([]);
  });

  it("does not render hidden property inputs for an unrelated property", async () => {
    const markup = await renderHistoryPage("website-1", {
      property: "other-website-property",
    });

    expect(getHiddenPropertyInputValues(markup)).toEqual([]);
  });

  it("renders the status Apply button", async () => {
    const markup = await renderHistoryPage();

    expect(markup).toContain("Apply status");
  });

  it("keeps the existing status selector unchanged when preserving q", async () => {
    const markup = await renderHistoryPage("website-1", { q: "contact" });

    expect(markup).toContain('id="inspection-status-filter"');
    expect(markup).toContain('name="status"');
    expect(markup).toContain('<option value="all"');
    expect(markup).toContain('<option value="pending"');
    expect(markup).toContain('<option value="running"');
    expect(markup).toContain('<option value="completed"');
    expect(markup).toContain('<option value="failed"');
  });

  it("preserves q correctly when a status is selected", async () => {
    const markup = await renderHistoryPage("website-1", {
      q: "contact",
      status: "completed",
    });

    expect(markup).toContain(
      'action="/websites/website-1/inspections" method="get"'
    );
    expect(markup).toContain('type="hidden" name="q" value="contact"');
    expectSelectedStatus(markup, "completed");
  });

  it("renders Clear all when filters are active", async () => {
    const markup = await renderHistoryPage("website-1", { q: "contact" });

    expect(markup).toContain("Clear all");
  });

  it("does not render Clear all when filters are inactive", async () => {
    const markup = await renderHistoryPage();

    expect(markup).not.toContain("Clear all");
  });

  it("points Clear all to the inspection-history route", async () => {
    const markup = await renderHistoryPage("website-1", { status: "failed" });

    expect(getClearAllHref(markup)).toBe("/websites/website-1/inspections");
  });

  it("does not include query parameters in the Clear all link", async () => {
    const markup = await renderHistoryPage("website-1", {
      q: "contact",
      status: "failed",
      property: "property-1",
    });

    expect(getClearAllHref(markup)).toBe("/websites/website-1/inspections");
    expect(getClearAllHref(markup)).not.toContain("?");
  });

  it("does not include q in the Clear all link", async () => {
    const markup = await renderHistoryPage("website-1", {
      q: "contact",
      status: "failed",
      property: "property-1",
    });

    expect(getClearAllHref(markup)).not.toContain("q=");
  });

  it("does not include status in the Clear all link", async () => {
    const markup = await renderHistoryPage("website-1", {
      q: "contact",
      status: "failed",
      property: "property-1",
    });

    expect(getClearAllHref(markup)).not.toContain("status=");
  });

  it("does not include property in the Clear all link", async () => {
    const markup = await renderHistoryPage("website-1", {
      q: "contact",
      status: "failed",
      property: "property-1",
    });

    expect(getClearAllHref(markup)).not.toContain("property=");
  });

  it("preserves the current website ID in the Clear all link", async () => {
    mockState.websites = [websiteFixture({ id: "website-custom" })];
    mockState.inspections = [
      inspectionFixture({ websiteId: "website-custom" }),
    ];

    const markup = await renderHistoryPage("website-custom", {
      property: "property-1",
    });

    expect(getClearAllHref(markup)).toBe("/websites/website-custom/inspections");
  });

  it("renders Clear all when property is the only active filter", async () => {
    const markup = await renderHistoryPage("website-1", {
      property: "property-1",
    });

    expect(getClearAllHref(markup)).toBe("/websites/website-1/inspections");
  });

  it("does not introduce a client-side fetch for status filtering", async () => {
    const markup = await renderHistoryPage("website-1", { status: "failed" });

    expect(markup).not.toContain("fetch(");
    expect(markup).not.toContain("useSWR");
  });

  it("does not add a property filter", async () => {
    const markup = await renderHistoryPage();

    expect(markup).not.toContain('name="propertyId"');
    expect(markup).not.toContain('name="searchConsolePropertyId"');
  });

  it("selects a valid property option", async () => {
    const markup = await renderHistoryPage("website-1", {
      property: "property-1",
    });

    expectSelectedProperty(markup, "property-1");
  });

  it("selects All properties when property is invalid", async () => {
    const markup = await renderHistoryPage("website-1", {
      property: "missing-property",
    });

    expectSelectedProperty(markup, "all");
  });

  it("keeps All properties selected when property is inactive", async () => {
    const markup = await renderHistoryPage("website-1", { property: "all" });

    expectSelectedProperty(markup, "all");
  });

  it("selects All properties when no property query is present", async () => {
    const markup = await renderHistoryPage();

    expectSelectedProperty(markup, "all");
  });

  it("uses the Clear all destination for the default property state", async () => {
    const filteredMarkup = await renderHistoryPage("website-1", {
      property: "property-1",
    });

    expect(getClearAllHref(filteredMarkup)).toBe(
      "/websites/website-1/inspections"
    );
    expectSelectedProperty(await renderHistoryPage(), "all");
  });

  it("uses the Clear filters destination for the default property state", async () => {
    mockState.inspections = [
      inspectionFixture({ searchConsolePropertyId: "property-1" }),
    ];
    mockState.forceEmptyInspectionResults = true;

    const filteredMarkup = await renderHistoryPage("website-1", {
      property: "property-1",
    });

    expect(getClearFiltersHref(filteredMarkup)).toBe(
      "/websites/website-1/inspections"
    );

    mockState.forceEmptyInspectionResults = false;
    expectSelectedProperty(await renderHistoryPage(), "all");
  });

  it("does not leave a property option selected after reset", async () => {
    const markup = await renderHistoryPage();

    expectSelectedProperty(markup, "all");
    expect(markup).not.toMatch(
      /<option(?: selected="" value="property-1"| value="property-1" selected="")>/
    );
  });

  it("keeps existing property options rendered after reset", async () => {
    const markup = await renderHistoryPage();

    expect(markup).toContain('<option value="property-1"');
    expect(markup).toContain("https://example.com/");
  });

  it("selects a valid property after trimming whitespace", async () => {
    const markup = await renderHistoryPage("website-1", {
      property: "  property-1  ",
    });

    expectSelectedProperty(markup, "property-1");
  });

  it("does not apply property filtering to the inspection Prisma query", async () => {
    await renderHistoryPage("website-1", { property: "missing-property" });

    const where = (mockState.lastFindManyArgs as {
      where: Record<string, unknown>;
    }).where;

    expect(where).not.toHaveProperty("property");
    expect(where).not.toHaveProperty("propertyId");
    expect(where).not.toHaveProperty("searchConsolePropertyId");
  });

  it("adds the property condition for a valid selectedPropertyId", async () => {
    await renderHistoryPage("website-1", { property: "property-1" });

    expect(mockState.lastFindManyArgs).toMatchObject({
      where: { searchConsolePropertyId: "property-1" },
    });
  });

  it("adds no property condition when selectedPropertyId is null", async () => {
    await renderHistoryPage("website-1", { property: "all" });

    const where = (mockState.lastFindManyArgs as {
      where: Record<string, unknown>;
    }).where;

    expect(where).not.toHaveProperty("searchConsolePropertyId");
  });

  it("combines property filtering with website scope", async () => {
    await renderHistoryPage("website-1", { property: "property-1" });

    expect(mockState.lastFindManyArgs).toMatchObject({
      where: {
        websiteId: "website-1",
        searchConsolePropertyId: "property-1",
      },
    });
  });

  it("combines property filtering with organization scope", async () => {
    await renderHistoryPage("website-1", { property: "property-1" });

    expect(mockState.lastFindManyArgs).toMatchObject({
      where: {
        organizationId: "org-1",
        searchConsolePropertyId: "property-1",
      },
    });
  });

  it("combines property filtering with q", async () => {
    await renderHistoryPage("website-1", {
      q: "contact",
      property: "property-1",
    });

    expect(mockState.lastFindManyArgs).toMatchObject({
      where: {
        searchConsolePropertyId: "property-1",
        inspectedUrl: {
          contains: "contact",
          mode: "insensitive",
        },
      },
    });
  });

  it("combines property filtering with status", async () => {
    await renderHistoryPage("website-1", {
      status: "failed",
      property: "property-1",
    });

    expect(mockState.lastFindManyArgs).toMatchObject({
      where: {
        searchConsolePropertyId: "property-1",
        status: "FAILED",
      },
    });
  });

  it("combines property filtering with q and status", async () => {
    await renderHistoryPage("website-1", {
      q: "contact",
      status: "completed",
      property: "property-1",
    });

    expect(mockState.lastFindManyArgs).toMatchObject({
      where: {
        organizationId: "org-1",
        websiteId: "website-1",
        searchConsolePropertyId: "property-1",
        status: "COMPLETED",
        inspectedUrl: {
          contains: "contact",
          mode: "insensitive",
        },
      },
    });
  });

  it("returns only inspections matching the selected property", async () => {
    mockState.properties = [
      propertyFixture({ id: "property-1", siteUrl: "https://example.com/" }),
      propertyFixture({ id: "property-2", siteUrl: "https://two.example.com/" }),
    ];
    mockState.inspections = [
      inspectionFixture({
        id: "inspection-property-1",
        inspectedUrl: "https://example.com/property-one",
        searchConsolePropertyId: "property-1",
      }),
      inspectionFixture({
        id: "inspection-property-2",
        inspectedUrl: "https://example.com/property-two",
        searchConsolePropertyId: "property-2",
      }),
    ];

    const markup = await renderHistoryPage("website-1", {
      property: "property-1",
    });

    expect(markup).toContain("https://example.com/property-one");
    expect(markup).not.toContain("https://example.com/property-two");
  });

  it("keeps the result table unchanged when property-filtered results exist", async () => {
    mockState.inspections = [
      inspectionFixture({
        inspectedUrl: "https://example.com/property-one",
        searchConsolePropertyId: "property-1",
      }),
    ];

    const markup = await renderHistoryPage("website-1", {
      property: "property-1",
    });

    expect(markup).toContain("<table");
    expect(markup).toContain("URL");
    expect(markup).toContain("Status");
    expect(markup).toContain("Verdict");
    expect(markup).toContain("Coverage");
    expect(markup).toContain("Inspected");
    expect(markup).toContain("Action");
    expect(markup).toContain("https://example.com/property-one");
  });

  it("excludes inspections from another property", async () => {
    mockState.properties = [
      propertyFixture({ id: "property-1" }),
      propertyFixture({ id: "property-2", siteUrl: "https://two.example.com/" }),
    ];
    mockState.inspections = [
      inspectionFixture({ searchConsolePropertyId: "property-1" }),
      inspectionFixture({
        id: "inspection-2",
        inspectedUrl: "https://example.com/other-property",
        searchConsolePropertyId: "property-2",
      }),
    ];

    const markup = await renderHistoryPage("website-1", {
      property: "property-1",
    });

    expect(markup).not.toContain("https://example.com/other-property");
  });

  it("excludes property-matching inspections from another website", async () => {
    mockState.inspections = [
      inspectionFixture({
        inspectedUrl: "https://example.com/owned",
        searchConsolePropertyId: "property-1",
      }),
      inspectionFixture({
        id: "inspection-2",
        websiteId: "website-2",
        inspectedUrl: "https://example.com/other-website",
        searchConsolePropertyId: "property-1",
      }),
    ];

    const markup = await renderHistoryPage("website-1", {
      property: "property-1",
    });

    expect(markup).toContain("https://example.com/owned");
    expect(markup).not.toContain("https://example.com/other-website");
  });

  it("excludes property-matching inspections from another organization", async () => {
    mockState.inspections = [
      inspectionFixture({
        inspectedUrl: "https://example.com/owned",
        searchConsolePropertyId: "property-1",
      }),
      inspectionFixture({
        id: "inspection-2",
        organizationId: "org-2",
        inspectedUrl: "https://example.com/other-org",
        searchConsolePropertyId: "property-1",
      }),
    ];

    const markup = await renderHistoryPage("website-1", {
      property: "property-1",
    });

    expect(markup).toContain("https://example.com/owned");
    expect(markup).not.toContain("https://example.com/other-org");
  });

  it("does not add a property condition for invalid property input", async () => {
    await renderHistoryPage("website-1", { property: "missing-property" });

    const where = (mockState.lastFindManyArgs as {
      where: Record<string, unknown>;
    }).where;

    expect(where).not.toHaveProperty("searchConsolePropertyId");
  });

  it("keeps ordering unchanged when property filtering is active", async () => {
    await renderHistoryPage("website-1", { property: "property-1" });

    expect(mockState.lastFindManyArgs).toMatchObject({
      orderBy: { createdAt: "desc" },
    });
  });

  it("keeps the 25-record limit unchanged when property filtering is active", async () => {
    mockState.inspections = manyInspections(30);

    await renderHistoryPage("website-1", { property: "property-1" });

    expect(mockState.lastFindManyArgs).toMatchObject({ take: 25 });
  });

  it("keeps the safe inspection field selection unchanged when property filtering is active", async () => {
    await renderHistoryPage("website-1", { property: "property-1" });

    const query = JSON.stringify(mockState.lastFindManyArgs);

    expect(query).toContain("inspectedUrl");
    expect(query).toContain("searchConsolePropertyId");
    expect(query).not.toContain("rawResponse");
    expect(query).not.toContain("accessToken");
    expect(query).not.toContain("refreshToken");
  });

  it("keeps the q value visible in the input", async () => {
    const markup = await renderHistoryPage("website-1", { q: "contact" });

    expect(markup).toContain('value="contact"');
  });

  it("matches inspected URLs partially", async () => {
    mockState.inspections = [
      inspectionFixture({ inspectedUrl: "https://example.com/contact" }),
      inspectionFixture({
        id: "inspection-2",
        inspectedUrl: "https://example.com/about",
      }),
    ];

    const markup = await renderHistoryPage("website-1", { q: "contact" });

    expect(markup).toContain("https://example.com/contact");
    expect(markup).not.toContain("https://example.com/about");
    expect(mockState.lastFindManyArgs).toMatchObject({
      where: {
        inspectedUrl: {
          contains: "contact",
          mode: "insensitive",
        },
      },
    });
  });

  it("matches inspected URLs case-insensitively", async () => {
    mockState.inspections = [
      inspectionFixture({ inspectedUrl: "https://example.com/Contact" }),
    ];

    const markup = await renderHistoryPage("website-1", { q: "contact" });

    expect(markup).toContain("https://example.com/Contact");
  });

  it("trims whitespace in q", async () => {
    await renderHistoryPage("website-1", { q: "  contact  " });

    expect(mockState.lastFindManyArgs).toMatchObject({
      where: {
        inspectedUrl: {
          contains: "contact",
          mode: "insensitive",
        },
      },
    });
  });

  it("uses the unfiltered query for empty q", async () => {
    await renderHistoryPage("website-1", { q: "   " });

    expect(
      (mockState.lastFindManyArgs as { where: { inspectedUrl?: unknown } }).where
        .inspectedUrl
    ).toBeUndefined();
  });

  it("adds a valid status to the Prisma where clause", async () => {
    mockState.inspections = [
      inspectionFixture({
        id: "inspection-failed",
        inspectedUrl: "https://example.com/failed",
        status: "FAILED",
      }),
      inspectionFixture({
        id: "inspection-completed",
        inspectedUrl: "https://example.com/completed",
        status: "COMPLETED",
      }),
    ];

    const markup = await renderHistoryPage("website-1", { status: "failed" });

    expect(markup).toContain("https://example.com/failed");
    expect(markup).not.toContain("https://example.com/completed");
    expect(mockState.lastFindManyArgs).toMatchObject({
      where: { status: "FAILED" },
    });
  });

  it("combines q and status in the same Prisma query", async () => {
    mockState.inspections = [
      inspectionFixture({
        id: "inspection-contact-completed",
        inspectedUrl: "https://example.com/contact",
        status: "COMPLETED",
      }),
      inspectionFixture({
        id: "inspection-contact-failed",
        inspectedUrl: "https://example.com/contact-error",
        status: "FAILED",
      }),
      inspectionFixture({
        id: "inspection-about-completed",
        inspectedUrl: "https://example.com/about",
        status: "COMPLETED",
      }),
    ];

    const markup = await renderHistoryPage("website-1", {
      q: "contact",
      status: "completed",
    });

    expect(markup).toContain("https://example.com/contact");
    expect(markup).not.toContain("https://example.com/contact-error");
    expect(markup).not.toContain("https://example.com/about");
    expect(mockState.lastFindManyArgs).toMatchObject({
      where: {
        organizationId: "org-1",
        websiteId: "website-1",
        status: "COMPLETED",
        inspectedUrl: {
          contains: "contact",
          mode: "insensitive",
        },
      },
    });
  });

  it("treats status=all as no Prisma status filter", async () => {
    await renderHistoryPage("website-1", { status: "all" });

    expect(
      (mockState.lastFindManyArgs as { where: { status?: unknown } }).where.status
    ).toBeUndefined();
  });

  it("treats a missing status as no Prisma status filter", async () => {
    await renderHistoryPage();

    expect(
      (mockState.lastFindManyArgs as { where: { status?: unknown } }).where.status
    ).toBeUndefined();
  });

  it("treats an empty status as no Prisma status filter", async () => {
    await renderHistoryPage("website-1", { status: "   " });

    expect(
      (mockState.lastFindManyArgs as { where: { status?: unknown } }).where.status
    ).toBeUndefined();
  });

  it("treats unsupported status values as no Prisma status filter", async () => {
    await renderHistoryPage("website-1", { status: "deleted" });

    expect(
      (mockState.lastFindManyArgs as { where: { status?: unknown } }).where.status
    ).toBeUndefined();
  });

  it("keeps status filtering limited to the selected website", async () => {
    mockState.inspections = [
      inspectionFixture({ id: "owned-failed", status: "FAILED" }),
      inspectionFixture({
        id: "other-website-failed",
        websiteId: "website-2",
        inspectedUrl: "https://example.com/other-website-failed",
        status: "FAILED",
      }),
    ];

    const markup = await renderHistoryPage("website-1", { status: "failed" });

    expect(markup).toContain("https://example.com/page-1");
    expect(markup).not.toContain("https://example.com/other-website-failed");
    expect(mockState.lastFindManyArgs).toMatchObject({
      where: { organizationId: "org-1", websiteId: "website-1" },
    });
  });

  it("keeps status filtering limited to the current organization", async () => {
    mockState.inspections = [
      inspectionFixture({ id: "owned-failed", status: "FAILED" }),
      inspectionFixture({
        id: "other-org-failed",
        organizationId: "org-2",
        inspectedUrl: "https://example.com/other-org-failed",
        status: "FAILED",
      }),
    ];

    const markup = await renderHistoryPage("website-1", { status: "failed" });

    expect(markup).toContain("https://example.com/page-1");
    expect(markup).not.toContain("https://example.com/other-org-failed");
    expect(mockState.lastFindManyArgs).toMatchObject({
      where: { organizationId: "org-1", websiteId: "website-1" },
    });
  });

  it("keeps status results ordered newest first", async () => {
    await renderHistoryPage("website-1", { status: "completed" });

    expect(mockState.lastFindManyArgs).toMatchObject({
      orderBy: { createdAt: "desc" },
    });
  });

  it("keeps status results limited to 25", async () => {
    mockState.inspections = manyInspections(30);

    const markup = await renderHistoryPage("website-1", {
      status: "completed",
    });

    expect(markup).toContain("Loaded inspections");
    expect(markup).toContain(">25</p>");
    expect(mockState.lastFindManyArgs).toMatchObject({ take: 25 });
  });

  it("keeps search limited to the selected website", async () => {
    mockState.inspections = [
      inspectionFixture({ inspectedUrl: "https://example.com/contact" }),
      inspectionFixture({
        id: "inspection-2",
        websiteId: "website-2",
        inspectedUrl: "https://example.com/contact-other",
      }),
    ];

    const markup = await renderHistoryPage("website-1", { q: "contact" });

    expect(markup).toContain("https://example.com/contact");
    expect(markup).not.toContain("https://example.com/contact-other");
    expect(mockState.lastFindManyArgs).toMatchObject({
      where: { organizationId: "org-1", websiteId: "website-1" },
    });
  });

  it("keeps search limited to the current organization", async () => {
    mockState.inspections = [
      inspectionFixture({ inspectedUrl: "https://example.com/contact" }),
      inspectionFixture({
        id: "inspection-2",
        organizationId: "org-2",
        inspectedUrl: "https://example.com/contact-other-org",
      }),
    ];

    const markup = await renderHistoryPage("website-1", { q: "contact" });

    expect(markup).toContain("https://example.com/contact");
    expect(markup).not.toContain("https://example.com/contact-other-org");
    expect(mockState.lastFindManyArgs).toMatchObject({
      where: { organizationId: "org-1", websiteId: "website-1" },
    });
  });

  it("keeps search results ordered newest first", async () => {
    await renderHistoryPage("website-1", { q: "page" });

    expect(mockState.lastFindManyArgs).toMatchObject({
      orderBy: { createdAt: "desc" },
    });
  });

  it("keeps search results limited to 25", async () => {
    mockState.inspections = manyInspections(30);

    const markup = await renderHistoryPage("website-1", { q: "page" });

    expect(markup).toContain("Loaded inspections");
    expect(markup).toContain(">25</p>");
    expect(mockState.lastFindManyArgs).toMatchObject({ take: 25 });
  });

  it("renders the filtered empty state when active filters return no inspections", async () => {
    mockState.inspections = [
      inspectionFixture({ inspectedUrl: "https://example.com/about" }),
    ];

    const markup = await renderHistoryPage("website-1", { q: "contact" });

    expect(markup).toContain("No inspections matched");
    expect(markup).toContain(
      'class="grid max-w-md justify-items-center gap-4"'
    );
  });

  it("renders the filtered empty state for property-only empty results", async () => {
    mockState.inspections = [
      inspectionFixture({ searchConsolePropertyId: "property-1" }),
    ];
    mockState.forceEmptyInspectionResults = true;

    const markup = await renderHistoryPage("website-1", {
      property: "property-1",
    });

    expect(markup).toContain("No inspections matched");
  });

  it("does not render the first-use empty state for property-only empty results", async () => {
    mockState.inspections = [
      inspectionFixture({ searchConsolePropertyId: "property-1" }),
    ];
    mockState.forceEmptyInspectionResults = true;

    const markup = await renderHistoryPage("website-1", {
      property: "property-1",
    });

    expect(markup).not.toContain("No website insights yet");
  });

  it("renders Clear filters for property-only empty results", async () => {
    mockState.inspections = [
      inspectionFixture({ searchConsolePropertyId: "property-1" }),
    ];
    mockState.forceEmptyInspectionResults = true;

    const markup = await renderHistoryPage("website-1", {
      property: "property-1",
    });

    expect(markup).toContain("Clear filters");
  });

  it("renders Clear all when a valid property filter is active", async () => {
    const markup = await renderHistoryPage("website-1", {
      property: "property-1",
    });

    expect(markup).toContain("Clear all");
  });

  it("renders the filtered empty state title", async () => {
    mockState.inspections = [];

    const markup = await renderHistoryPage("website-1", { status: "failed" });

    expect(markup).toContain("No inspections matched");
  });

  it("renders the filtered empty state explanation", async () => {
    mockState.inspections = [];

    const markup = await renderHistoryPage("website-1", { q: "contact" });

    expect(markup).toContain(
      "The current search or status filter returned no inspection results."
    );
  });

  it("renders Clear filters in the filtered empty state", async () => {
    mockState.inspections = [];

    const markup = await renderHistoryPage("website-1", { q: "contact" });

    expect(markup).toContain("Clear filters");
  });

  it("does not render Clear filters in the first-use empty state", async () => {
    mockState.inspections = [];

    const markup = await renderHistoryPage();

    expect(markup).not.toContain("Clear filters");
  });

  it("points Clear filters to the inspection-history route", async () => {
    mockState.inspections = [];

    const markup = await renderHistoryPage("website-1", { status: "failed" });

    expect(getClearFiltersHref(markup)).toBe("/websites/website-1/inspections");
  });

  it("does not include query parameters in the Clear filters link", async () => {
    mockState.inspections = [];

    const markup = await renderHistoryPage("website-1", {
      q: "contact",
      status: "failed",
      property: "property-1",
    });

    expect(getClearFiltersHref(markup)).toBe("/websites/website-1/inspections");
    expect(getClearFiltersHref(markup)).not.toContain("?");
  });

  it("does not include q in the Clear filters link", async () => {
    mockState.inspections = [];

    const markup = await renderHistoryPage("website-1", {
      q: "contact",
      status: "failed",
      property: "property-1",
    });

    expect(getClearFiltersHref(markup)).not.toContain("q=");
  });

  it("does not include status in the Clear filters link", async () => {
    mockState.inspections = [];

    const markup = await renderHistoryPage("website-1", {
      q: "contact",
      status: "failed",
      property: "property-1",
    });

    expect(getClearFiltersHref(markup)).not.toContain("status=");
  });

  it("does not include property in the Clear filters link", async () => {
    mockState.inspections = [];

    const markup = await renderHistoryPage("website-1", {
      q: "contact",
      status: "failed",
      property: "property-1",
    });

    expect(getClearFiltersHref(markup)).not.toContain("property=");
  });

  it("preserves the current website ID in the Clear filters link", async () => {
    mockState.websites = [websiteFixture({ id: "website-custom" })];
    mockState.inspections = [
      inspectionFixture({
        websiteId: "website-custom",
        searchConsolePropertyId: "property-1",
      }),
    ];
    mockState.forceEmptyInspectionResults = true;

    const markup = await renderHistoryPage("website-custom", {
      property: "property-1",
    });

    expect(getClearFiltersHref(markup)).toBe(
      "/websites/website-custom/inspections"
    );
  });

  it("renders Clear filters for a property-only empty result", async () => {
    mockState.inspections = [
      inspectionFixture({ searchConsolePropertyId: "property-1" }),
    ];
    mockState.forceEmptyInspectionResults = true;

    const markup = await renderHistoryPage("website-1", {
      property: "property-1",
    });

    expect(getClearFiltersHref(markup)).toBe("/websites/website-1/inspections");
  });

  it("does not render the first-use empty state when filters are active", async () => {
    mockState.inspections = [];

    const markup = await renderHistoryPage("website-1", { status: "failed" });

    expect(markup).not.toContain("No website insights yet");
    expect(markup).not.toContain(
      "Inspect a few URLs to begin building an overview of how Google currently sees your website."
    );
  });

  it("keeps the first-use empty state when filters are inactive", async () => {
    mockState.inspections = [];

    const markup = await renderHistoryPage();

    expect(markup).toContain("No website insights yet");
    expect(markup).not.toContain("No inspections matched");
  });

  it("keeps the Inspect a URL action in the first-use empty state", async () => {
    mockState.inspections = [];

    const markup = await renderHistoryPage();

    expect(markup).toContain('href="/websites/website-1/inspect"');
    expect(markup).toContain("Inspect a URL");
  });

  it("does not render the filtered empty state when results exist", async () => {
    mockState.inspections = [
      inspectionFixture({ inspectedUrl: "https://example.com/contact" }),
    ];

    const markup = await renderHistoryPage("website-1", { q: "contact" });

    expect(markup).not.toContain("No inspections matched");
  });

  it("keeps the table when results exist", async () => {
    mockState.inspections = [
      inspectionFixture({ inspectedUrl: "https://example.com/contact" }),
    ];

    const markup = await renderHistoryPage("website-1", { q: "contact" });

    expect(markup).toContain("<table");
    expect(markup).toContain("https://example.com/contact");
  });

  it("does not use raw SQL for search", async () => {
    await renderHistoryPage("website-1", { q: "contact" });

    const query = JSON.stringify(mockState.lastFindManyArgs);

    expect(query).not.toContain("$queryRaw");
    expect(query).not.toContain("executeRaw");
    expect(query).not.toContain("SELECT ");
  });

  it("does not use raw SQL for status filtering", async () => {
    await renderHistoryPage("website-1", { status: "failed" });

    const query = JSON.stringify(mockState.lastFindManyArgs);

    expect(query).not.toContain("$queryRaw");
    expect(query).not.toContain("executeRaw");
    expect(query).not.toContain("SELECT ");
  });
});
