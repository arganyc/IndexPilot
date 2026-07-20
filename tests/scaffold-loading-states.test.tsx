import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

type ScaffoldRoute = {
  name: string;
  loadLoading: () => Promise<{ default: React.ComponentType }>;
  loadPage: () => Promise<{ default: React.ComponentType }>;
  loadingText: string;
  pageLabel: string;
};

const routes: ScaffoldRoute[] = [
  {
    name: "URLs",
    loadLoading: () => import("../app/(app)/urls/loading"),
    loadPage: () => import("../app/(app)/urls/page"),
    loadingText: "Loading urls...",
    pageLabel: "URLs content",
  },
  {
    name: "Sitemaps",
    loadLoading: () => import("../app/(app)/sitemaps/loading"),
    loadPage: () => import("../app/(app)/sitemaps/page"),
    loadingText: "Loading sitemaps...",
    pageLabel: "Sitemaps content",
  },
  {
    name: "Inspections",
    loadLoading: () => import("../app/(app)/inspections/loading"),
    loadPage: () => import("../app/(app)/inspections/page"),
    loadingText: "Loading inspections...",
    pageLabel: "Inspections content",
  },
  {
    name: "Reports",
    loadLoading: () => import("../app/(app)/reports/loading"),
    loadPage: () => import("../app/(app)/reports/page"),
    loadingText: "Loading reports...",
    pageLabel: "Reports content",
  },
];

async function renderLoading(route: ScaffoldRoute) {
  const { default: Loading } = await route.loadLoading();

  return renderToStaticMarkup(<Loading />);
}

async function renderPage(route: ScaffoldRoute) {
  const { default: Page } = await route.loadPage();

  return renderToStaticMarkup(<Page />);
}

describe("top-level scaffold loading states", () => {
  it.each(routes)("renders loading UI for $name", async (route) => {
    const markup = await renderLoading(route);

    expect(markup).toContain(route.loadingText);
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("motion-safe:animate-pulse");
    expect(markup).toContain(`${route.name} content loading`);
  });

  it.each(routes)("replaces the $name skeleton with the scaffold page", async (route) => {
    const markup = await renderPage(route);

    expect(markup).toContain(route.pageLabel);
    expect(markup).not.toContain(route.loadingText);
    expect(markup).not.toContain("motion-safe:animate-pulse");
  });
});
