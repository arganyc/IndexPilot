import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type SyncStatus = "ACTIVE" | "MISSING" | "ERROR";
type PropertyType = "DOMAIN" | "URL_PREFIX";
type SortDirection = "asc" | "desc";

type GoogleAccountFixture = {
  id: string;
  organizationId: string;
  email: string;
  displayName: string | null;
};

type WebsiteFixture = {
  id: string;
  organizationId?: string;
  name: string;
  domain: string;
  status: string;
};

type PropertyFixture = {
  id: string;
  organizationId: string;
  googleAccountId: string;
  websiteId: string | null;
  siteUrl: string;
  normalizedSiteUrl: string;
  propertyType: PropertyType;
  permissionLevel: string;
  verified: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt: Date;
  lastSeenAt: Date;
  removedFromGoogleAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  googleAccount: GoogleAccountFixture | null;
  website: WebsiteFixture | null;
};

type PropertyWhere = {
  organizationId?: string;
  syncStatus?: SyncStatus;
  propertyType?: PropertyType;
  websiteId?: null | { not: null };
  OR?: Array<{
    siteUrl?: { contains: string };
    normalizedSiteUrl?: { contains: string };
    googleAccount?: { email: { contains: string } };
  }>;
};

type FindManyArgs = {
  where?: PropertyWhere;
  orderBy?: Array<Record<string, SortDirection>>;
  skip?: number;
  take?: number;
};

const mockState = vi.hoisted(() => ({
  organizationId: "org-1",
  properties: [] as PropertyFixture[],
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
      count: async ({ where }: { where?: PropertyWhere } = {}) =>
        filterProperties(mockState.properties, where).length,
      findMany: async (args: FindManyArgs = {}) =>
        filterProperties(mockState.properties, args.where)
          .sort((left, right) => compareProperties(left, right, args.orderBy))
          .slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? Number.MAX_SAFE_INTEGER))
          .map(toListRecord),
      findUnique: async ({ where }: { where: { id: string } }) => {
        const property =
          mockState.properties.find((candidate) => candidate.id === where.id) ??
          null;

        return property ? toDetailsRecord(property) : null;
      },
    },
  },
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const baseDate = new Date("2026-07-18T12:00:00.000Z");

function createProperty(input: Partial<PropertyFixture> = {}): PropertyFixture {
  const id = input.id ?? `property-${mockState.properties.length + 1}`;
  const website =
    "website" in input
      ? input.website ?? null
      : {
          id: "website-1",
          organizationId: "org-1",
          name: "Example",
          domain: "example.com",
          status: "ACTIVE",
        };

  return {
    id,
    organizationId: input.organizationId ?? "org-1",
    googleAccountId: input.googleAccountId ?? "account-1",
    websiteId: input.websiteId ?? website?.id ?? null,
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
      "googleAccount" in input
        ? input.googleAccount ?? null
        : {
            id: "account-1",
            organizationId: input.organizationId ?? "org-1",
            email: "owner@example.com",
            displayName: "Owner",
          },
    website,
  };
}

async function renderPropertyList(searchParams: Record<string, string> = {}) {
  const { default: Page } = await import(
    "../app/(app)/search-console/properties/page"
  );
  const element = await Page({ searchParams: Promise.resolve(searchParams) });

  return renderToStaticMarkup(element);
}

async function renderPropertyDetails(propertyId: string) {
  const { default: Page } = await import(
    "../app/(app)/search-console/properties/[propertyId]/page"
  );
  const element = await Page({ params: Promise.resolve({ propertyId }) });

  return renderToStaticMarkup(element);
}

function filterProperties(
  properties: PropertyFixture[],
  where: PropertyWhere = {}
) {
  return properties.filter((property) => {
    if (where.organizationId && property.organizationId !== where.organizationId) {
      return false;
    }

    if (where.syncStatus && property.syncStatus !== where.syncStatus) {
      return false;
    }

    if (where.propertyType && property.propertyType !== where.propertyType) {
      return false;
    }

    if (where.websiteId === null && property.websiteId !== null) {
      return false;
    }

    if (
      typeof where.websiteId === "object" &&
      where.websiteId?.not === null &&
      property.websiteId === null
    ) {
      return false;
    }

    if (!where.OR?.length) {
      return true;
    }

    return where.OR.some((condition) => {
      const search =
        condition.siteUrl?.contains ??
        condition.normalizedSiteUrl?.contains ??
        condition.googleAccount?.email.contains ??
        "";
      const needle = search.toLowerCase();

      if (condition.siteUrl) {
        return property.siteUrl.toLowerCase().includes(needle);
      }

      if (condition.normalizedSiteUrl) {
        return property.normalizedSiteUrl.toLowerCase().includes(needle);
      }

      if (condition.googleAccount) {
        return property.googleAccount?.email.toLowerCase().includes(needle);
      }

      return false;
    });
  });
}

function compareProperties(
  left: PropertyFixture,
  right: PropertyFixture,
  orderBy: FindManyArgs["orderBy"] = [{ siteUrl: "asc" }]
) {
  for (const order of orderBy) {
    const [field, direction] = Object.entries(order)[0] ?? ["siteUrl", "asc"];
    const modifier = direction === "desc" ? -1 : 1;
    const leftValue = sortableValue(left, field);
    const rightValue = sortableValue(right, field);

    if (leftValue < rightValue) {
      return -1 * modifier;
    }

    if (leftValue > rightValue) {
      return 1 * modifier;
    }
  }

  return 0;
}

function sortableValue(property: PropertyFixture, field: string) {
  if (field === "lastSyncedAt") {
    return property.lastSyncedAt.getTime();
  }

  if (field === "id") {
    return property.id;
  }

  return property.siteUrl;
}

function toListRecord(property: PropertyFixture) {
  return {
    id: property.id,
    siteUrl: property.siteUrl,
    propertyType: property.propertyType,
    permissionLevel: property.permissionLevel,
    verified: property.verified,
    syncStatus: property.syncStatus,
    lastSyncedAt: property.lastSyncedAt,
    googleAccount: {
      email: property.googleAccount?.email ?? "missing@example.com",
    },
    website: property.website
      ? { id: property.website.id, name: property.website.name }
      : null,
  };
}

function toDetailsRecord(property: PropertyFixture) {
  return {
    id: property.id,
    organizationId: property.organizationId,
    siteUrl: property.siteUrl,
    normalizedSiteUrl: property.normalizedSiteUrl,
    propertyType: property.propertyType,
    permissionLevel: property.permissionLevel,
    verified: property.verified,
    syncStatus: property.syncStatus,
    lastSyncedAt: property.lastSyncedAt,
    lastSeenAt: property.lastSeenAt,
    removedFromGoogleAt: property.removedFromGoogleAt,
    createdAt: property.createdAt,
    updatedAt: property.updatedAt,
    googleAccount: property.googleAccount,
    website: property.website,
  };
}

beforeEach(() => {
  vi.resetModules();
  mockState.organizationId = "org-1";
  mockState.properties = [];
});

describe("Search Console property pages", () => {
  it("renders the property list", async () => {
    mockState.properties = [
      createProperty({ siteUrl: "https://alpha.example.com/" }),
      createProperty({ siteUrl: "sc-domain:example.com", propertyType: "DOMAIN" }),
    ];

    const markup = await renderPropertyList();

    expect(markup).toContain("Properties");
    expect(markup).toContain("https://alpha.example.com/");
    expect(markup).toContain("sc-domain:example.com");
    expect(markup).toContain("owner@example.com");
  });

  it("renders the property list empty state", async () => {
    const markup = await renderPropertyList();

    expect(markup).toContain("No Search Console properties yet");
  });

  it("renders the first-use property empty state guidance and action", async () => {
    const markup = await renderPropertyList();

    expect(markup).toContain(
      "Connect a Google account and sync properties to make them available in IndexPilot for review and URL inspection setup."
    );
    expect(markup).toContain("Google settings");
    expect(markup).toContain('href="/settings/google"');
    expect(markup).not.toContain("Reset filters");
  });

  it("keeps the populated property list out of the first-use empty state", async () => {
    mockState.properties = [
      createProperty({ siteUrl: "https://alpha.example.com/" }),
    ];

    const markup = await renderPropertyList();

    expect(markup).toContain("https://alpha.example.com/");
    expect(markup).not.toContain("No Search Console properties yet");
    expect(markup).not.toContain(
      "Connect a Google account and sync properties to make them available"
    );
  });

  it("keeps the filtered empty state reset route unchanged", async () => {
    mockState.properties = [
      createProperty({ siteUrl: "https://alpha.example.com/" }),
    ];

    const markup = await renderPropertyList({ q: "missing" });

    expect(markup).toContain("No properties match these filters");
    expect(markup).toContain("Reset filters");
    expect(markup).toContain('href="/search-console/properties"');
    expect(markup).toContain(
      'class="grid max-w-md justify-items-center gap-4"'
    );
    expect(markup).toContain(
      'class="text-sm leading-6 text-slate-500"'
    );
  });

  it("searches properties by URL and account email", async () => {
    mockState.properties = [
      createProperty({ siteUrl: "https://alpha.example.com/" }),
      createProperty({
        siteUrl: "https://beta.example.com/",
        googleAccount: {
          id: "account-2",
          organizationId: "org-1",
          email: "beta-owner@example.com",
          displayName: "Beta Owner",
        },
      }),
    ];

    const byUrl = await renderPropertyList({ q: "alpha" });
    const byEmail = await renderPropertyList({ q: "beta-owner" });

    expect(byUrl).toContain("https://alpha.example.com/");
    expect(byUrl).not.toContain("https://beta.example.com/");
    expect(byEmail).toContain("https://beta.example.com/");
    expect(byEmail).not.toContain("https://alpha.example.com/");
  });

  it("filters properties by sync status, property type, and link state", async () => {
    mockState.properties = [
      createProperty({ siteUrl: "https://active.example.com/" }),
      createProperty({
        siteUrl: "sc-domain:missing.example.com",
        propertyType: "DOMAIN",
        syncStatus: "MISSING",
        website: null,
        websiteId: null,
      }),
    ];

    const missing = await renderPropertyList({ syncStatus: "MISSING" });
    const domain = await renderPropertyList({ propertyType: "DOMAIN" });
    const unlinked = await renderPropertyList({ linked: "unlinked" });

    expect(missing).toContain("sc-domain:missing.example.com");
    expect(missing).not.toContain("https://active.example.com/");
    expect(domain).toContain("Domain");
    expect(unlinked).toContain("sc-domain:missing.example.com");
    expect(unlinked).not.toContain("https://active.example.com/");
  });

  it("paginates properties", async () => {
    mockState.properties = Array.from({ length: 12 }, (_, index) =>
      createProperty({
        id: `property-page-${index + 1}`,
        siteUrl: `https://site-${String(index + 1).padStart(2, "0")}.example.com/`,
        normalizedSiteUrl: `https://site-${String(index + 1).padStart(2, "0")}.example.com/`,
      })
    );

    const markup = await renderPropertyList({ pageSize: "10", page: "2" });

    expect(markup).toContain("Showing 11-12 of 12");
    expect(markup).toContain("Page 2 of 2");
    expect(markup).toContain("https://site-11.example.com/");
    expect(markup).not.toContain("https://site-01.example.com/");
  });

  it("renders the property details page", async () => {
    mockState.properties = [createProperty()];

    const markup = await renderPropertyDetails("property-1");

    expect(markup).toContain("Search Console property");
    expect(markup).toContain("https://example.com/");
    expect(markup).toContain("Normalized property URL");
    expect(markup).toContain("owner@example.com");
    expect(markup).toContain("Example");
  });

  it("returns not found for a missing property details page", async () => {
    await expect(renderPropertyDetails("missing")).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
  });

  it("renders only organization-owned properties in the list", async () => {
    mockState.properties = [
      createProperty({ siteUrl: "https://owned.example.com/" }),
      createProperty({
        organizationId: "org-2",
        siteUrl: "https://other.example.com/",
        normalizedSiteUrl: "https://other.example.com/",
      }),
    ];

    const markup = await renderPropertyList();

    expect(markup).toContain("https://owned.example.com/");
    expect(markup).not.toContain("https://other.example.com/");
  });

  it("rejects cross-organization property details access", async () => {
    mockState.properties = [
      createProperty({
        id: "property-other",
        organizationId: "org-2",
        siteUrl: "https://other.example.com/",
        normalizedSiteUrl: "https://other.example.com/",
      }),
    ];

    await expect(renderPropertyDetails("property-other")).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
  });
});
