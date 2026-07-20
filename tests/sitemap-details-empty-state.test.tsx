import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type SitemapDetailsFixture = {
  id: string;
  url: string;
  status: string;
  type: string;
  urlCount: number;
  lastFetchedAt: Date | null;
  lastSuccessfulFetchAt: Date | null;
  lastError: string | null;
  website: { id: string; name: string };
  parentSitemap: { id: string; url: string } | null;
  childSitemaps: Array<{
    id: string;
    url: string;
    status: string;
    type: string;
    urlCount: number;
  }>;
  _count: { urlRecords: number };
};

const mockState = vi.hoisted(() => ({
  sitemap: null as SitemapDetailsFixture | null,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sitemap: {
      findFirst: async () => mockState.sitemap,
    },
  },
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

vi.mock("@/components/sitemaps/import-sitemap-button", () => ({
  ImportSitemapButton: () => <div>Import sitemap button</div>,
}));

vi.mock("@/components/sitemaps/parse-test-button", () => ({
  ParseTestButton: () => <div>Parse test button</div>,
}));

vi.mock("@/components/sitemaps/sitemap-actions", () => ({
  SitemapActions: () => <div>Sitemap actions</div>,
}));

vi.mock("@/components/sitemaps/test-fetch-button", () => ({
  TestFetchButton: () => <div>Test fetch button</div>,
}));

vi.mock("@/components/sitemaps/sitemap-type-form", () => ({
  SitemapTypeForm: () => <div>Sitemap type form</div>,
}));

function sitemapFixture(
  input: Partial<SitemapDetailsFixture> = {}
): SitemapDetailsFixture {
  return {
    id: input.id ?? "sitemap-1",
    url: input.url ?? "https://example.com/sitemap.xml",
    status: input.status ?? "PENDING",
    type: input.type ?? "URL_SET",
    urlCount: input.urlCount ?? 0,
    lastFetchedAt: input.lastFetchedAt ?? null,
    lastSuccessfulFetchAt: input.lastSuccessfulFetchAt ?? null,
    lastError: input.lastError ?? null,
    website: input.website ?? { id: "website-1", name: "Example" },
    parentSitemap: input.parentSitemap ?? null,
    childSitemaps: input.childSitemaps ?? [],
    _count: input._count ?? { urlRecords: 0 },
  };
}

async function renderSitemapDetailsPage() {
  const { default: SitemapDetailsPage } = await import(
    "../app/(app)/websites/[id]/sitemaps/[sitemapId]/page"
  );
  const page = await SitemapDetailsPage({
    params: Promise.resolve({ id: "website-1", sitemapId: "sitemap-1" }),
  });

  return renderToStaticMarkup(page);
}

beforeEach(() => {
  mockState.sitemap = sitemapFixture();
});

describe("sitemap details child sitemap empty state", () => {
  it("renders the child sitemap empty state", async () => {
    const markup = await renderSitemapDetailsPage();

    expect(markup).toContain("No child sitemaps");
    expect(markup).toContain(
      "Child sitemaps appear here when a sitemap index is imported."
    );
    expect(markup).toContain("Child Sitemaps");
    expect(markup).toContain("aria-hidden=\"true\"");
  });

  it("keeps populated child sitemaps unchanged", async () => {
    mockState.sitemap = sitemapFixture({
      childSitemaps: [
        {
          id: "child-1",
          url: "https://example.com/child-sitemap.xml",
          status: "IMPORTED",
          type: "URL_SET",
          urlCount: 12,
        },
      ],
    });

    const markup = await renderSitemapDetailsPage();

    expect(markup).toContain("https://example.com/child-sitemap.xml");
    expect(markup).toContain('href="/websites/website-1/sitemaps/child-1"');
    expect(markup).not.toContain(
      "Child sitemaps appear here when a sitemap index is imported."
    );
  });

  it("keeps missing sitemap errors as not found", async () => {
    mockState.sitemap = null;

    await expect(renderSitemapDetailsPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
