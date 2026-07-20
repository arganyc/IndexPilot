import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
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
      count: async () => mockState.googleAccountCount,
    },
    searchConsoleProperty: {
      count: async () => mockState.usablePropertyCount,
    },
    urlInspection: {
      findFirst: async () =>
        mockState.completedInspectionCount > 0 &&
        mockState.completedInspectionWebsiteId
          ? { websiteId: mockState.completedInspectionWebsiteId }
          : null,
    },
    website: {
      findFirst: async () =>
        mockState.activeWebsiteId ? { id: mockState.activeWebsiteId } : null,
    },
  },
}));

let DashboardPage: (typeof import("../app/(app)/dashboard/page"))["default"];

async function renderDashboardPage() {
  const page = await DashboardPage();

  return renderToStaticMarkup(page);
}

beforeAll(async () => {
  ({ default: DashboardPage } = await import("../app/(app)/dashboard/page"));
});

beforeEach(() => {
  mockState.googleAccountCount = 0;
  mockState.usablePropertyCount = 0;
  mockState.completedInspectionCount = 0;
  mockState.completedInspectionWebsiteId = "website-1";
  mockState.activeWebsiteId = "website-1";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("dashboard onboarding checklist", () => {
  it("appears when onboarding is incomplete", async () => {
    const markup = await renderDashboardPage();

    expect(markup).toContain("Welcome to IndexPilot");
    expect(markup).toContain("Complete these steps to inspect your first URL.");
    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-valuenow="0"');
  });

  it("still appears for incomplete users when dismissal is saved", async () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "true",
        setItem: () => undefined,
        removeItem: () => undefined,
      },
    });

    const markup = await renderDashboardPage();

    expect(markup).toContain("Welcome to IndexPilot");
    expect(markup).toContain("Complete these steps to inspect your first URL.");
    expect(markup).not.toContain("Setup complete");
  });

  it("marks the correct first incomplete step as current", async () => {
    mockState.googleAccountCount = 1;

    const markup = await renderDashboardPage();
    const propertyStepIndex = markup.indexOf("Choose a Search Console property");
    const currentStepIndex = markup.indexOf("Current step", propertyStepIndex);

    expect(propertyStepIndex).toBeGreaterThan(-1);
    expect(currentStepIndex).toBeGreaterThan(propertyStepIndex);
  });

  it("marks completed steps complete", async () => {
    mockState.googleAccountCount = 1;

    const markup = await renderDashboardPage();
    const googleStepIndex = markup.indexOf("Connect Google Search Console");
    const completedIndex = markup.indexOf("Completed", googleStepIndex);

    expect(googleStepIndex).toBeGreaterThan(-1);
    expect(completedIndex).toBeGreaterThan(googleStepIndex);
  });

  it("calculates progress with the shared three-step model", async () => {
    mockState.googleAccountCount = 1;
    mockState.usablePropertyCount = 1;

    const markup = await renderDashboardPage();

    expect(markup).toContain("67% complete");
    expect(markup).toContain('aria-valuenow="67"');
  });

  it("uses existing routes for checklist action links", async () => {
    const markup = await renderDashboardPage();

    expect(markup).toContain('href="/api/google/oauth/start"');
    expect(markup).toContain('href="/search-console/properties"');
    expect(markup).toContain('href="/websites/website-1/inspect"');
  });

  it("omits the inspect action when no active website route is available", async () => {
    mockState.activeWebsiteId = null;

    const markup = await renderDashboardPage();

    expect(markup).not.toContain("/websites/website-1/inspect");
    expect(markup).toContain("Inspect your first URL");
  });

  it("shows the completed state when all three steps are complete", async () => {
    mockState.googleAccountCount = 1;
    mockState.usablePropertyCount = 1;
    mockState.completedInspectionCount = 1;

    const markup = await renderDashboardPage();

    expect(markup).toContain("Setup complete");
    expect(markup).toContain("Your IndexPilot workspace is ready.");
    expect(markup).toContain(
      "You have connected Google Search Console, selected a property, and completed your first URL inspection."
    );
    expect(markup).toContain('href="/websites/website-1/inspections"');
    expect(markup).toContain('href="/websites/website-1/inspect"');
    expect(markup).toContain("View inspection history");
    expect(markup).toContain("Inspect another URL");
    expect(markup).toContain('aria-label="Dismiss setup complete message"');
    expect(markup).toContain('type="button"');
  });

  it("does not show the checklist at the same time as the completed state", async () => {
    mockState.googleAccountCount = 1;
    mockState.usablePropertyCount = 1;
    mockState.completedInspectionCount = 1;

    const markup = await renderDashboardPage();

    expect(markup).toContain("Your IndexPilot workspace is ready.");
    expect(markup).not.toContain(
      "Complete these steps to inspect your first URL."
    );
    expect(markup).not.toContain('role="progressbar"');
  });

  it("does not trigger the completed state for partial completion", async () => {
    mockState.googleAccountCount = 1;
    mockState.usablePropertyCount = 1;

    const markup = await renderDashboardPage();

    expect(markup).toContain("Welcome to IndexPilot");
    expect(markup).not.toContain("Setup complete");
    expect(markup).not.toContain("Your IndexPilot workspace is ready.");
  });

  it("keeps existing dashboard content present", async () => {
    const markup = await renderDashboardPage();

    expect(markup).toContain("Welcome to IndexPilot");
    expect(markup).toContain(
      "Inspect your first URL to begin building insights about how Google sees your website."
    );
    expect(markup).toContain('href="/websites/new"');
    expect(markup).toContain('href="/settings/google"');
  });

  it("keeps populated dashboard content present after completion", async () => {
    mockState.googleAccountCount = 1;
    mockState.usablePropertyCount = 1;
    mockState.completedInspectionCount = 1;

    const markup = await renderDashboardPage();

    expect(markup).toContain("Welcome to IndexPilot");
    expect(markup).toContain(
      "Inspect your first URL to begin building insights about how Google sees your website."
    );
    expect(markup).toContain('href="/websites/new"');
    expect(markup).toContain('href="/settings/google"');
  });
});
