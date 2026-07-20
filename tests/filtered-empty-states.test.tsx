import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type WebsiteFixture = {
  id: string;
  name: string;
  domain: string;
  normalizedDomain: string;
  protocol: string;
  platform: string;
  priority: string;
  status: string;
  notes: string | null;
};

type SitemapFixture = {
  id: string;
  url: string;
  normalizedUrl: string;
  status: string;
  type: string;
  urlCount: number;
  lastFetchedAt: Date | null;
  lastError: string | null;
  parentSitemap: { id: string; url: string } | null;
};

const mockState = vi.hoisted(() => ({
  website: {
    id: "website-1",
    name: "Example",
    domain: "example.com",
  } as { id: string; name: string; domain: string } | null,
  websites: [] as WebsiteFixture[],
  sitemaps: [] as SitemapFixture[],
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    website: {
      findMany: async () => mockState.websites,
      findUnique: async () => mockState.website,
    },
    sitemap: {
      findMany: async () => mockState.sitemaps,
    },
  },
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

vi.mock("@/components/websites/website-actions", () => ({
  WebsiteActions: () => <div>Website actions</div>,
}));

vi.mock("@/components/sitemaps/sitemap-actions", () => ({
  SitemapActions: () => <div>Sitemap actions</div>,
}));

vi.mock("@/components/sitemaps/sitemap-form", () => ({
  SitemapForm: () => <div>Add sitemap form</div>,
}));

function websiteFixture(input: Partial<WebsiteFixture> = {}): WebsiteFixture {
  return {
    id: input.id ?? "website-1",
    name: input.name ?? "Example Site",
    domain: input.domain ?? "example.com",
    normalizedDomain: input.normalizedDomain ?? "example.com",
    protocol: input.protocol ?? "HTTPS",
    platform: input.platform ?? "NEXTJS",
    priority: input.priority ?? "HIGH",
    status: input.status ?? "ACTIVE",
    notes: input.notes ?? null,
  };
}

function sitemapFixture(input: Partial<SitemapFixture> = {}): SitemapFixture {
  return {
    id: input.id ?? "sitemap-1",
    url: input.url ?? "https://example.com/sitemap.xml",
    normalizedUrl: input.normalizedUrl ?? "https://example.com/sitemap.xml",
    status: input.status ?? "PENDING",
    type: input.type ?? "URL_SET",
    urlCount: input.urlCount ?? 0,
    lastFetchedAt: input.lastFetchedAt ?? null,
    lastError: input.lastError ?? null,
    parentSitemap: input.parentSitemap ?? null,
  };
}

async function renderWebsitesPage(searchParams: {
  q?: string;
  status?: string;
  priority?: string;
} = {}) {
  const { default: WebsitesPage } = await import("../app/(app)/websites/page");
  const page = await WebsitesPage({ searchParams: Promise.resolve(searchParams) });

  return renderToStaticMarkup(page);
}

async function renderSitemapsPage(searchParams: {
  q?: string;
  status?: string;
} = {}) {
  const { default: SitemapsPage } = await import(
    "../app/(app)/websites/[id]/sitemaps/page"
  );
  const page = await SitemapsPage({
    params: Promise.resolve({ id: "website-1" }),
    searchParams: Promise.resolve(searchParams),
  });

  return renderToStaticMarkup(page);
}

beforeEach(() => {
  mockState.website = {
    id: "website-1",
    name: "Example",
    domain: "example.com",
  };
  mockState.websites = [];
  mockState.sitemaps = [];
});

describe("filtered empty states", () => {
  it("keeps the websites page header and action available", async () => {
    const markup = await renderWebsitesPage();

    expect(markup).toContain("Websites");
    expect(markup).toContain(
      "A project is a website workspace for its sitemaps, URL inventory, and Google URL inspections."
    );
    expect(markup).toContain(
      'class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground"'
    );
    expect(markup).toContain('href="/websites/new"');
    expect(markup).toContain("Add Website");
    expect(markup).toContain("No websites yet");
  });

  it("renders a distinct filtered-zero state for websites", async () => {
    const markup = await renderWebsitesPage({ q: "missing" });

    expect(markup).toContain("No websites matched");
    expect(markup).toContain(
      "Try a different name, domain, status, or priority filter."
    );
    expect(markup).toContain('href="/websites"');
    expect(markup).toContain("Reset filters");
    expect(markup).toContain('href="/websites/new"');
    expect(markup).not.toContain("No websites yet");
  });

  it("keeps the websites first-use empty state distinct", async () => {
    const markup = await renderWebsitesPage();

    expect(markup).toContain("No websites yet");
    expect(markup).toContain(
      "Add your first website to begin organizing inspections and tracking Google&#x27;s view of your content."
    );
    expect(markup).toContain(
      'class="grid max-w-md justify-items-center gap-4"'
    );
    expect(markup).toContain(
      'class="text-sm leading-6 text-slate-500"'
    );
    expect(markup).toContain("Add Website");
    expect(markup).not.toContain("No websites matched");
  });

  it("keeps populated websites unchanged", async () => {
    mockState.websites = [websiteFixture()];

    const markup = await renderWebsitesPage();

    expect(markup).toContain("Example Site");
    expect(markup).toContain("Website actions");
    expect(markup).not.toContain("No websites matched");
  });

  it("renders a distinct filtered-zero state for sitemaps", async () => {
    const markup = await renderSitemapsPage({ q: "missing" });

    expect(markup).toContain("No sitemaps matched");
    expect(markup).toContain(
      "Try a different sitemap URL, error term, or status filter."
    );
    expect(markup).toContain('href="/websites/website-1/sitemaps"');
    expect(markup).toContain("Reset filters");
    expect(markup).toContain('href="#add-sitemap"');
    expect(markup).not.toContain("No sitemaps found");
  });

  it("keeps the sitemaps first-use empty state distinct", async () => {
    const markup = await renderSitemapsPage();

    expect(markup).toContain("No sitemaps found");
    expect(markup).toContain(
      "Add a sitemap manually or adjust the current search and filters."
    );
    expect(markup).toContain(
      'class="grid max-w-md justify-items-center gap-4"'
    );
    expect(markup).toContain(
      'class="text-sm leading-6 text-slate-500"'
    );
    expect(markup).toContain("Add Sitemap Manually");
    expect(markup).not.toContain("No sitemaps matched");
  });

  it("keeps populated sitemaps unchanged", async () => {
    mockState.sitemaps = [sitemapFixture()];

    const markup = await renderSitemapsPage();

    expect(markup).toContain("Sitemaps");
    expect(markup).toContain(
      "Sitemaps help IndexPilot discover which URLs belong to this website. They do not guarantee that Google will crawl or index every URL."
    );
    expect(markup).toContain(
      'class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground"'
    );
    expect(markup).toContain("https://example.com/sitemap.xml");
    expect(markup).toContain("Sitemap actions");
    expect(markup).not.toContain("No sitemaps matched");
  });

  it("keeps missing sitemap websites as not found", async () => {
    mockState.website = null;

    await expect(renderSitemapsPage({ q: "missing" })).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
  });
});
