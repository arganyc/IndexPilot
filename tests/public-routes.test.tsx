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

const marketingRoutes = [
  {
    name: "features",
    importPage: () => import("../app/(marketing)/features/page"),
    heading: "Features",
    title: "Features | IndexPilot",
  },
  {
    name: "pricing",
    importPage: () => import("../app/(marketing)/pricing/page"),
    heading: "Pricing",
    title: "Pricing | IndexPilot",
  },
  {
    name: "roadmap",
    importPage: () => import("../app/(marketing)/roadmap/page"),
    heading: "Roadmap",
    title: "Roadmap | IndexPilot",
  },
  {
    name: "contact",
    importPage: () => import("../app/(marketing)/contact/page"),
    heading: "Contact",
    title: "Contact | IndexPilot",
  },
  {
    name: "privacy",
    importPage: () => import("../app/(marketing)/privacy/page"),
    heading: "Privacy Policy",
    title: "Privacy Policy | IndexPilot",
  },
  {
    name: "terms",
    importPage: () => import("../app/(marketing)/terms/page"),
    heading: "Terms of Service",
    title: "Terms of Service | IndexPilot",
  },
] as const;

const authRoutes = [
  {
    name: "login",
    importPage: () => import("../app/(auth)/login/page"),
    heading: "Log in to IndexPilot",
    title: "Log in | IndexPilot",
  },
  {
    name: "signup",
    importPage: () => import("../app/(auth)/signup/page"),
    heading: "Create your IndexPilot account",
    title: "Sign up | IndexPilot",
  },
] as const;

describe("public placeholder routes", () => {
  it.each(marketingRoutes)(
    "renders the $name marketing route",
    async ({ importPage, heading }) => {
      const routeModule = await importPage();
      const Page = routeModule.default;

      const markup = renderToStaticMarkup(<Page />);

      expect(markup).toContain(`<h1`);
      expect(markup).toContain(heading);
      expect(markup).toContain("under development");
    }
  );

  it.each(marketingRoutes)(
    "defines metadata for the $name route",
    async ({ importPage, title }) => {
      const routeModule = await importPage();

      expect(routeModule.metadata.title).toBe(title);
      expect(routeModule.metadata.description).toEqual(expect.any(String));
    }
  );

  it.each(authRoutes)(
    "renders the $name auth route",
    async ({ importPage, heading }) => {
      const routeModule = await importPage();
      const Page = routeModule.default;

      const markup = renderToStaticMarkup(<Page />);

      expect(markup).toContain(`<h1`);
      expect(markup).toContain(heading);
      expect(markup).toContain("will be added later");
    }
  );

  it.each(authRoutes)(
    "defines metadata for the $name auth route",
    async ({ importPage, title }) => {
      const routeModule = await importPage();

      expect(routeModule.metadata.title).toBe(title);
      expect(routeModule.metadata.description).toEqual(expect.any(String));
    }
  );

  it("links login to signup and back home", async () => {
    const { default: LoginPage } = await import("../app/(auth)/login/page");

    const markup = renderToStaticMarkup(<LoginPage />);

    expect(markup).toContain('href="/signup"');
    expect(markup).toContain('href="/"');
  });

  it("links signup to login and back home", async () => {
    const { default: SignupPage } = await import("../app/(auth)/signup/page");

    const markup = renderToStaticMarkup(<SignupPage />);

    expect(markup).toContain('href="/login"');
    expect(markup).toContain('href="/"');
  });

  it("renders auth pages without AppShell", async () => {
    const { default: AuthLayout } = await import("../app/(auth)/layout");
    const { default: LoginPage } = await import("../app/(auth)/login/page");

    const markup = renderToStaticMarkup(
      <AuthLayout>
        <LoginPage />
      </AuthLayout>
    );

    expect(markup).toContain("IndexPilot");
    expect(markup).not.toContain("Technical SEO");
    expect(markup).not.toContain("Phase 2");
  });

  it("renders marketing pages with the marketing layout", async () => {
    const { default: MarketingLayout } = await import(
      "../app/(marketing)/layout"
    );
    const { default: FeaturesPage } = await import(
      "../app/(marketing)/features/page"
    );

    const markup = renderToStaticMarkup(
      <MarketingLayout>
        <FeaturesPage />
      </MarketingLayout>
    );

    expect(markup).toContain("Marketing navigation");
    expect(markup).toContain("Google indexing visibility");
    expect(markup).toContain("Features");
  });

  it("keeps the dashboard inside AppShell", async () => {
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
    expect(markup).toContain("Dashboard");
  });

  it("does not leak route group names into rendered links", async () => {
    const { default: MarketingLayout } = await import(
      "../app/(marketing)/layout"
    );
    const { default: AuthLayout } = await import("../app/(auth)/layout");
    const { default: LoginPage } = await import("../app/(auth)/login/page");

    const marketingMarkup = renderToStaticMarkup(
      <MarketingLayout>
        <div />
      </MarketingLayout>
    );
    const authMarkup = renderToStaticMarkup(
      <AuthLayout>
        <LoginPage />
      </AuthLayout>
    );

    expect(marketingMarkup).not.toContain("(marketing)");
    expect(marketingMarkup).not.toContain("(auth)");
    expect(marketingMarkup).not.toContain("(app)");
    expect(authMarkup).not.toContain("(marketing)");
    expect(authMarkup).not.toContain("(auth)");
    expect(authMarkup).not.toContain("(app)");
  });
});
