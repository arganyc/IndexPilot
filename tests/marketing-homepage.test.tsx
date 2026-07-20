import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const liveDataState = vi.hoisted(() => ({
  prismaImports: 0,
  authImports: 0,
}));

vi.mock("@/lib/prisma", () => {
  liveDataState.prismaImports += 1;

  return {
    prisma: {},
  };
});

vi.mock("@/lib/auth/organization", () => {
  liveDataState.authImports += 1;

  return {
    getCurrentOrganizationContext: vi.fn(),
  };
});

describe("marketing homepage hero", () => {
  it("renders the hero eyebrow", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("Google Indexing Management");
  });

  it("renders exactly one H1", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup.match(/<h1/g)).toHaveLength(1);
    expect(markup).toContain(
      "Know exactly why Google isn&#x27;t indexing your pages."
    );
  });

  it("renders the supporting copy", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("Connect Google Search Console");
    expect(markup).toContain("manage multiple websites");
  });

  it("links Start Free to signup", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain('href="/signup"');
    expect(markup).toContain("Start Free");
  });

  it("links See Features to features", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain('href="/features"');
    expect(markup).toContain("See Features");
  });

  it("renders the trust points", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("Secure Google connection");
    expect(markup).toContain("Multi-website management");
    expect(markup).toContain("Inspection history");
  });

  it("renders the product preview", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("Indexing overview");
    expect(markup).toContain("Static preview");
    expect(markup).toContain("Recent inspections");
  });

  it("renders the sample metrics", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("1,248");
    expect(markup).toContain("URLs monitored");
    expect(markup).toContain("936");
    expect(markup).toContain("Indexed");
    expect(markup).toContain("184");
    expect(markup).toContain("Crawled, not indexed");
    expect(markup).toContain("79");
    expect(markup).toContain("Discovered, not indexed");
    expect(markup).toContain("49");
    expect(markup).toContain("Blocked or canonical issues");
  });

  it("renders the sample inspection statuses", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("example.com/pricing");
    expect(markup).toContain("shop.example.com/products/running-shoes");
    expect(markup).toContain("docs.example.com/guides/sitemaps");
    expect(markup).toContain("Crawled, not indexed");
    expect(markup).toContain("Discovered, not indexed");
  });

  it("defines homepage metadata", async () => {
    const { metadata } = await import("../app/(marketing)/page");

    expect(metadata.title).toBe("IndexPilot — Google Indexing Management");
    expect(metadata.description).toBe(
      "Inspect URLs, monitor Google indexing status, and manage indexing across all your websites from one dashboard."
    );
  });

  it("does not render AppShell", async () => {
    const { default: MarketingLayout } = await import(
      "../app/(marketing)/layout"
    );
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(
      <MarketingLayout>
        <MarketingHomePage />
      </MarketingLayout>
    );

    expect(markup).not.toContain("Technical SEO");
    expect(markup).not.toContain("Phase 2");
  });

  it("does not import live Prisma data access", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    renderToStaticMarkup(<MarketingHomePage />);

    expect(liveDataState.prismaImports).toBe(0);
  });

  it("renders the benefits eyebrow", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("Built for indexing clarity");
  });

  it("renders the benefits section H2", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("<h2");
    expect(markup).toContain("Stop guessing what Google sees.");
  });

  it("renders the benefits supporting copy", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("IndexPilot brings URL inspection");
    expect(markup).toContain("take action with confidence");
  });

  it("renders exactly four benefit cards", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup.match(/data-benefit-card="true"/g)).toHaveLength(4);
  });

  it("renders all four benefit card titles", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("Inspect URLs faster");
    expect(markup).toContain("Track changes over time");
    expect(markup).toContain("Manage every website");
    expect(markup).toContain("Find issues that need attention");
  });

  it("renders all four benefit descriptions", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("Check Google&#x27;s latest indexing verdict");
    expect(markup).toContain("Keep a clear inspection history");
    expect(markup).toContain("Switch between client, company, and content sites");
    expect(markup).toContain("Quickly identify crawled, discovered, blocked");
  });

  it("renders decorative icons for the benefit cards", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup.match(/data-benefit-card="true"/g)).toHaveLength(4);
    expect(markup.match(/data-benefit-icon="true"/g)).toHaveLength(4);
  });

  it("still contains exactly one H1 after adding benefits", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup.match(/<h1/g)).toHaveLength(1);
  });

  it("keeps the hero content unchanged", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("Google Indexing Management");
    expect(markup).toContain(
      "Know exactly why Google isn&#x27;t indexing your pages."
    );
    expect(markup).toContain('href="/signup"');
    expect(markup).toContain("Static preview");
  });

  it("renders the comparison eyebrow", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("Built for a faster workflow");
  });

  it("renders the comparison H2", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain(
      "Google Search Console shows the data. IndexPilot helps you manage it."
    );
  });

  it("renders the comparison supporting copy", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("Search Console remains the source of truth");
    expect(markup).toContain("a clearer workflow for inspecting URLs");
  });

  it("renders both comparison column headings", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("Google Search Console");
    expect(markup).toContain("IndexPilot");
  });

  it("renders all comparison items", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("Inspect one property at a time");
    expect(markup).toContain("Review the latest URL inspection result");
    expect(markup).toContain("Switch between properties manually");
    expect(markup).toContain("Limited inspection workflow organization");
    expect(markup).toContain("Built as a broad search-performance platform");
    expect(markup).toContain("Manage multiple websites from one workspace");
    expect(markup).toContain("Keep inspection history over time");
    expect(markup).toContain("Find indexing issues faster");
    expect(markup).toContain("Reinspect important URLs from a focused workflow");
    expect(markup).toContain("Built specifically for indexing operations");
  });

  it("renders exactly two comparison columns", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup.match(/data-comparison-column="true"/g)).toHaveLength(2);
  });

  it("uses semantic lists for the comparison items", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup.match(/<ul/g)?.length).toBeGreaterThanOrEqual(2);
    expect(markup.match(/<li/g)?.length).toBeGreaterThanOrEqual(10);
  });

  it("renders decorative comparison icons", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup.match(/<svg[^>]*aria-hidden="true"/g)?.length).toBeGreaterThanOrEqual(
      12
    );
  });

  it("includes complementary product positioning copy", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("Search Console remains the source of truth");
    expect(markup).toContain("helps you manage it");
  });

  it("does not include unsupported indexing claims", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />).toLowerCase();

    expect(markup).not.toContain("guaranteed indexing");
    expect(markup).not.toContain("guarantee indexing");
    expect(markup).not.toContain("faster google crawling");
    expect(markup).not.toContain("automatic ranking improvements");
  });

  it("does not imply Google partnership or endorsement", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />).toLowerCase();

    expect(markup).not.toContain("google partner");
    expect(markup).not.toContain("official google");
    expect(markup).not.toContain("google endorsed");
    expect(markup).not.toContain("endorsed by google");
  });

  it("still contains exactly one H1 after adding comparison", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup.match(/<h1/g)).toHaveLength(1);
  });

  it("keeps the benefits section unchanged", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("Built for indexing clarity");
    expect(markup).toContain("Stop guessing what Google sees.");
    expect(markup).toContain("Inspect URLs faster");
    expect(markup).toContain("Find issues that need attention");
  });

  it("renders the how it works eyebrow", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("Simple by design");
  });

  it("renders the how it works H2", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain(
      "From Search Console connection to indexing clarity in three steps."
    );
  });

  it("renders the how it works supporting copy", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("Connect your Google account");
    expect(markup).toContain("decide what needs attention next");
  });

  it("renders exactly three workflow steps", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup.match(/data-workflow-step="true"/g)).toHaveLength(3);
  });

  it("renders step numbers 01, 02, and 03", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("01");
    expect(markup).toContain("02");
    expect(markup).toContain("03");
  });

  it("renders all three workflow step titles", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("Connect Google Search Console");
    expect(markup).toContain("Inspect important URLs");
    expect(markup).toContain("Track and take action");
  });

  it("renders all three workflow step descriptions", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("Authorize IndexPilot securely");
    expect(markup).toContain("Run URL inspections and review Google&#x27;s indexing verdict");
    expect(markup).toContain("Review inspection history");
  });

  it("renders decorative icons for each workflow step", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup.match(/data-workflow-icon="true"/g)).toHaveLength(3);
    expect(markup.match(/data-workflow-icon="true"[\s\S]*?aria-hidden="true"/g)?.length ?? 0).toBeGreaterThanOrEqual(0);
    expect(markup.match(/<svg[^>]*aria-hidden="true"[^>]*data-workflow-icon="true"/g)).toHaveLength(3);
  });

  it("uses H3 headings for workflow step titles", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup.match(/<h3/g)?.length).toBeGreaterThanOrEqual(9);
    expect(markup).toContain("<h3");
    expect(markup).toContain("Connect Google Search Console");
  });

  it("still contains exactly one H1 after adding the workflow section", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup.match(/<h1/g)).toHaveLength(1);
  });

  it("keeps hero, benefits, and comparison sections unchanged", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("Google Indexing Management");
    expect(markup).toContain("Built for indexing clarity");
    expect(markup).toContain("Built for a faster workflow");
    expect(markup).toContain("Search Console remains the source of truth");
  });

  it("does not import live data or authentication access", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    renderToStaticMarkup(<MarketingHomePage />);

    expect(liveDataState.prismaImports).toBe(0);
    expect(liveDataState.authImports).toBe(0);
  });

  it("renders the roadmap shell eyebrow", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("Built for today, expanding for tomorrow");
  });

  it("renders the roadmap shell H2", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain(
      "Everything you need to start managing indexing with confidence."
    );
  });

  it("renders the roadmap shell supporting copy", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("core inspection workflow today");
    expect(markup).toContain("automation, reporting, and collaboration");
  });

  it("keeps a responsive roadmap container with available and planned panels", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain('data-roadmap-panel="available"');
    expect(markup).toContain('data-roadmap-panel="planned"');
    expect(markup).toContain("lg:grid-cols-2");
  });

  it("still contains exactly one H1 after adding the roadmap shell", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup.match(/<h1/g)).toHaveLength(1);
  });

  it("renders the Available now roadmap panel", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain('data-roadmap-panel="available"');
    expect(markup).toContain("Available");
    expect(markup).toContain("Available now");
    expect(markup).toContain("Core indexing workflow");
  });

  it("renders only confirmed available capabilities", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("Google Search Console connection");
    expect(markup).toContain("Multi-website management");
    expect(markup).toContain("URL inspection");
    expect(markup).toContain("Inspection details");
    expect(markup).toContain("Inspection history");
    expect(markup).toContain("Search and status filtering");
    expect(markup).toContain("Secure URL reinspection");
    expect(markup).not.toContain("AI analysis");
    expect(markup).not.toContain("reports automation");
  });

  it("uses a semantic list for available roadmap capabilities", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("<ul");
    expect(markup.match(/data-roadmap-available-icon="true"/g)).toHaveLength(7);
  });

  it("renders decorative icons for available roadmap capabilities", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(
      markup.match(
        /<svg[^>]*aria-hidden="true"[^>]*data-roadmap-available-icon="true"/g
      )
    ).toHaveLength(7);
  });

  it("renders the Coming soon roadmap panel", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain('data-roadmap-panel="planned"');
    expect(markup).toContain("Planned");
    expect(markup).toContain("Coming soon");
    expect(markup).toContain("Planned platform expansion");
  });

  it("renders planned roadmap capabilities without reinspection fallback", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("Bulk URL inspection");
    expect(markup).toContain("Scheduled monitoring");
    expect(markup).toContain("Email alerts");
    expect(markup).toContain("Team collaboration");
    expect(markup).toContain("Client reporting");
    expect(markup).toContain("API access");
    expect(markup).not.toContain("Reinspection workflow in development");
  });

  it("renders decorative icons for planned roadmap capabilities", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup.match(/data-roadmap-planned-icon="true"/g)).toHaveLength(6);
    expect(
      markup.match(
        /<svg[^>]*aria-hidden="true"[^>]*data-roadmap-planned-icon="true"/g
      )
    ).toHaveLength(6);
  });

  it("does not render roadmap delivery dates or visible progress percentages", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).not.toContain("Q1");
    expect(markup).not.toContain("Q2");
    expect(markup).not.toContain("Q3");
    expect(markup).not.toContain("Q4");
    expect(markup).not.toContain(">25%<");
    expect(markup).not.toContain(">50%<");
    expect(markup).not.toContain(">75%<");
    expect(markup).not.toContain(">100%<");
  });

  it("links to the full roadmap below the roadmap panels", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain('href="/roadmap"');
    expect(markup).toContain("View the full roadmap");
  });

  it("keeps roadmap panels responsive with desktop columns and mobile stacking", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("grid gap-4 lg:grid-cols-2");
    expect(markup).toContain('data-roadmap-panel="available"');
    expect(markup).toContain('data-roadmap-panel="planned"');
  });

  it("keeps Available and Planned labels visible as text", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain(">Available<");
    expect(markup).toContain(">Planned<");
  });

  it("keeps roadmap lists semantic and icons decorative", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup.match(/data-roadmap-available-icon="true"/g)).toHaveLength(7);
    expect(markup.match(/data-roadmap-planned-icon="true"/g)).toHaveLength(6);
    expect(markup.match(/<ul/g)?.length).toBeGreaterThanOrEqual(6);
    expect(
      markup.match(
        /<svg[^>]*aria-hidden="true"[^>]*data-roadmap-(available|planned)-icon="true"/g
      )
    ).toHaveLength(13);
  });

  it("keeps the homepage free of guaranteed indexing claims", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />).toLowerCase();

    expect(markup).not.toContain("guaranteed indexing");
    expect(markup).not.toContain("guarantees indexing");
    expect(markup).not.toContain("guarantee indexing");
  });

  it("keeps earlier homepage sections unchanged after roadmap completion", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("Google Indexing Management");
    expect(markup).toContain("Built for indexing clarity");
    expect(markup).toContain("Built for a faster workflow");
    expect(markup).toContain("Simple by design");
    expect(markup.match(/<h1/g)).toHaveLength(1);
  });
});
