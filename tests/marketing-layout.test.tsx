import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

const mockDashboardState = vi.hoisted(() => ({
  googleAccountCount: 0,
  usablePropertyCount: 0,
  completedInspectionCount: 0,
  completedInspectionWebsiteId: "website-1" as string | null,
  activeWebsiteId: "website-1" as string | null,
}));

vi.mock("@/lib/auth/organization", () => ({
  getCurrentOrganizationContext: async () => ({
    userId: "user-1",
    organizationId: "org-1",
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    googleAccount: {
      count: async () => mockDashboardState.googleAccountCount,
    },
    searchConsoleProperty: {
      count: async () => mockDashboardState.usablePropertyCount,
    },
    urlInspection: {
      findFirst: async () =>
        mockDashboardState.completedInspectionCount > 0 &&
        mockDashboardState.completedInspectionWebsiteId
          ? { websiteId: mockDashboardState.completedInspectionWebsiteId }
          : null,
    },
    website: {
      findFirst: async () =>
        mockDashboardState.activeWebsiteId
          ? { id: mockDashboardState.activeWebsiteId }
          : null,
    },
  },
}));

describe("marketing layout", () => {
  it("renders the marketing header", async () => {
    const { MarketingHeader } = await import(
      "../components/marketing/marketing-header"
    );

    const markup = renderToStaticMarkup(<MarketingHeader />);

    expect(markup).toContain("IndexPilot");
    expect(markup).toContain("Marketing navigation");
  });

  it("links the IndexPilot brand to the marketing root", async () => {
    const { BrandMark } = await import("../components/marketing/brand-mark");

    const markup = renderToStaticMarkup(<BrandMark />);

    expect(markup).toContain('href="/"');
    expect(markup).toContain('aria-label="IndexPilot home"');
  });

  it("renders the desktop navigation links", async () => {
    const { MarketingHeader } = await import(
      "../components/marketing/marketing-header"
    );

    const markup = renderToStaticMarkup(<MarketingHeader />);

    expect(markup).toContain('href="/features"');
    expect(markup).toContain('href="/pricing"');
    expect(markup).toContain('href="/roadmap"');
    expect(markup).toContain('href="/contact"');
  });

  it("links Log in to /login", async () => {
    const { MarketingHeader } = await import(
      "../components/marketing/marketing-header"
    );

    const markup = renderToStaticMarkup(<MarketingHeader />);

    expect(markup).toContain('href="/login"');
    expect(markup).toContain("Log in");
  });

  it("links Start Free to /signup", async () => {
    const { MarketingHeader } = await import(
      "../components/marketing/marketing-header"
    );

    const markup = renderToStaticMarkup(<MarketingHeader />);

    expect(markup).toContain('href="/signup"');
    expect(markup).toContain("Start Free");
  });

  it("renders an accessible mobile menu button", async () => {
    const { MarketingHeader } = await import(
      "../components/marketing/marketing-header"
    );

    const markup = renderToStaticMarkup(<MarketingHeader />);

    expect(markup).toContain('aria-label="Open navigation menu"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('aria-controls="marketing-mobile-navigation"');
    expect(markup).toContain("md:hidden");
  });

  it("can open the mobile navigation state", async () => {
    const { getNextMobileMenuOpenState } = await import(
      "../components/marketing/marketing-header"
    );

    expect(getNextMobileMenuOpenState(false)).toBe(true);
  });

  it("renders the marketing footer", async () => {
    const { MarketingFooter } = await import(
      "../components/marketing/marketing-footer"
    );

    const markup = renderToStaticMarkup(<MarketingFooter />);

    expect(markup).toContain("Google indexing visibility");
    expect(markup).toContain('href="/privacy"');
    expect(markup).toContain('href="/terms"');
  });

  it("renders the current year in the footer", async () => {
    const { MarketingFooter } = await import(
      "../components/marketing/marketing-footer"
    );

    const markup = renderToStaticMarkup(<MarketingFooter />);

    expect(markup).toContain(String(new Date().getFullYear()));
    expect(markup).toContain("IndexPilot. All rights reserved.");
  });

  it("does not render AppShell in the marketing layout", async () => {
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

    expect(markup).toContain("Google Indexing Management");
    expect(markup).not.toContain("Technical SEO");
    expect(markup).not.toContain("Phase 2");
  });

  it("keeps the dashboard layout inside AppShell", async () => {
    const { default: AppLayout } = await import("../app/(app)/layout");
    const { default: DashboardPage } = await import(
      "../app/(app)/dashboard/page"
    );
    const dashboardPage = await DashboardPage();

    const markup = renderToStaticMarkup(
      <AppLayout>
        {dashboardPage}
      </AppLayout>
    );

    expect(markup).toContain("Technical SEO");
    expect(markup).toContain('href="/dashboard"');
  });
});
