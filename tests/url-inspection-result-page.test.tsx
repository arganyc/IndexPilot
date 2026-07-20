import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  UrlInspectionDetailsRecord,
  UrlInspectionDetailsWebsite,
} from "../lib/url-inspections/details-page";

type InspectionFixture = UrlInspectionDetailsRecord & {
  id: string;
  organizationId: string;
  websiteId: string;
  searchConsolePropertyId?: string;
  rawResponse?: unknown;
  searchConsoleProperty?: {
    id: string;
    siteUrl: string;
    googleAccount?: {
      accessToken?: string;
      refreshToken?: string;
    };
  };
};

type InspectionFindFirstArgs = {
  where: {
    id?: string;
    websiteId?: string;
    organizationId?: string;
    status?: string;
    OR?: unknown[];
  };
  select: Record<string, unknown>;
};

const mockState = vi.hoisted(() => ({
  authFails: false,
  organizationId: "org-1",
  websites: [] as UrlInspectionDetailsWebsite[],
  inspections: [] as InspectionFixture[],
  lastInspectionFindFirstArgs: null as InspectionFindFirstArgs | null,
  inspectionFindFirstCount: 0,
  lastFirstCompletedFindFirstArgs: null as InspectionFindFirstArgs | null,
  firstCompletedFindFirstCount: 0,
  earlierCompletedInspectionExists: true,
  firstCompletedLookupFails: false,
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
      findFirst: async (args: InspectionFindFirstArgs) => {
        if (args.where.status === "COMPLETED" && args.where.OR) {
          mockState.firstCompletedFindFirstCount += 1;
          mockState.lastFirstCompletedFindFirstArgs = args;

          if (mockState.firstCompletedLookupFails) {
            throw new Error("first completed inspection lookup failed");
          }

          return mockState.earlierCompletedInspectionExists
            ? { id: "inspection-0" }
            : null;
        }

        mockState.inspectionFindFirstCount += 1;
        mockState.lastInspectionFindFirstArgs = args;
        const inspection = mockState.inspections.find(
          (item) =>
            item.id === args.where.id &&
            item.websiteId === args.where.websiteId &&
            item.organizationId === args.where.organizationId
        );

        return inspection ? toSelectedInspection(inspection) : null;
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

function websiteFixture(
  input: Partial<UrlInspectionDetailsWebsite> = {}
): UrlInspectionDetailsWebsite {
  return {
    id: input.id ?? "website-1",
    organizationId: input.organizationId ?? "org-1",
  };
}

function fixtureValue<T, K extends keyof T>(
  input: Partial<T>,
  key: K,
  fallback: T[K]
): T[K] {
  return Object.prototype.hasOwnProperty.call(input, key)
    ? (input[key] as T[K])
    : fallback;
}

function inspectionFixture(
  input: Partial<InspectionFixture> = {}
): InspectionFixture {
  return {
    id: fixtureValue(input, "id", "inspection-1"),
    organizationId: fixtureValue(input, "organizationId", "org-1"),
    websiteId: fixtureValue(input, "websiteId", "website-1"),
    inspectedUrl: fixtureValue(input, "inspectedUrl", "https://example.com/page"),
    status: fixtureValue(input, "status", "COMPLETED"),
    verdict: fixtureValue(input, "verdict", "PASS"),
    coverageState: fixtureValue(
      input,
      "coverageState",
      "Submitted and indexed"
    ),
    indexingState: fixtureValue(input, "indexingState", "INDEXING_ALLOWED"),
    robotsTxtState: fixtureValue(input, "robotsTxtState", "ALLOWED"),
    lastCrawlTime: fixtureValue(
      input,
      "lastCrawlTime",
      new Date("2026-07-17T18:30:00.000Z")
    ),
    createdAt: fixtureValue(
      input,
      "createdAt",
      new Date("2026-07-18T12:00:00.000Z")
    ),
    updatedAt: fixtureValue(
      input,
      "updatedAt",
      new Date("2026-07-18T12:01:00.000Z")
    ),
    completedAt: fixtureValue(
      input,
      "completedAt",
      new Date("2026-07-18T12:01:00.000Z")
    ),
    userCanonical: fixtureValue(
      input,
      "userCanonical",
      "https://example.com/user-canonical"
    ),
    googleCanonical: fixtureValue(
      input,
      "googleCanonical",
      "https://example.com/google-canonical"
    ),
    pageFetchState: fixtureValue(input, "pageFetchState", "SUCCESSFUL"),
    crawledAs: fixtureValue(input, "crawledAs", "MOBILE"),
    searchConsolePropertyId: fixtureValue(
      input,
      "searchConsolePropertyId",
      "property-1"
    ),
    searchConsoleProperty: fixtureValue(input, "searchConsoleProperty", {
      id: "property-1",
      siteUrl: "https://example.com/",
      googleAccount: {
        accessToken: "access-token-secret",
        refreshToken: "refresh-token-secret",
      },
    }),
    rawResponse: fixtureValue(input, "rawResponse", {
      secretRawGooglePayload: true,
    }),
  };
}

function toSelectedInspection(
  inspection: InspectionFixture
): UrlInspectionDetailsRecord {
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

async function renderDetailsPage({
  websiteId = "website-1",
  inspectionId = "inspection-1",
}: {
  websiteId?: string;
  inspectionId?: string;
} = {}) {
  const { default: Page } = await import(
    "../app/(app)/websites/[id]/inspections/[inspectionId]/page"
  );
  const element = await Page({
    params: Promise.resolve({ id: websiteId, inspectionId }),
  });

  return renderToStaticMarkup(element);
}

function getBackLinkHref(markup: string) {
  return (
    markup.match(
      /<a[^>]*href="([^"]*)"[^>]*>Back to inspection history<\/a>/
    )?.[1] ?? null
  );
}

function getLinkHref(markup: string, text: string) {
  return markup.match(new RegExp(`<a[^>]*href="([^"]*)"[^>]*>${text}</a>`))
    ?.[1] ?? null;
}

function getReinspectButtonMarkup(markup: string) {
  return markup.match(/<button[^>]*>Reinspect URL<\/button>/)?.[0] ?? null;
}

function getReinspectFormMarkup(markup: string) {
  return (
    markup.match(/<form[^>]*>\s*<button[^>]*>Reinspect URL<\/button>\s*<\/form>/)
      ?.[0] ?? null
  );
}

beforeEach(() => {
  vi.resetModules();
  mockState.authFails = false;
  mockState.organizationId = "org-1";
  mockState.lastInspectionFindFirstArgs = null;
  mockState.inspectionFindFirstCount = 0;
  mockState.lastFirstCompletedFindFirstArgs = null;
  mockState.firstCompletedFindFirstCount = 0;
  mockState.earlierCompletedInspectionExists = true;
  mockState.firstCompletedLookupFails = false;
  mockState.websites = [websiteFixture()];
  mockState.inspections = [inspectionFixture()];
});

describe("URL inspection details route access", () => {
  it("requires authentication", async () => {
    mockState.authFails = true;

    await expect(renderDetailsPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("returns not found for the wrong organization", async () => {
    mockState.inspections = [inspectionFixture({ organizationId: "org-2" })];

    await expect(renderDetailsPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("returns not found for the wrong website", async () => {
    mockState.inspections = [inspectionFixture({ websiteId: "website-2" })];

    await expect(renderDetailsPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("returns not found for a missing inspection", async () => {
    mockState.inspections = [];

    await expect(renderDetailsPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("loads a valid inspection and reaches the page", async () => {
    const markup = await renderDetailsPage();

    expect(markup).toContain("Inspection Details");
    expect(mockState.lastInspectionFindFirstArgs?.where.id).toBe("inspection-1");
  });

  it("renders the inspected URL", async () => {
    mockState.inspections = [
      inspectionFixture({ inspectedUrl: "https://example.com/contact" }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("https://example.com/contact");
  });

  it("renders the Inspection Details heading", async () => {
    const markup = await renderDetailsPage();

    expect(markup).toContain("Inspection Details");
  });

  it("renders the inspection status", async () => {
    mockState.inspections = [inspectionFixture({ status: "FAILED" })];

    const markup = await renderDetailsPage();

    expect(markup).toContain("FAILED");
  });

  it("renders the inspection creation date", async () => {
    mockState.inspections = [
      inspectionFixture({ createdAt: new Date("2026-07-18T12:00:00.000Z") }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Created");
    expect(markup).toContain("Jul 18, 2026");
  });

  it("renders the back to inspection history link", async () => {
    const markup = await renderDetailsPage();

    expect(markup).toContain("Back to inspection history");
  });

  it("points the back link to inspection history for the website", async () => {
    const markup = await renderDetailsPage({ websiteId: "website-1" });

    expect(getBackLinkHref(markup)).toBe("/websites/website-1/inspections");
  });

  it("renders the completed inspection success section", async () => {
    const markup = await renderDetailsPage();

    expect(markup).toContain("Inspection complete");
    expect(markup).toContain("Google inspection completed successfully.");
    expect(markup).toContain("Review the result below and decide what to do next.");
  });

  it("shows first-use copy for the first completed inspection", async () => {
    mockState.earlierCompletedInspectionExists = false;

    const markup = await renderDetailsPage();

    expect(markup).toContain("First inspection complete");
    expect(markup).toContain("You completed your first Google URL inspection.");
    expect(markup).toContain(
      "IndexPilot is now ready to help you monitor and understand this website&#x27;s indexing status."
    );
  });

  it("shows normal completion copy for later completed inspections", async () => {
    mockState.earlierCompletedInspectionExists = true;

    const markup = await renderDetailsPage();

    expect(markup).toContain("Inspection complete");
    expect(markup).toContain("Google inspection completed successfully.");
    expect(markup).toContain("Review the result below and decide what to do next.");
  });

  it("never shows first-use and normal headings together", async () => {
    mockState.earlierCompletedInspectionExists = false;

    const firstUseMarkup = await renderDetailsPage();

    expect(firstUseMarkup).toContain(
      "You completed your first Google URL inspection."
    );
    expect(firstUseMarkup).not.toContain(
      "Google inspection completed successfully."
    );

    mockState.earlierCompletedInspectionExists = true;
    const normalMarkup = await renderDetailsPage();

    expect(normalMarkup).toContain("Google inspection completed successfully.");
    expect(normalMarkup).not.toContain(
      "You completed your first Google URL inspection."
    );
  });

  it("shows the inspected URL indexing status prominently", async () => {
    const markup = await renderDetailsPage();

    expect(markup).toContain("URL indexing status");
    expect(markup).toContain(">Indexed</h4>");
    expect(markup).toContain(
      "Google currently reports that this page is indexed."
    );
    expect(markup).toContain("Submitted and indexed");
  });

  it("explains indexed status without promising search visibility", async () => {
    mockState.inspections = [
      inspectionFixture({ coverageState: "Submitted and indexed" }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain(
      "Google currently reports that this page is indexed."
    );
    expect(markup).not.toContain("guaranteed");
    expect(markup).not.toContain("guarantee");
  });

  it("renders the indexed inspection timestamp when available", async () => {
    mockState.inspections = [
      inspectionFixture({
        coverageState: "Submitted and indexed",
        completedAt: new Date("2026-07-18T12:01:00.000Z"),
      }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Last inspected");
    expect(markup).toContain("Jul 18, 2026");
  });

  it("renders the indexed inspection timestamp placeholder when unavailable", async () => {
    mockState.inspections = [
      inspectionFixture({
        coverageState: "Submitted and indexed",
        completedAt: null,
      }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain(">Indexed</h4>");
    expect(markup).toContain(
      "Google currently reports that this page is indexed."
    );
    expect(markup).toContain("Last inspected");
    expect(markup).toContain("Not available");
  });

  it("keeps indexed and not-indexed status summaries distinct", async () => {
    mockState.inspections = [
      inspectionFixture({ coverageState: "Crawled - currently not indexed" }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain(">Not Indexed</h4>");
    expect(markup).not.toContain(">Indexed</h4>");
    expect(markup).toContain("Crawled - currently not indexed");
  });

  it("explains not-indexed status as a Google result, not an app error", async () => {
    mockState.inspections = [
      inspectionFixture({ coverageState: "Crawled - currently not indexed" }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain(
      "Google currently reports that this page is not indexed."
    );
    expect(markup).not.toContain("application error");
  });

  it("renders the Not Indexed heading", async () => {
    mockState.inspections = [
      inspectionFixture({ coverageState: "Crawled - currently not indexed" }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain(">Not Indexed</h4>");
  });

  it("renders the not-indexed inspection timestamp when available", async () => {
    mockState.inspections = [
      inspectionFixture({
        coverageState: "Crawled - currently not indexed",
        completedAt: new Date("2026-07-18T12:01:00.000Z"),
      }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Last inspected");
    expect(markup).toContain("Jul 18, 2026");
  });

  it("renders the not-indexed inspection timestamp placeholder when unavailable", async () => {
    mockState.inspections = [
      inspectionFixture({
        coverageState: "Crawled - currently not indexed",
        completedAt: null,
      }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain(">Not Indexed</h4>");
    expect(markup).toContain(
      "Google currently reports that this page is not indexed."
    );
    expect(markup).toContain("Last inspected");
    expect(markup).toContain("Not available");
  });

  it("shows what to check next only for not-indexed status", async () => {
    mockState.inspections = [
      inspectionFixture({ coverageState: "Crawled - currently not indexed" }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("What to check next");
    expect(markup).toContain("Review Google&#x27;s inspection details.");
    expect(markup).toContain("Make any necessary improvements to the page.");
    expect(markup).toContain(
      "Inspect this URL again after meaningful changes."
    );
  });

  it("does not show what to check next for indexed status", async () => {
    mockState.inspections = [
      inspectionFixture({ coverageState: "Submitted and indexed" }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain(">Indexed</h4>");
    expect(markup).not.toContain("What to check next");
  });

  it("handles unknown indexing status safely", async () => {
    mockState.inspections = [inspectionFixture({ coverageState: null })];

    const markup = await renderDetailsPage();

    expect(markup).toContain(">Unknown</h4>");
    expect(markup).toContain(
      "Google did not return a clear indexing status for this page."
    );
  });

  it("explains unknown indexing status when coverage is unavailable", async () => {
    mockState.inspections = [inspectionFixture({ coverageState: null })];

    const markup = await renderDetailsPage();

    expect(markup).toContain(
      "This result does not confirm whether the page is indexed."
    );
  });

  it("renders the unknown inspection timestamp when available", async () => {
    mockState.inspections = [
      inspectionFixture({
        coverageState: null,
        completedAt: new Date("2026-07-18T12:01:00.000Z"),
      }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Last inspected");
    expect(markup).toContain("Jul 18, 2026");
  });

  it("renders the unknown inspection timestamp placeholder when unavailable", async () => {
    mockState.inspections = [
      inspectionFixture({
        coverageState: null,
        completedAt: null,
      }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain(">Unknown</h4>");
    expect(markup).toContain("Last inspected");
    expect(markup).toContain("Not available");
    expect(markup).not.toContain("Invalid Date");
    expect(markup).not.toContain(">N/A<");
  });

  it("does not show what to check next for unknown status", async () => {
    mockState.inspections = [inspectionFixture({ coverageState: null })];

    const markup = await renderDetailsPage();

    expect(markup).toContain(">Unknown</h4>");
    expect(markup).not.toContain("What to check next");
  });

  it("uses the unknown explanation for unexpected coverage states", async () => {
    mockState.inspections = [
      inspectionFixture({ coverageState: "Submitted to Google" }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain(">Unknown</h4>");
    expect(markup).toContain("Submitted to Google");
    expect(markup).toContain(
      "Google did not return a clear indexing status for this page."
    );
  });

  it("keeps indexing status visible for first-use copy", async () => {
    mockState.earlierCompletedInspectionExists = false;

    const markup = await renderDetailsPage();

    expect(markup).toContain("First inspection complete");
    expect(markup).toContain("URL indexing status");
    expect(markup).toContain(">Indexed</h4>");
  });

  it("does not claim the URL is indexed in first-use messaging", async () => {
    mockState.earlierCompletedInspectionExists = false;
    mockState.inspections = [
      inspectionFixture({ coverageState: "Crawled - currently not indexed" }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("You completed your first Google URL inspection.");
    expect(markup).toContain(">Not Indexed</h4>");
    expect(markup).not.toContain("Your URL is indexed");
  });

  it("falls back to normal copy when first-inspection status is unavailable", async () => {
    mockState.firstCompletedLookupFails = true;

    const markup = await renderDetailsPage();

    expect(markup).toContain("Inspection complete");
    expect(markup).toContain("Google inspection completed successfully.");
    expect(markup).not.toContain(
      "You completed your first Google URL inspection."
    );
  });

  it("links success actions to existing inspection routes", async () => {
    const markup = await renderDetailsPage({ websiteId: "website-1" });

    expect(getLinkHref(markup, "Inspect another URL")).toBe(
      "/websites/website-1/inspect"
    );
    expect(getLinkHref(markup, "View inspection history")).toBe(
      "/websites/website-1/inspections"
    );
  });

  it("keeps existing inspection details visible with the success section", async () => {
    const markup = await renderDetailsPage();

    expect(markup).toContain("Coverage");
    expect(markup).toContain("Indexing verdict");
    expect(markup).toContain("Indexing state");
    expect(markup).toContain("Crawl Information");
  });

  it("does not show successful completion messaging for failed inspections", async () => {
    mockState.inspections = [inspectionFixture({ status: "FAILED" })];

    const markup = await renderDetailsPage();

    expect(markup).not.toContain("Inspection complete");
    expect(markup).not.toContain("Google inspection completed successfully.");
    expect(markup).not.toContain(
      "Google currently reports that this URL is indexed."
    );
  });

  it("renders the inspection unavailable heading for failed inspections", async () => {
    mockState.inspections = [inspectionFixture({ status: "FAILED" })];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Inspection unavailable");
  });

  it("renders the inspection unavailable helper text", async () => {
    mockState.inspections = [inspectionFixture({ status: "FAILED" })];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Google could not complete this inspection.");
  });

  it("renders the inspection unavailable next-step text", async () => {
    mockState.inspections = [inspectionFixture({ status: "FAILED" })];

    const markup = await renderDetailsPage();

    expect(markup).toContain(
      "Try again later. If the issue continues, confirm that your Google connection and Search Console property are still available."
    );
  });

  it("keeps the existing reinspection action available for failed inspections", async () => {
    mockState.inspections = [inspectionFixture({ status: "FAILED" })];

    const markup = await renderDetailsPage();
    const button = getReinspectButtonMarkup(markup);

    expect(getReinspectFormMarkup(markup)).not.toBeNull();
    expect(button).toContain("Reinspect URL");
    expect(button).toContain('type="submit"');
  });

  it("does not use raw internal error text as the failed inspection message", async () => {
    mockState.inspections = [
      inspectionFixture({
        status: "FAILED",
        rawResponse: {
          error: "RAW_GOOGLE_PROVIDER_PAYLOAD",
          stack: "INTERNAL_STACK_TRACE",
        },
      }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Inspection unavailable");
    expect(markup).not.toContain("RAW_GOOGLE_PROVIDER_PAYLOAD");
    expect(markup).not.toContain("INTERNAL_STACK_TRACE");
  });

  it("keeps existing inspection details visible for failed inspections", async () => {
    mockState.inspections = [inspectionFixture({ status: "FAILED" })];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Coverage");
    expect(markup).toContain("Indexing verdict");
    expect(markup).toContain("Crawl Information");
  });

  it("uses safe wrapping for long inspected URLs", async () => {
    const longUrl =
      "https://example.com/a-very-long-path-segment-that-needs-to-wrap-safely-without-overflowing-the-page";
    mockState.inspections = [inspectionFixture({ inspectedUrl: longUrl })];

    const markup = await renderDetailsPage();

    expect(markup).toContain(longUrl);
    expect(markup).toContain("break-all");
  });

  it("stacks detail page actions cleanly on mobile", async () => {
    const markup = await renderDetailsPage();

    expect(markup).toContain('class="grid gap-2 sm:flex sm:flex-wrap"');
    expect(markup).toContain('<form class="w-full sm:w-auto"');
    expect(markup).toContain("w-full sm:w-auto");
  });

  it("removes the placeholder-only output", async () => {
    const markup = await renderDetailsPage();

    expect(markup).toContain("URL Inspection");
    expect(markup).toContain("Created");
    expect(markup).toContain("Back to inspection history");
  });

  it("groups indexing signal fields under one section", async () => {
    const markup = await renderDetailsPage();

    expect(markup).toContain("Indexing Signals");
    expect(markup).toContain("Coverage status");
    expect(markup).toContain("Indexing verdict");
    expect(markup).toContain("Indexing state");
    expect(markup).toContain("Robots.txt status");
  });

  it("renders the Indexing verdict label", async () => {
    const markup = await renderDetailsPage();

    expect(markup).toContain("Indexing verdict");
  });

  it("renders the existing verdict value", async () => {
    mockState.inspections = [inspectionFixture({ verdict: "PASS" })];

    const markup = await renderDetailsPage();

    expect(markup).toContain("PASS");
  });

  it("renders Not available for a missing verdict value", async () => {
    mockState.inspections = [inspectionFixture({ verdict: null })];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Not available");
  });

  it("keeps the Indexing Verdict section visible when verdict is missing", async () => {
    mockState.inspections = [inspectionFixture({ verdict: "" })];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Indexing verdict");
    expect(markup).toContain("Not available");
  });

  it("uses safe wrapping for long verdict values", async () => {
    const verdict =
      "A_VERY_LONG_VERDICT_VALUE_THAT_SHOULD_WRAP_SAFELY_WITHOUT_CHANGING_THE_STORED_VALUE";
    mockState.inspections = [inspectionFixture({ verdict })];

    const markup = await renderDetailsPage();

    expect(markup).toContain(verdict);
    expect(markup).toContain("break-words");
  });

  it("renders the Coverage status label", async () => {
    const markup = await renderDetailsPage();

    expect(markup).toContain("Coverage status");
  });

  it("renders the existing coverage value", async () => {
    mockState.inspections = [
      inspectionFixture({ coverageState: "Submitted and indexed" }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Submitted and indexed");
  });

  it("renders Not available for a missing coverage value", async () => {
    mockState.inspections = [inspectionFixture({ coverageState: null })];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Not available");
  });

  it("keeps the Coverage section visible when coverage is missing", async () => {
    mockState.inspections = [inspectionFixture({ coverageState: "" })];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Coverage status");
    expect(markup).toContain("Not available");
  });

  it("uses safe wrapping for long coverage values", async () => {
    const coverage =
      "A very long coverage-state value returned by Google that should wrap safely on narrow screens without changing the stored value";
    mockState.inspections = [inspectionFixture({ coverageState: coverage })];

    const markup = await renderDetailsPage();

    expect(markup).toContain(coverage);
    expect(markup).toContain("break-words");
  });

  it("keeps the Coverage section unchanged", async () => {
    const markup = await renderDetailsPage();

    expect(markup).toContain("Coverage status");
    expect(markup).toContain("Submitted and indexed");
  });

  it("renders the Indexing state label", async () => {
    const markup = await renderDetailsPage();

    expect(markup).toContain("Indexing state");
  });

  it("renders the existing indexing-state value", async () => {
    mockState.inspections = [
      inspectionFixture({ indexingState: "INDEXING_ALLOWED" }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("INDEXING_ALLOWED");
  });

  it("renders Not available for a missing indexing-state value", async () => {
    mockState.inspections = [inspectionFixture({ indexingState: null })];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Not available");
  });

  it("keeps the Indexing State section visible when indexing-state is missing", async () => {
    mockState.inspections = [inspectionFixture({ indexingState: "" })];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Indexing state");
    expect(markup).toContain("Not available");
  });

  it("uses safe wrapping for long indexing-state values", async () => {
    const indexingState =
      "A_VERY_LONG_INDEXING_STATE_VALUE_THAT_SHOULD_WRAP_SAFELY_WITHOUT_CHANGING_THE_STORED_VALUE";
    mockState.inspections = [inspectionFixture({ indexingState })];

    const markup = await renderDetailsPage();

    expect(markup).toContain(indexingState);
    expect(markup).toContain("break-words");
  });

  it("keeps the Indexing Verdict section unchanged", async () => {
    const markup = await renderDetailsPage();

    expect(markup).toContain("Indexing verdict");
    expect(markup).toContain("PASS");
  });

  it("renders the Robots.txt status label", async () => {
    const markup = await renderDetailsPage();

    expect(markup).toContain("Robots.txt status");
  });

  it("renders the existing robots-state value", async () => {
    mockState.inspections = [
      inspectionFixture({ robotsTxtState: "ROBOTS_ALLOWED" }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("ROBOTS_ALLOWED");
  });

  it("renders Not available for a missing robots-state value", async () => {
    mockState.inspections = [inspectionFixture({ robotsTxtState: null })];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Not available");
  });

  it("keeps the Robots State section visible when robots-state is missing", async () => {
    mockState.inspections = [inspectionFixture({ robotsTxtState: "" })];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Robots.txt status");
    expect(markup).toContain("Not available");
  });

  it("uses safe wrapping for long robots-state values", async () => {
    const robotsTxtState =
      "A_VERY_LONG_ROBOTS_STATE_VALUE_THAT_SHOULD_WRAP_SAFELY_WITHOUT_CHANGING_THE_STORED_VALUE";
    mockState.inspections = [inspectionFixture({ robotsTxtState })];

    const markup = await renderDetailsPage();

    expect(markup).toContain(robotsTxtState);
    expect(markup).toContain("break-words");
  });

  it("keeps the existing detail sections unchanged", async () => {
    const markup = await renderDetailsPage();

    expect(markup).toContain("Coverage status");
    expect(markup).toContain("Submitted and indexed");
    expect(markup).toContain("Indexing verdict");
    expect(markup).toContain("PASS");
    expect(markup).toContain("Indexing state");
    expect(markup).toContain("INDEXING_ALLOWED");
    expect(markup).toContain("Robots.txt status");
    expect(markup).toContain("ALLOWED");
  });

  it("uses consistent placeholders for unavailable inspection values", async () => {
    mockState.inspections = [
      inspectionFixture({
        coverageState: "null",
        indexingState: "undefined",
        robotsTxtState: "Invalid Date",
        completedAt: null,
        updatedAt: new Date("invalid-date"),
      }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Not available");
    expect(markup).toContain("Last inspected");
    expect(markup).not.toContain(">null<");
    expect(markup).not.toContain(">undefined<");
    expect(markup).not.toContain("Invalid Date");
  });

  it("renders the Crawl Information heading", async () => {
    const markup = await renderDetailsPage();

    expect(markup).toContain("Crawl Information");
  });

  it("renders existing crawl-related values", async () => {
    mockState.inspections = [
      inspectionFixture({ pageFetchState: "FETCH_SUCCESS", crawledAs: "MOBILE" }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("FETCH_SUCCESS");
    expect(markup).toContain("MOBILE");
  });

  it("renders labels for the existing crawl fields", async () => {
    const markup = await renderDetailsPage();

    expect(markup).toContain("Page fetch status");
    expect(markup).toContain("Crawled as");
  });

  it("renders Not available for a missing crawl value", async () => {
    mockState.inspections = [
      inspectionFixture({ pageFetchState: null, crawledAs: "MOBILE" }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Not available");
    expect(markup).toContain("MOBILE");
  });

  it("keeps the Crawl Information section visible when values are missing", async () => {
    mockState.inspections = [
      inspectionFixture({ pageFetchState: "", crawledAs: null }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Crawl Information");
    expect(markup).toContain("Not available");
  });

  it("renders Not available when no crawl values are available", async () => {
    mockState.inspections = [
      inspectionFixture({ pageFetchState: null, crawledAs: "" }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Crawl Information");
    expect(markup).toContain("Not available");
  });

  it("uses safe wrapping for long crawl values", async () => {
    const pageFetchState =
      "A_VERY_LONG_PAGE_FETCH_STATE_VALUE_THAT_SHOULD_WRAP_SAFELY_WITHOUT_CHANGING_THE_STORED_VALUE";
    mockState.inspections = [inspectionFixture({ pageFetchState })];

    const markup = await renderDetailsPage();

    expect(markup).toContain(pageFetchState);
    expect(markup).toContain("break-words");
  });

  it("renders the Canonical Information heading", async () => {
    const markup = await renderDetailsPage();

    expect(markup).toContain("Canonical Information");
  });

  it("renders the User-declared canonical URL label", async () => {
    const markup = await renderDetailsPage();

    expect(markup).toContain("User-declared canonical URL");
  });

  it("renders the Google-selected canonical URL label", async () => {
    const markup = await renderDetailsPage();

    expect(markup).toContain("Google-selected canonical URL");
  });

  it("renders the existing user canonical URL", async () => {
    mockState.inspections = [
      inspectionFixture({
        userCanonical: "https://example.com/user-selected-canonical",
      }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("https://example.com/user-selected-canonical");
  });

  it("renders the existing Google canonical URL", async () => {
    mockState.inspections = [
      inspectionFixture({
        googleCanonical: "https://example.com/google-selected-canonical",
      }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("https://example.com/google-selected-canonical");
  });

  it("renders Not available for a missing user canonical URL", async () => {
    mockState.inspections = [inspectionFixture({ userCanonical: null })];

    const markup = await renderDetailsPage();

    expect(markup).toContain("User-declared canonical URL");
    expect(markup).toContain("Not available");
  });

  it("renders Not available for a missing Google canonical URL", async () => {
    mockState.inspections = [inspectionFixture({ googleCanonical: "" })];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Google-selected canonical URL");
    expect(markup).toContain("Not available");
  });

  it("keeps both canonical rows visible when values are missing", async () => {
    mockState.inspections = [
      inspectionFixture({ userCanonical: null, googleCanonical: "" }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("User-declared canonical URL");
    expect(markup).toContain("Google-selected canonical URL");
    expect(markup).toContain("Not available");
  });

  it("uses safe wrapping for long canonical URLs", async () => {
    const userCanonical =
      "https://example.com/a/very/long/user-declared-canonical-url/that/should/wrap/safely/inside/the/card";
    mockState.inspections = [inspectionFixture({ userCanonical })];

    const markup = await renderDetailsPage();

    expect(markup).toContain(userCanonical);
    expect(markup).toContain("break-words");
  });

  it("renders the Last Crawl heading", async () => {
    const markup = await renderDetailsPage();

    expect(markup).toContain("Last Crawl");
  });

  it("renders the Last crawled label", async () => {
    const markup = await renderDetailsPage();

    expect(markup).toContain("Last crawled");
  });

  it("renders the existing last-crawl timestamp", async () => {
    mockState.inspections = [
      inspectionFixture({
        lastCrawlTime: new Date("2026-07-17T18:30:00.000Z"),
      }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Jul 17, 2026");
  });

  it("uses the existing readable date format for last crawl", async () => {
    mockState.inspections = [
      inspectionFixture({
        lastCrawlTime: new Date("2026-07-17T18:30:00.000Z"),
      }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Jul 17, 2026");
    expect(markup).toContain("2:30 PM");
  });

  it("renders Not available for a missing last-crawl timestamp", async () => {
    mockState.inspections = [inspectionFixture({ lastCrawlTime: null })];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Last Crawl");
    expect(markup).toContain("Not available");
  });

  it("renders Not available for an invalid last-crawl timestamp", async () => {
    mockState.inspections = [
      inspectionFixture({ lastCrawlTime: new Date("invalid-date") }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Last Crawl");
    expect(markup).toContain("Not available");
  });

  it("keeps the Last Crawl section visible when the timestamp is missing", async () => {
    mockState.inspections = [inspectionFixture({ lastCrawlTime: null })];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Last Crawl");
    expect(markup).toContain("Last crawled");
  });

  it("renders the Inspection Timestamps heading", async () => {
    const markup = await renderDetailsPage();

    expect(markup).toContain("Inspection Timestamps");
  });

  it("renders the existing Created timestamp", async () => {
    mockState.inspections = [
      inspectionFixture({ createdAt: new Date("2026-07-18T12:00:00.000Z") }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Created");
    expect(markup).toContain("Jul 18, 2026");
  });

  it("renders the existing Updated timestamp when available", async () => {
    mockState.inspections = [
      inspectionFixture({ updatedAt: new Date("2026-07-18T12:05:00.000Z") }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Updated");
    expect(markup).toContain("Jul 18, 2026");
    expect(markup).toContain("8:05 AM");
  });

  it("renders the existing Completed timestamp when available", async () => {
    mockState.inspections = [
      inspectionFixture({ completedAt: new Date("2026-07-18T12:10:00.000Z") }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Completed");
    expect(markup).toContain("Jul 18, 2026");
    expect(markup).toContain("8:10 AM");
  });

  it("renders Not available for a missing lifecycle timestamp", async () => {
    mockState.inspections = [inspectionFixture({ completedAt: null })];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Completed");
    expect(markup).toContain("Not available");
  });

  it("renders Not available for an invalid lifecycle timestamp", async () => {
    mockState.inspections = [
      inspectionFixture({ updatedAt: new Date("invalid-date") }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Updated");
    expect(markup).toContain("Not available");
  });

  it("renders only existing lifecycle timestamp rows", async () => {
    const markup = await renderDetailsPage();

    expect(markup).toContain("Created");
    expect(markup).toContain("Updated");
    expect(markup).toContain("Completed");
    expect(markup).not.toContain("Inspected At");
    expect(markup).not.toContain("Requested");
  });

  it("keeps the timestamp section visible when nullable lifecycle values are missing", async () => {
    mockState.inspections = [
      inspectionFixture({ updatedAt: new Date("invalid-date"), completedAt: null }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Inspection Timestamps");
    expect(markup).toContain("Not available");
  });

  it("renders the Reinspect URL button", async () => {
    const markup = await renderDetailsPage();

    expect(markup).toContain("Reinspect URL");
  });

  it("renders Reinspect URL as a button control", async () => {
    const markup = await renderDetailsPage();

    expect(getReinspectButtonMarkup(markup)).not.toBeNull();
  });

  it("uses Reinspect URL as the visible button label", async () => {
    const markup = await renderDetailsPage();
    const button = getReinspectButtonMarkup(markup);

    expect(button).toContain("Reinspect URL");
  });

  it("uses type submit for the Reinspect URL button", async () => {
    const markup = await renderDetailsPage();
    const button = getReinspectButtonMarkup(markup);

    expect(button).toContain('type="submit"');
  });

  it("does not render Reinspect URL as an inert button control", async () => {
    const markup = await renderDetailsPage();
    const button = getReinspectButtonMarkup(markup);

    expect(button).not.toContain('type="button"');
  });

  it("wraps Reinspect URL in a submit form", async () => {
    const markup = await renderDetailsPage();

    expect(getReinspectFormMarkup(markup)).not.toBeNull();
  });

  it("does not render loading UI for reinspection", async () => {
    const markup = await renderDetailsPage();

    expect(markup).not.toContain("Inspecting...");
    expect(markup).not.toContain("spinner");
  });

  it("does not render Reinspect URL as navigation", async () => {
    const markup = await renderDetailsPage();

    expect(markup).not.toMatch(/<a[^>]*>Reinspect URL<\/a>/);
    expect(getReinspectButtonMarkup(markup)).not.toContain("href=");
  });

  it("does not render a loading indicator for reinspection", async () => {
    const markup = await renderDetailsPage();

    expect(markup).not.toContain("Inspecting...");
  });

  it("does not render a reinspection success message", async () => {
    const markup = await renderDetailsPage();

    expect(markup).not.toContain("URL reinspection started");
    expect(markup).not.toContain("Reinspection started");
  });

  it("does not render a reinspection error message", async () => {
    const markup = await renderDetailsPage();

    expect(markup).not.toContain("URL reinspection could not be started");
    expect(markup).not.toContain("error");
  });

  it("queries with website scope", async () => {
    await renderDetailsPage({ websiteId: "website-1" });

    expect(mockState.lastInspectionFindFirstArgs?.where.websiteId).toBe(
      "website-1"
    );
  });

  it("queries with organization scope", async () => {
    await renderDetailsPage();

    expect(mockState.lastInspectionFindFirstArgs?.where.organizationId).toBe(
      "org-1"
    );
  });

  it("selects only safe inspection detail fields", async () => {
    await renderDetailsPage();

    expect(mockState.lastInspectionFindFirstArgs?.select).toEqual({
      inspectedUrl: true,
      status: true,
      verdict: true,
      coverageState: true,
      indexingState: true,
      robotsTxtState: true,
      createdAt: true,
      updatedAt: true,
      completedAt: true,
      pageFetchState: true,
      crawledAs: true,
      userCanonical: true,
      googleCanonical: true,
      lastCrawlTime: true,
    });
  });

  it("does not select unrelated website or organization data", async () => {
    await renderDetailsPage();

    const query = JSON.stringify(mockState.lastInspectionFindFirstArgs?.select);

    expect(query).not.toContain("website");
    expect(query).not.toContain("organization");
    expect(query).not.toContain("searchConsoleProperty");
  });

  it("fetches the inspection only once", async () => {
    await renderDetailsPage();

    expect(mockState.inspectionFindFirstCount).toBe(1);
  });

  it("does not select rawResponse", async () => {
    await renderDetailsPage();

    expect(JSON.stringify(mockState.lastInspectionFindFirstArgs)).not.toContain(
      "rawResponse"
    );
  });

  it("does not render rawResponse", async () => {
    const markup = await renderDetailsPage();

    expect(markup).not.toContain("secretRawGooglePayload");
  });

  it("does not use rawResponse to derive robots state", async () => {
    mockState.inspections = [
      inspectionFixture({
        robotsTxtState: null,
        rawResponse: { robotsTxtState: "RAW_RESPONSE_ROBOTS_VALUE" },
      }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Not available");
    expect(markup).not.toContain("RAW_RESPONSE_ROBOTS_VALUE");
  });

  it("does not use rawResponse to derive crawl information", async () => {
    mockState.inspections = [
      inspectionFixture({
        pageFetchState: null,
        crawledAs: null,
        rawResponse: {
          pageFetchState: "RAW_RESPONSE_FETCH_VALUE",
          crawledAs: "RAW_RESPONSE_CRAWLED_AS",
        },
      }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Not available");
    expect(markup).not.toContain("RAW_RESPONSE_FETCH_VALUE");
    expect(markup).not.toContain("RAW_RESPONSE_CRAWLED_AS");
  });

  it("does not use rawResponse to derive canonical values", async () => {
    mockState.inspections = [
      inspectionFixture({
        userCanonical: null,
        googleCanonical: null,
        rawResponse: {
          userCanonical: "https://example.com/raw-user-canonical",
          googleCanonical: "https://example.com/raw-google-canonical",
        },
      }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Not available");
    expect(markup).not.toContain("https://example.com/raw-user-canonical");
    expect(markup).not.toContain("https://example.com/raw-google-canonical");
  });

  it("does not use rawResponse to derive the last-crawl timestamp", async () => {
    mockState.inspections = [
      inspectionFixture({
        lastCrawlTime: null,
        rawResponse: { lastCrawlTime: "2026-07-16T10:00:00.000Z" },
      }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Not available");
    expect(markup).not.toContain("Jul 16, 2026");
  });

  it("does not use rawResponse to derive inspection timestamps", async () => {
    mockState.inspections = [
      inspectionFixture({
        completedAt: null,
        rawResponse: { completedAt: "2026-07-15T10:00:00.000Z" },
      }),
    ];

    const markup = await renderDetailsPage();

    expect(markup).toContain("Not available");
    expect(markup).not.toContain("Jul 15, 2026");
  });

  it("keeps existing inspection details visible with the Reinspect button", async () => {
    const markup = await renderDetailsPage();

    expect(markup).toContain("Inspection Details");
    expect(markup).toContain("Coverage");
    expect(markup).toContain("Indexing verdict");
    expect(markup).toContain("Indexing state");
    expect(markup).toContain("Robots.txt status");
    expect(markup).toContain("Crawl Information");
    expect(markup).toContain("Canonical Information");
    expect(markup).toContain("Last Crawl");
    expect(markup).toContain("Inspection Timestamps");
  });

  it("does not select OAuth token fields", async () => {
    await renderDetailsPage();

    const query = JSON.stringify(mockState.lastInspectionFindFirstArgs);

    expect(query).not.toContain("accessToken");
    expect(query).not.toContain("refreshToken");
    expect(query).not.toContain("credentials");
    expect(query).not.toContain("googleAccount");
  });
});
