import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type PropertyFixture = {
  id: string;
  siteUrl: string;
  normalizedSiteUrl: string;
  propertyType: "DOMAIN" | "URL_PREFIX";
  permissionLevel: string;
  verified: boolean;
  syncStatus: "ACTIVE" | "MISSING" | "ERROR";
  lastSyncedAt: Date | null;
  googleAccount: { email: string };
  website: { id: string; name: string } | null;
};

type UrlInventoryRepositoryFixture = {
  getWebsite: () => Promise<{
    id: string;
    name: string;
    domain: string;
    status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  } | null>;
  listSourceSitemaps: () => Promise<Array<{ id: string; url: string }>>;
  countUrlRecords: () => Promise<number>;
  listUrlRecords: () => Promise<
    Array<{
      id: string;
      url: string;
      path: string;
      sitemapLastModifiedAt: Date | null;
      firstDiscoveredAt: Date;
      lastDiscoveredAt: Date;
      sitemap: { id: string; url: string } | null;
    }>
  >;
  getSummary: () => Promise<{
    totalUrls: number;
    discoveredLast7Days: number;
    updatedLast7Days: number;
    sourceSitemaps: number;
  }>;
  getUrlDetails: () => Promise<null>;
};

type UrlInventoryRecordFixture = Awaited<
  ReturnType<UrlInventoryRepositoryFixture["listUrlRecords"]>
>[number];

const mockState = vi.hoisted(() => ({
  organizationId: "org-1",
  propertyDatabaseFails: false,
  properties: [] as PropertyFixture[],
  urlInventoryDatabaseFails: false,
  urlInventoryRecords: [] as UrlInventoryRecordFixture[],
}));

vi.mock("@/lib/auth/organization", () => ({
  getCurrentOrganizationContext: async () => ({
    userId: "user-1",
    organizationId: mockState.organizationId,
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    searchConsoleProperty: {
      count: async () => {
        if (mockState.propertyDatabaseFails) {
          throw new Error("database unavailable");
        }

        return mockState.properties.length;
      },
      findMany: async () => {
        if (mockState.propertyDatabaseFails) {
          throw new Error("database unavailable");
        }

        return mockState.properties;
      },
    },
  },
}));

vi.mock("@/lib/urls/prisma-repository", () => ({
  createPrismaUrlInventoryRepository: () =>
    createUrlInventoryRepositoryFixture(),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const baseDate = new Date("2026-07-18T12:00:00.000Z");

function createProperty(
  input: Partial<PropertyFixture> = {}
): PropertyFixture {
  return {
    id: input.id ?? "property-1",
    siteUrl: input.siteUrl ?? "https://example.com/",
    normalizedSiteUrl: input.normalizedSiteUrl ?? "https://example.com/",
    propertyType: input.propertyType ?? "URL_PREFIX",
    permissionLevel: input.permissionLevel ?? "siteOwner",
    verified: input.verified ?? true,
    syncStatus: input.syncStatus ?? "ACTIVE",
    lastSyncedAt: input.lastSyncedAt ?? baseDate,
    googleAccount: input.googleAccount ?? { email: "owner@example.com" },
    website: input.website ?? { id: "website-1", name: "Example" },
  };
}

function createUrlInventoryRepositoryFixture(): UrlInventoryRepositoryFixture {
  return {
    async getWebsite() {
      if (mockState.urlInventoryDatabaseFails) {
        throw new Error("database unavailable");
      }

      return {
        id: "website-1",
        name: "Example",
        domain: "example.com",
        status: "ACTIVE",
      };
    },
    async listSourceSitemaps() {
      return [{ id: "sitemap-1", url: "https://example.com/sitemap.xml" }];
    },
    async countUrlRecords() {
      return mockState.urlInventoryRecords.length;
    },
    async listUrlRecords() {
      return mockState.urlInventoryRecords;
    },
    async getSummary() {
      return {
        totalUrls: 1,
        discoveredLast7Days: 1,
        updatedLast7Days: 1,
        sourceSitemaps: 1,
      };
    },
    async getUrlDetails() {
      return null;
    },
  };
}

async function renderSearchConsolePropertiesLoading() {
  const { default: Loading } = await import(
    "../app/(app)/search-console/properties/loading"
  );

  return renderToStaticMarkup(<Loading />);
}

async function renderUrlInventoryLoading() {
  const { default: Loading } = await import(
    "../app/(app)/websites/[id]/urls/loading"
  );

  return renderToStaticMarkup(<Loading />);
}

async function renderSearchConsolePropertiesPage() {
  const { default: Page } = await import(
    "../app/(app)/search-console/properties/page"
  );
  const element = await Page({ searchParams: Promise.resolve({}) });

  return renderToStaticMarkup(element);
}

async function renderUrlInventoryPage() {
  const { default: Page } = await import(
    "../app/(app)/websites/[id]/urls/page"
  );
  const element = await Page({
    params: Promise.resolve({ id: "website-1" }),
    searchParams: Promise.resolve({}),
  });

  return renderToStaticMarkup(element);
}

beforeEach(() => {
  vi.resetModules();
  mockState.organizationId = "org-1";
  mockState.propertyDatabaseFails = false;
  mockState.properties = [createProperty()];
  mockState.urlInventoryDatabaseFails = false;
  mockState.urlInventoryRecords = [
    {
      id: "url-1",
      url: "https://example.com/contact",
      path: "/contact",
      sitemapLastModifiedAt: baseDate,
      firstDiscoveredAt: baseDate,
      lastDiscoveredAt: baseDate,
      sitemap: {
        id: "sitemap-1",
        url: "https://example.com/sitemap.xml",
      },
    },
  ];
});

describe("medium-priority loading state standardization", () => {
  it("renders the Search Console property list loading skeleton", async () => {
    const markup = await renderSearchConsolePropertiesLoading();

    expect(markup).toContain("Loading Search Console properties...");
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("motion-safe:animate-pulse");
    expect(markup).not.toContain("No Search Console properties yet");
  });

  it("replaces the property loading skeleton with populated UI", async () => {
    const markup = await renderSearchConsolePropertiesPage();

    expect(markup).toContain("https://example.com/");
    expect(markup).toContain("owner@example.com");
    expect(markup).not.toContain("Loading Search Console properties...");
    expect(markup).not.toContain("motion-safe:animate-pulse");
  });

  it("keeps the property database error state visible", async () => {
    mockState.propertyDatabaseFails = true;

    const markup = await renderSearchConsolePropertiesPage();

    expect(markup).toContain("Properties unavailable");
    expect(markup).toContain(
      "Search Console properties could not be loaded from the database."
    );
    expect(markup).not.toContain("Loading Search Console properties...");
  });

  it("renders the URL inventory loading skeleton", async () => {
    const markup = await renderUrlInventoryLoading();

    expect(markup).toContain("Loading URL inventory...");
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("motion-safe:animate-pulse");
    expect(markup).not.toContain("No imported URLs yet");
    expect(markup).not.toContain("No URLs match these filters");
  });

  it("replaces the URL inventory skeleton with populated UI", async () => {
    const markup = await renderUrlInventoryPage();

    expect(markup).toContain("URL Inventory");
    expect(markup).toContain(
      "URL inventory shows the pages IndexPilot has discovered for this website. A discovered URL is not necessarily indexed by Google."
    );
    expect(markup).toContain(
      'class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground"'
    );
    expect(markup).toContain("https://example.com/contact");
    expect(markup).not.toContain("Loading URL inventory...");
    expect(markup).not.toContain("motion-safe:animate-pulse");
  });

  it("keeps the URL inventory database error state visible", async () => {
    mockState.urlInventoryDatabaseFails = true;

    const markup = await renderUrlInventoryPage();

    expect(markup).toContain("URL inventory unavailable");
    expect(markup).toContain(
      "The URL inventory could not be loaded from the database."
    );
    expect(markup).not.toContain("Loading URL inventory...");
  });

  it("renders the URL inventory empty state with standardized spacing", async () => {
    mockState.urlInventoryRecords = [];

    const markup = await renderUrlInventoryPage();

    expect(markup).toContain("No imported URLs yet");
    expect(markup).toContain(
      "Import a URL-set sitemap to populate the inventory with real URL records."
    );
    expect(markup).toContain("Go to Sitemaps");
    expect(markup).toContain(
      'class="grid max-w-md justify-items-center gap-4"'
    );
    expect(markup).toContain(
      'class="text-sm leading-6 text-slate-500"'
    );
  });
});
