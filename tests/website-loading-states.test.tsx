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
  createdAt: Date;
  updatedAt: Date;
};

const mockState = vi.hoisted(() => ({
  website: null as WebsiteFixture | null,
  websites: [] as WebsiteFixture[],
  sitemapCount: 0,
  importedUrlCount: 0,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    website: {
      findMany: async () => mockState.websites,
      findUnique: async () => mockState.website,
    },
    sitemap: {
      count: async () => mockState.sitemapCount,
    },
    urlRecord: {
      count: async () => mockState.importedUrlCount,
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

vi.mock("@/components/websites/website-navigation", () => ({
  WebsiteNavigation: () => <div>Website navigation</div>,
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
    notes: input.notes ?? "Demo notes",
    createdAt: input.createdAt ?? new Date("2026-01-02T03:04:05.000Z"),
    updatedAt: input.updatedAt ?? new Date("2026-01-03T03:04:05.000Z"),
  };
}

async function renderWebsitesLoading() {
  const { default: WebsitesLoading } = await import("../app/(app)/websites/loading");

  return renderToStaticMarkup(<WebsitesLoading />);
}

async function renderWebsiteDetailsLoading() {
  const { default: WebsiteDetailsLoading } = await import(
    "../app/(app)/websites/[id]/loading"
  );

  return renderToStaticMarkup(<WebsiteDetailsLoading />);
}

async function renderWebsitesPage() {
  const { default: WebsitesPage } = await import("../app/(app)/websites/page");
  const page = await WebsitesPage({ searchParams: Promise.resolve({}) });

  return renderToStaticMarkup(page);
}

async function renderWebsiteDetailsPage() {
  const { default: WebsiteDetailsPage } = await import(
    "../app/(app)/websites/[id]/page"
  );
  const page = await WebsiteDetailsPage({
    params: Promise.resolve({ id: "website-1" }),
  });

  return renderToStaticMarkup(page);
}

async function renderWebsiteStatusBadge(status: "ACTIVE" | "PAUSED" | "ARCHIVED") {
  const { WebsiteStatusBadge } = await import(
    "../components/websites/website-status-badge"
  );

  return renderToStaticMarkup(<WebsiteStatusBadge status={status} />);
}

beforeEach(() => {
  mockState.website = websiteFixture();
  mockState.websites = [websiteFixture()];
  mockState.sitemapCount = 2;
  mockState.importedUrlCount = 12;
});

describe("website loading states", () => {
  it("renders the websites route loading skeleton", async () => {
    const markup = await renderWebsitesLoading();

    expect(markup).toContain("Loading websites...");
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("motion-safe:animate-pulse");
  });

  it("replaces the websites skeleton with populated website UI", async () => {
    const markup = await renderWebsitesPage();

    expect(markup).toContain("Example Site");
    expect(markup).toContain("Website actions");
    expect(markup).not.toContain("Loading websites...");
    expect(markup).not.toContain("motion-safe:animate-pulse");
  });

  it("renders website cards with the domain primary and metadata secondary", async () => {
    mockState.websites = [
      websiteFixture({
        name: "Secondary Website Name",
        domain:
          "https://primary-domain.example.com/resources/that-should-not-overflow",
        notes: "Supporting website metadata",
      }),
    ];

    const markup = await renderWebsitesPage();

    expect(markup).toContain(
      "https://primary-domain.example.com/resources/that-should-not-overflow"
    );
    expect(markup).toContain("Secondary Website Name");
    expect(markup).toContain("Supporting website metadata");
    expect(markup).toContain(
      '<a class="block truncate hover:underline" href="/websites/website-1">https://primary-domain.example.com/resources/that-should-not-overflow</a>'
    );
    expect(markup).toContain(
      '<p class="truncate text-sm leading-6 text-muted-foreground">Secondary Website Name</p>'
    );
    expect(markup).toContain("text-lg font-semibold leading-snug text-foreground");
    expect(markup).toContain(
      'class="line-clamp-3 leading-6 text-muted-foreground"'
    );
    expect(markup).toContain("Website actions");
  });

  it("renders website status badges with visible labels and accessible names", async () => {
    const activeMarkup = await renderWebsiteStatusBadge("ACTIVE");
    const pausedMarkup = await renderWebsiteStatusBadge("PAUSED");
    const archivedMarkup = await renderWebsiteStatusBadge("ARCHIVED");

    expect(activeMarkup).toContain("Active");
    expect(activeMarkup).toContain('aria-label="Website status: Active"');
    expect(activeMarkup).toContain('data-variant="default"');
    expect(pausedMarkup).toContain("Paused");
    expect(pausedMarkup).toContain('aria-label="Website status: Paused"');
    expect(pausedMarkup).toContain('data-variant="outline"');
    expect(archivedMarkup).toContain("Archived");
    expect(archivedMarkup).toContain('aria-label="Website status: Archived"');
    expect(archivedMarkup).toContain('data-variant="secondary"');
  });

  it("renders the website details route loading skeleton", async () => {
    const markup = await renderWebsiteDetailsLoading();

    expect(markup).toContain("Loading website details...");
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("motion-safe:animate-pulse");
  });

  it("replaces the website details skeleton with populated details UI", async () => {
    const markup = await renderWebsiteDetailsPage();

    expect(markup).toContain("Example Site");
    expect(markup).toContain(
      'class="break-words text-3xl font-semibold leading-tight text-foreground sm:text-4xl"'
    );
    expect(markup).toContain("Current project");
    expect(markup).toContain("Active");
    expect(markup).toContain('aria-label="Website status: Active"');
    expect(markup).toContain(
      '<p class="break-all text-sm leading-6 text-muted-foreground">example.com</p>'
    );
    expect(markup).toContain(
      "Website details summarize this website workspace in IndexPilot. These settings help organize sitemaps, URL inventory, and inspections but do not affect Google&#x27;s indexing decisions."
    );
    expect(markup).toContain(
      'class="max-w-3xl text-sm leading-6 text-muted-foreground"'
    );
    expect(markup).toContain("Website Overview");
    expect(markup).toContain(
      "Current setup and discovery signals for this website."
    );
    expect(markup).toContain("Project actions");
    expect(markup).toContain("Project sections");
    expect(markup).toContain('aria-labelledby="project-actions-label"');
    expect(markup).toContain('aria-labelledby="project-sections-label"');
    expect(markup).toContain('href="/websites"');
    expect(markup).toContain('href="/websites/website-1/edit"');
    expect(markup).toContain("Website actions");
    expect(markup).toContain("Website navigation");
    expect(markup).toContain('aria-label="Website health summary"');
    expect(markup.indexOf("Status")).toBeLessThan(markup.indexOf("Name"));
    expect(markup).toContain("Imported URL count");
    expect(markup).toContain("12");
    expect(markup).toContain("Sitemap count");
    expect(markup).not.toContain("Placeholder");
    expect(markup).not.toContain("Loading website details...");
    expect(markup).not.toContain("motion-safe:animate-pulse");
  });
});
