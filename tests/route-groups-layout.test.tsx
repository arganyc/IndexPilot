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

async function getDashboardPageElement() {
  const { default: DashboardPage } = await import(
    "../app/(app)/dashboard/page"
  );

  return DashboardPage();
}

describe("route group layouts", () => {
  it("renders the marketing root without the application shell", async () => {
    const { default: MarketingHomePage } = await import(
      "../app/(marketing)/page"
    );

    const markup = renderToStaticMarkup(<MarketingHomePage />);

    expect(markup).toContain("Google Indexing Management");
    expect(markup).toContain(
      "Know exactly why Google isn&#x27;t indexing your pages."
    );
    expect(markup).not.toContain("Technical SEO");
  });

  it("renders the dashboard inside the application shell", async () => {
    const { default: AppLayout } = await import("../app/(app)/layout");
    const dashboardPage = await getDashboardPageElement();

    const markup = renderToStaticMarkup(
      <AppLayout>
        {dashboardPage}
      </AppLayout>
    );

    expect(markup).toContain("Technical SEO");
    expect(markup).toContain("Dashboard");
  });

  it("points the dashboard navigation link to /dashboard", async () => {
    const { default: AppLayout } = await import("../app/(app)/layout");

    const markup = renderToStaticMarkup(
      <AppLayout>
        <div />
      </AppLayout>
    );

    expect(markup).toContain('href="/dashboard"');
    expect(markup).not.toContain('href="/"');
  });

  it("marks the active dashboard navigation links semantically", async () => {
    const { default: AppLayout } = await import("../app/(app)/layout");

    const markup = renderToStaticMarkup(
      <AppLayout>
        <div />
      </AppLayout>
    );

    expect(markup).toContain('href="/dashboard"');
    expect(markup).toContain('aria-current="page"');
  });

  it("uses semantic theme tokens for the application shell", async () => {
    const { default: AppLayout } = await import("../app/(app)/layout");

    const markup = renderToStaticMarkup(
      <AppLayout>
        <div />
      </AppLayout>
    );

    expect(markup).toContain("bg-background");
    expect(markup).toContain("text-foreground");
    expect(markup).toContain("border-border");
    expect(markup).not.toContain("bg-slate-50");
    expect(markup).not.toContain("bg-teal-600");
  });

  it("renders the dashboard first-use empty state", async () => {
    const { default: AppLayout } = await import("../app/(app)/layout");
    const dashboardPage = await getDashboardPageElement();

    const markup = renderToStaticMarkup(
      <AppLayout>
        {dashboardPage}
      </AppLayout>
    );

    expect(markup).toContain("Welcome to IndexPilot");
    expect(markup).toContain(
      "Inspect your first URL to begin building insights about how Google sees your website."
    );
    expect(markup).toContain('href="/websites/new"');
    expect(markup).toContain('href="/settings/google"');
  });

  it("uses a stronger compact dashboard heading hierarchy", async () => {
    const { default: AppLayout } = await import("../app/(app)/layout");
    const dashboardPage = await getDashboardPageElement();

    const markup = renderToStaticMarkup(
      <AppLayout>
        {dashboardPage}
      </AppLayout>
    );

    expect(markup).toContain(
      'class="text-xl font-semibold leading-tight text-foreground sm:text-2xl"'
    );
  });

  it("uses muted hierarchy for the mobile app label", async () => {
    const { default: AppLayout } = await import("../app/(app)/layout");

    const markup = renderToStaticMarkup(
      <AppLayout>
        <div />
      </AppLayout>
    );

    expect(markup).toContain(
      'class="text-xs font-medium text-muted-foreground md:hidden"'
    );
  });

  it("uses responsive app content spacing", async () => {
    const { default: AppLayout } = await import("../app/(app)/layout");

    const markup = renderToStaticMarkup(
      <AppLayout>
        <div />
      </AppLayout>
    );

    expect(markup).toContain(
      'class="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8"'
    );
  });

  it("keeps navigation focus states and icons aligned", async () => {
    const { default: AppLayout } = await import("../app/(app)/layout");

    const markup = renderToStaticMarkup(
      <AppLayout>
        <div />
      </AppLayout>
    );

    expect(markup).toContain("focus-visible:ring-3");
    expect(markup).toContain("focus-visible:ring-ring/50");
    expect(markup).toContain("size-4 shrink-0");
  });
});
