import { describe, expect, it } from "vitest";

import { isValidParentSitemap } from "../lib/sitemaps/duplicates";

describe("parent-child sitemap relationships", () => {
  it("allows a sitemap with no parent", () => {
    expect(
      isValidParentSitemap({
        sitemapId: "child",
        parentSitemapId: null,
        childSitemapIds: [],
      })
    ).toBe(true);
  });

  it("allows assigning an unrelated sitemap as parent", () => {
    expect(
      isValidParentSitemap({
        sitemapId: "child",
        parentSitemapId: "parent",
        childSitemapIds: ["grandchild"],
      })
    ).toBe(true);
  });

  it("prevents a sitemap from becoming its own parent", () => {
    expect(
      isValidParentSitemap({
        sitemapId: "child",
        parentSitemapId: "child",
        childSitemapIds: [],
      })
    ).toBe(false);
  });

  it("prevents assigning a direct child as parent", () => {
    expect(
      isValidParentSitemap({
        sitemapId: "parent",
        parentSitemapId: "child",
        childSitemapIds: ["child"],
      })
    ).toBe(false);
  });
});
