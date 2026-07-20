import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getUrlInspectionFormPageData,
  type InspectionFormProperty,
  type InspectionFormUrlRecord,
  type InspectionFormWebsite,
  type UrlInspectionFormRepository,
} from "../lib/url-inspections/form-page";

type GoogleAccountFixture = {
  id: string;
  organizationId: string;
  email: string;
  accessToken?: string;
  refreshToken?: string;
};

const mockState = vi.hoisted(() => ({
  organizationId: "org-1",
  websites: [] as InspectionFormWebsite[],
  googleAccounts: [] as GoogleAccountFixture[],
  properties: [] as InspectionFormProperty[],
  urlRecords: [] as InspectionFormUrlRecord[],
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
    googleAccount: {
      count: async ({ where }: { where: { organizationId: string } }) =>
        mockState.googleAccounts.filter(
          (account) => account.organizationId === where.organizationId
        ).length,
    },
    searchConsoleProperty: {
      findMany: async ({ where }: { where: { organizationId: string } }) =>
        mockState.properties.filter(
          (property) =>
            property.organizationId === where.organizationId &&
            property.syncStatus === "ACTIVE" &&
            property.verified
        ),
    },
    urlRecord: {
      findFirst: async ({
        where,
      }: {
        where: { id: string; websiteId: string };
      }) =>
        mockState.urlRecords.find(
          (record) => record.id === where.id && record.websiteId === where.websiteId
        ) ?? null,
    },
  },
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

function createRepository({
  websites = [websiteFixture()],
  googleAccounts = [googleAccountFixture()],
  properties = [propertyFixture()],
  urlRecords = [] as InspectionFormUrlRecord[],
}: {
  websites?: InspectionFormWebsite[];
  googleAccounts?: GoogleAccountFixture[];
  properties?: InspectionFormProperty[];
  urlRecords?: InspectionFormUrlRecord[];
} = {}): UrlInspectionFormRepository {
  return {
    async getWebsite({ websiteId }) {
      return websites.find((website) => website.id === websiteId) ?? null;
    },
    async countGoogleAccounts({ organizationId }) {
      return googleAccounts.filter(
        (account) => account.organizationId === organizationId
      ).length;
    },
    async listSearchConsoleProperties({ organizationId }) {
      return properties.filter((property) => property.organizationId === organizationId);
    },
    async getUrlRecord({ websiteId, urlRecordId }) {
      return (
        urlRecords.find(
          (record) => record.websiteId === websiteId && record.id === urlRecordId
        ) ?? null
      );
    },
  };
}

function websiteFixture(
  input: Partial<InspectionFormWebsite> = {}
): InspectionFormWebsite {
  return {
    id: input.id ?? "website-1",
    name: input.name ?? "Example",
    domain: input.domain ?? "example.com",
    normalizedDomain: input.normalizedDomain ?? "example.com",
    status: input.status ?? "ACTIVE",
    organizationId: input.organizationId ?? "org-1",
  };
}

function googleAccountFixture(
  input: Partial<GoogleAccountFixture> = {}
): GoogleAccountFixture {
  return {
    id: input.id ?? "account-1",
    organizationId: input.organizationId ?? "org-1",
    email: input.email ?? "owner@example.com",
    accessToken: input.accessToken ?? "access-token-secret",
    refreshToken: input.refreshToken ?? "refresh-token-secret",
  };
}

function propertyFixture(
  input: Partial<InspectionFormProperty> = {}
): InspectionFormProperty {
  return {
    id: input.id ?? "property-1",
    organizationId: input.organizationId ?? "org-1",
    siteUrl: input.siteUrl ?? "https://example.com/",
    normalizedSiteUrl: input.normalizedSiteUrl ?? "https://example.com/",
    propertyType: input.propertyType ?? "URL_PREFIX",
    verified: input.verified ?? true,
    syncStatus: input.syncStatus ?? "ACTIVE",
    googleAccount: input.googleAccount ?? { email: "owner@example.com" },
  };
}

async function loadData({
  repository = createRepository(),
  urlRecordId,
}: {
  repository?: UrlInspectionFormRepository;
  urlRecordId?: string;
} = {}) {
  return getUrlInspectionFormPageData({
    websiteId: "website-1",
    urlRecordId,
    repository,
    getOrganizationContext: async () => ({
      userId: "user-1",
      organizationId: "org-1",
    }),
  });
}

async function renderInspectPage(searchParams: { urlRecordId?: string } = {}) {
  const { default: Page } = await import("../app/(app)/websites/[id]/inspect/page");
  const element = await Page({
    params: Promise.resolve({ id: "website-1" }),
    searchParams: Promise.resolve(searchParams),
  });

  return renderToStaticMarkup(element);
}

beforeEach(() => {
  vi.resetModules();
  mockState.organizationId = "org-1";
  mockState.websites = [websiteFixture()];
  mockState.googleAccounts = [googleAccountFixture()];
  mockState.properties = [propertyFixture()];
  mockState.urlRecords = [];
});

describe("URL inspection form page", () => {
  it("renders for an owned website", async () => {
    const markup = await renderInspectPage();

    expect(markup).toContain("URL Inspection");
    expect(markup).toContain("Example");
    expect(markup).toContain("example.com");
    expect(markup).toContain("Inspect URL");
  });

  it("renders inspection requirement guidance", async () => {
    const markup = await renderInspectPage();

    expect(markup).toContain("Before you inspect");
    expect(markup).toContain("URL inspections require a connected Google account");
    expect(markup).toContain("active verified Search Console property");
    expect(markup).toContain("URL that belongs to this website");
    expect(markup).toContain("matches the selected property");
  });

  it("renders field helper text for URL and property compatibility", async () => {
    const markup = await renderInspectPage();

    expect(markup).toContain(
      "Use an HTTP or HTTPS URL from this website, such as https://example.com/page."
    );
    expect(markup).toContain(
      "Inspect a URL when you want to check Google&#x27;s latest reported indexing status for that page."
    );
    expect(markup).toContain(
      'id="inspectedUrl-help" class="max-w-3xl text-sm leading-6 text-muted-foreground"'
    );
    expect(markup).toContain('name="inspectedUrl"');
    expect(markup).toContain("Inspect URL");
    expect(markup).toContain("Domain properties can cover matching hostnames");
    expect(markup).toContain(
      "URL-prefix properties only cover URLs under that prefix"
    );
    expect(markup).toContain(
      'id="searchConsolePropertyId-help" class="max-w-3xl text-sm leading-6 text-muted-foreground"'
    );
  });

  it("keeps existing form actions available with the guidance", async () => {
    const markup = await renderInspectPage();

    expect(markup).toContain("Back to website");
    expect(markup).toContain("Back to URL inventory");
    expect(markup).toContain("URL");
    expect(markup).toContain("Search Console property");
    expect(markup).toContain("Inspect URL");
  });

  it("stacks header actions cleanly on mobile", async () => {
    const markup = await renderInspectPage();

    expect(markup).toContain('class="grid gap-2 sm:flex sm:flex-wrap"');
    expect(markup).toContain("w-full sm:w-auto");
  });

  it("does not make unsupported indexing guarantees", async () => {
    const markup = (await renderInspectPage()).toLowerCase();

    expect(markup).not.toContain("guarantee");
    expect(markup).not.toContain("force google");
    expect(markup).not.toContain("control google search results");
    expect(markup).not.toContain("replace google search console");
    expect(markup).not.toContain("google indexing api");
  });

  it("shows compatible properties", async () => {
    const markup = await renderInspectPage();

    expect(markup).toContain("https://example.com/");
    expect(markup).toContain("owner@example.com");
  });

  it("excludes inactive properties", async () => {
    const data = await loadData({
      repository: createRepository({
        properties: [
          propertyFixture({ id: "active", siteUrl: "https://example.com/" }),
          propertyFixture({
            id: "missing",
            siteUrl: "sc-domain:example.com",
            propertyType: "DOMAIN",
            syncStatus: "MISSING",
          }),
        ],
      }),
    });

    expect(data.ok && data.compatibleProperties.map((property) => property.id)).toEqual([
      "active",
    ]);
  });

  it("excludes unverified properties", async () => {
    const data = await loadData({
      repository: createRepository({
        properties: [
          propertyFixture({ id: "verified", siteUrl: "https://example.com/" }),
          propertyFixture({
            id: "unverified",
            siteUrl: "sc-domain:example.com",
            propertyType: "DOMAIN",
            verified: false,
          }),
        ],
      }),
    });

    expect(data.ok && data.compatibleProperties.map((property) => property.id)).toEqual([
      "verified",
    ]);
  });

  it("excludes cross-organization properties", async () => {
    const data = await loadData({
      repository: createRepository({
        properties: [
          propertyFixture({ id: "owned", siteUrl: "https://example.com/" }),
          propertyFixture({
            id: "other",
            organizationId: "org-2",
            siteUrl: "sc-domain:example.com",
            propertyType: "DOMAIN",
          }),
        ],
      }),
    });

    expect(data.ok && data.compatibleProperties.map((property) => property.id)).toEqual([
      "owned",
    ]);
  });

  it("selects one compatible property by default", async () => {
    const data = await loadData();

    expect(data.ok && data.defaultPropertyId).toBe("property-1");
  });

  it("requires selection when multiple compatible properties exist", async () => {
    const data = await loadData({
      repository: createRepository({
        properties: [
          propertyFixture({ id: "property-1", siteUrl: "https://example.com/" }),
          propertyFixture({
            id: "property-2",
            siteUrl: "sc-domain:example.com",
            propertyType: "DOMAIN",
          }),
        ],
      }),
    });

    expect(data.ok && data.compatibleProperties).toHaveLength(2);
    expect(data.ok && data.defaultPropertyId).toBe("");
  });

  it("prefills URL from a valid urlRecordId", async () => {
    const data = await loadData({
      repository: createRepository({
        urlRecords: [
          {
            id: "url-1",
            websiteId: "website-1",
            url: "https://example.com/prefilled",
          },
        ],
      }),
      urlRecordId: "url-1",
    });

    expect(data.ok && data.prefillUrl).toBe("https://example.com/prefilled");
    expect(data.ok && data.invalidUrlRecordId).toBe(false);
  });

  it("renders a valid urlRecordId prefill safely", async () => {
    mockState.urlRecords = [
      {
        id: "url-1",
        websiteId: "website-1",
        url: "https://example.com/prefilled",
      },
    ];

    const markup = await renderInspectPage({ urlRecordId: "url-1" });

    expect(markup).toContain("https://example.com/prefilled");
  });

  it("ignores an invalid urlRecordId", async () => {
    const data = await loadData({ urlRecordId: "missing" });

    expect(data.ok && data.prefillUrl).toBe("");
    expect(data.ok && data.invalidUrlRecordId).toBe(true);
  });

  it("rejects a cross-website urlRecordId", async () => {
    const data = await loadData({
      repository: createRepository({
        urlRecords: [
          {
            id: "url-1",
            websiteId: "website-2",
            url: "https://other.example.com/secret",
          },
        ],
      }),
      urlRecordId: "url-1",
    });

    expect(data.ok && data.prefillUrl).toBe("");
    expect(JSON.stringify(data)).not.toContain("secret");
  });

  it("renders archived website state", async () => {
    mockState.websites = [websiteFixture({ status: "ARCHIVED" })];
    const markup = await renderInspectPage();

    expect(markup).toContain("This website is archived");
    expect(markup).toContain("inspections cannot be submitted");
  });

  it("renders no-compatible-property state", async () => {
    mockState.properties = [
      propertyFixture({ siteUrl: "https://other.example.net/" }),
    ];
    const markup = await renderInspectPage();

    expect(markup).toContain("No compatible Search Console properties");
    expect(markup).toContain("/search-console/properties");
    expect(markup).toContain("/settings/google");
  });

  it("rejects unauthorized websites", async () => {
    const data = await loadData({
      repository: createRepository({
        websites: [websiteFixture({ organizationId: "org-2" })],
      }),
    });

    expect(data).toEqual({ ok: false, reason: "UNAUTHORIZED" });
  });

  it("does not render sensitive OAuth tokens", async () => {
    const markup = await renderInspectPage();

    expect(markup).not.toContain("access-token-secret");
    expect(markup).not.toContain("refresh-token-secret");
  });
});
