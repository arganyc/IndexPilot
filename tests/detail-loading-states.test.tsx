import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type PropertyFixture = {
  id: string;
  organizationId: string;
  siteUrl: string;
  normalizedSiteUrl: string;
  propertyType: "DOMAIN" | "URL_PREFIX";
  permissionLevel: string;
  verified: boolean;
  syncStatus: "ACTIVE" | "MISSING" | "ERROR";
  lastSyncedAt: Date | null;
  lastSeenAt: Date | null;
  removedFromGoogleAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  googleAccount: {
    id: string;
    organizationId: string;
    email: string;
    displayName: string | null;
  } | null;
  website: {
    id: string;
    name: string;
    domain: string;
    status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  } | null;
};

type InspectionFixture = {
  id: string;
  organizationId: string;
  websiteId: string;
  inspectedUrl: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  verdict: string | null;
  coverageState: string | null;
  indexingState: string | null;
  robotsTxtState: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  completedAt: Date | null;
  pageFetchState: string | null;
  crawledAs: string | null;
  userCanonical: string | null;
  googleCanonical: string | null;
  lastCrawlTime: Date | null;
};

const mockState = vi.hoisted(() => ({
  authFails: false,
  organizationId: "org-1",
  propertyDatabaseFails: false,
  property: null as PropertyFixture | null,
  website: { id: "website-1", organizationId: "org-1" } as {
    id: string;
    organizationId: string;
  } | null,
  inspection: null as InspectionFixture | null,
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
    searchConsoleProperty: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        if (mockState.propertyDatabaseFails) {
          throw new Error("database unavailable");
        }

        return mockState.property?.id === where.id ? mockState.property : null;
      },
    },
    website: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        mockState.website?.id === where.id ? mockState.website : null,
    },
    urlInspection: {
      findFirst: async ({
        where,
      }: {
        where: { id: string; websiteId: string; organizationId: string };
      }) => {
        const inspection = mockState.inspection;

        if (
          inspection?.id === where.id &&
          inspection.websiteId === where.websiteId &&
          inspection.organizationId === where.organizationId
        ) {
          return {
            inspectedUrl: inspection.inspectedUrl,
            status: inspection.status,
            verdict: inspection.verdict,
            coverageState: inspection.coverageState,
            indexingState: inspection.indexingState,
            robotsTxtState: inspection.robotsTxtState,
            createdAt: inspection.createdAt,
            updatedAt: inspection.updatedAt,
            completedAt: inspection.completedAt,
            pageFetchState: inspection.pageFetchState,
            crawledAs: inspection.crawledAs,
            userCanonical: inspection.userCanonical,
            googleCanonical: inspection.googleCanonical,
            lastCrawlTime: inspection.lastCrawlTime,
          };
        }

        return null;
      },
    },
  },
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  },
}));

const baseDate = new Date("2026-07-18T12:00:00.000Z");

function propertyFixture(
  input: Partial<PropertyFixture> = {}
): PropertyFixture {
  return {
    id: input.id ?? "property-1",
    organizationId: input.organizationId ?? "org-1",
    siteUrl: input.siteUrl ?? "https://example.com/",
    normalizedSiteUrl: input.normalizedSiteUrl ?? "https://example.com/",
    propertyType: input.propertyType ?? "URL_PREFIX",
    permissionLevel: input.permissionLevel ?? "siteOwner",
    verified: input.verified ?? true,
    syncStatus: input.syncStatus ?? "ACTIVE",
    lastSyncedAt: input.lastSyncedAt ?? baseDate,
    lastSeenAt: input.lastSeenAt ?? baseDate,
    removedFromGoogleAt: input.removedFromGoogleAt ?? null,
    createdAt: input.createdAt ?? baseDate,
    updatedAt: input.updatedAt ?? baseDate,
    googleAccount:
      input.googleAccount === undefined
        ? {
            id: "account-1",
            organizationId: "org-1",
            email: "owner@example.com",
            displayName: "Owner",
          }
        : input.googleAccount,
    website:
      input.website === undefined
        ? {
            id: "website-1",
            name: "Example",
            domain: "example.com",
            status: "ACTIVE",
          }
        : input.website,
  };
}

function inspectionFixture(
  input: Partial<InspectionFixture> = {}
): InspectionFixture {
  return {
    id: input.id ?? "inspection-1",
    organizationId: input.organizationId ?? "org-1",
    websiteId: input.websiteId ?? "website-1",
    inspectedUrl: input.inspectedUrl ?? "https://example.com/page",
    status: input.status ?? "COMPLETED",
    verdict: input.verdict ?? "PASS",
    coverageState: input.coverageState ?? "Submitted and indexed",
    indexingState: input.indexingState ?? "INDEXING_ALLOWED",
    robotsTxtState: input.robotsTxtState ?? "ALLOWED",
    createdAt: input.createdAt ?? baseDate,
    updatedAt: input.updatedAt ?? baseDate,
    completedAt: input.completedAt ?? baseDate,
    pageFetchState: input.pageFetchState ?? "SUCCESSFUL",
    crawledAs: input.crawledAs ?? "MOBILE",
    userCanonical: input.userCanonical ?? "https://example.com/user-canonical",
    googleCanonical:
      input.googleCanonical ?? "https://example.com/google-canonical",
    lastCrawlTime: input.lastCrawlTime ?? baseDate,
  };
}

async function renderPropertyDetailsLoading() {
  const { default: Loading } = await import(
    "../app/(app)/search-console/properties/[propertyId]/loading"
  );

  return renderToStaticMarkup(<Loading />);
}

async function renderInspectionDetailsLoading() {
  const { default: Loading } = await import(
    "../app/(app)/websites/[id]/inspections/[inspectionId]/loading"
  );

  return renderToStaticMarkup(<Loading />);
}

async function renderPropertyDetailsPage() {
  const { default: Page } = await import(
    "../app/(app)/search-console/properties/[propertyId]/page"
  );
  const element = await Page({
    params: Promise.resolve({ propertyId: "property-1" }),
  });

  return renderToStaticMarkup(element);
}

async function renderInspectionDetailsPage() {
  const { default: Page } = await import(
    "../app/(app)/websites/[id]/inspections/[inspectionId]/page"
  );
  const element = await Page({
    params: Promise.resolve({ id: "website-1", inspectionId: "inspection-1" }),
  });

  return renderToStaticMarkup(element);
}

beforeEach(() => {
  vi.resetModules();
  mockState.authFails = false;
  mockState.organizationId = "org-1";
  mockState.propertyDatabaseFails = false;
  mockState.property = propertyFixture();
  mockState.website = { id: "website-1", organizationId: "org-1" };
  mockState.inspection = inspectionFixture();
});

describe("detail loading states", () => {
  it("renders the Search Console property details loading skeleton", async () => {
    const markup = await renderPropertyDetailsLoading();

    expect(markup).toContain("Loading property details...");
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("motion-safe:animate-pulse");
    expect(markup).not.toContain("Property details unavailable");
  });

  it("replaces the property details skeleton with populated UI", async () => {
    const markup = await renderPropertyDetailsPage();

    expect(markup).toContain("Search Console property");
    expect(markup).toContain("https://example.com/");
    expect(markup).toContain("owner@example.com");
    expect(markup).not.toContain("Loading property details...");
    expect(markup).not.toContain("motion-safe:animate-pulse");
  });

  it("keeps the property details database error state visible", async () => {
    mockState.propertyDatabaseFails = true;

    const markup = await renderPropertyDetailsPage();

    expect(markup).toContain("Property details unavailable");
    expect(markup).toContain(
      "The Search Console property could not be loaded from the database."
    );
    expect(markup).not.toContain("Loading property details...");
  });

  it("renders the inspection details loading skeleton", async () => {
    const markup = await renderInspectionDetailsLoading();

    expect(markup).toContain("Loading inspection details...");
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("motion-safe:animate-pulse");
    expect(markup).not.toContain("Inspection Details");
    expect(markup).not.toContain("Not available");
  });

  it("replaces the inspection details skeleton with populated UI", async () => {
    const markup = await renderInspectionDetailsPage();

    expect(markup).toContain("Inspection Details");
    expect(markup).toContain("https://example.com/page");
    expect(markup).toContain("Coverage");
    expect(markup).not.toContain("Loading inspection details...");
    expect(markup).not.toContain("motion-safe:animate-pulse");
  });

  it("keeps missing inspection access as not found", async () => {
    mockState.inspection = null;

    await expect(renderInspectionDetailsPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
