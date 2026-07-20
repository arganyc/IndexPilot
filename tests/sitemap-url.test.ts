import { describe, expect, it } from "vitest";

import {
  isValidAbsoluteUrl,
  normalizeAbsoluteUrl,
} from "../lib/sitemaps/url";

describe("sitemap URL validation", () => {
  it("normalizes sitemap URLs before saving", () => {
    expect(
      normalizeAbsoluteUrl("https://www.Example.com/sitemap.xml#top")
    ).toEqual({
      normalizedUrl: "https://example.com/sitemap.xml",
      path: "/sitemap.xml",
    });
  });

  it("sorts query parameters and removes trailing slashes", () => {
    expect(
      normalizeAbsoluteUrl("https://example.com/sitemap/?b=2&a=1")
    ).toEqual({
      normalizedUrl: "https://example.com/sitemap?a=1&b=2",
      path: "/sitemap",
    });
  });

  it("requires absolute HTTP or HTTPS URLs", () => {
    expect(isValidAbsoluteUrl("https://example.com/sitemap.xml")).toBe(true);
    expect(isValidAbsoluteUrl("/sitemap.xml")).toBe(false);
    expect(isValidAbsoluteUrl("ftp://example.com/sitemap.xml")).toBe(false);
    expect(isValidAbsoluteUrl("not a url")).toBe(false);
  });
});
