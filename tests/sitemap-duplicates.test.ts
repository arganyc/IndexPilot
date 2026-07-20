import { describe, expect, it } from "vitest";

import { getDuplicateSitemapMessage } from "../lib/sitemaps/duplicates";

describe("duplicate sitemap prevention", () => {
  it("returns a clear message when a sitemap URL already exists for a website", async () => {
    await expect(
      getDuplicateSitemapMessage({
        websiteId: "website-1",
        normalizedUrl: "https://example.com/sitemap.xml",
        findSitemapByNormalizedUrl: async () => ({ id: "sitemap-1" }),
      })
    ).resolves.toBe(
      "A sitemap with this URL already exists for this website."
    );
  });

  it("allows the current sitemap to keep its URL", async () => {
    await expect(
      getDuplicateSitemapMessage({
        websiteId: "website-1",
        normalizedUrl: "https://example.com/sitemap.xml",
        currentSitemapId: "sitemap-1",
        findSitemapByNormalizedUrl: async () => ({ id: "sitemap-1" }),
      })
    ).resolves.toBeNull();
  });

  it("allows unused sitemap URLs", async () => {
    await expect(
      getDuplicateSitemapMessage({
        websiteId: "website-1",
        normalizedUrl: "https://example.com/sitemap.xml",
        findSitemapByNormalizedUrl: async () => null,
      })
    ).resolves.toBeNull();
  });
});
