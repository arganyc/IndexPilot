import { describe, expect, it } from "vitest";

import { sitemapFormSchema } from "../lib/sitemaps/validation";

const validSitemap = {
  url: "https://example.com/sitemap.xml",
  type: "INDEX",
  parentSitemapId: "",
};

describe("sitemap form validation", () => {
  it("accepts a valid manual sitemap form", () => {
    expect(sitemapFormSchema.safeParse(validSitemap).success).toBe(true);
  });

  it("requires a sitemap URL", () => {
    const result = sitemapFormSchema.safeParse({
      ...validSitemap,
      url: "",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.url?.[0]).toBe(
      "Sitemap URL is required."
    );
  });

  it("requires an absolute sitemap URL", () => {
    const result = sitemapFormSchema.safeParse({
      ...validSitemap,
      url: "/sitemap.xml",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.url?.[0]).toBe(
      "Enter a valid absolute sitemap URL."
    );
  });

  it("requires a valid sitemap type", () => {
    const result = sitemapFormSchema.safeParse({
      ...validSitemap,
      type: "RSS",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.type?.[0]).toBeTruthy();
  });
});
