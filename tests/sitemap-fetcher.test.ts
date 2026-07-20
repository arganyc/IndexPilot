import { describe, expect, it } from "vitest";

import {
  fetchSitemap,
  isSafePublicIp,
  validateUrlHost,
  type FetchUrl,
  type ResolveHostname,
} from "../lib/sitemaps/fetcher";
import { getSitemapFetchUpdateData } from "../lib/sitemaps/fetch-updates";

const publicResolver: ResolveHostname = async () => [
  { address: "93.184.216.34", family: 4 },
];

function xmlResponse(body = "<?xml version=\"1.0\"?><urlset></urlset>") {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}

function fetchSequence(responses: Response[]): FetchUrl {
  let index = 0;

  return async () => {
    const response = responses[index];
    index += 1;

    if (!response) {
      throw new Error("Unexpected fetch call");
    }

    return response;
  };
}

describe("secure sitemap fetch URL validation", () => {
  it("allows HTTP URLs", async () => {
    const result = await fetchSitemap({
      websiteId: "website-1",
      sitemapUrl: "http://example.com/sitemap.xml",
      options: { resolveHostname: publicResolver, fetchUrl: async () => xmlResponse() },
    });

    expect(result.ok).toBe(true);
  });

  it("allows HTTPS URLs", async () => {
    const result = await fetchSitemap({
      websiteId: "website-1",
      sitemapUrl: "https://example.com/sitemap.xml",
      options: { resolveHostname: publicResolver, fetchUrl: async () => xmlResponse() },
    });

    expect(result.ok).toBe(true);
  });

  it("blocks localhost", async () => {
    const result = await fetchSitemap({
      websiteId: "website-1",
      sitemapUrl: "http://localhost/sitemap.xml",
      options: { resolveHostname: publicResolver, fetchUrl: async () => xmlResponse() },
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.code).toBe("UNSAFE_HOST");
  });

  it("blocks 127.0.0.1", () => {
    expect(isSafePublicIp("127.0.0.1")).toBe(false);
  });

  it("blocks ::1", () => {
    expect(isSafePublicIp("::1")).toBe(false);
  });

  it("blocks private IPv4", () => {
    expect(isSafePublicIp("10.0.0.2")).toBe(false);
    expect(isSafePublicIp("172.16.0.2")).toBe(false);
    expect(isSafePublicIp("192.168.1.2")).toBe(false);
  });

  it("blocks private IPv6", () => {
    expect(isSafePublicIp("fc00::1")).toBe(false);
    expect(isSafePublicIp("fd12:3456::1")).toBe(false);
  });

  it("blocks metadata IP addresses", () => {
    expect(isSafePublicIp("169.254.169.254")).toBe(false);
    expect(isSafePublicIp("100.100.100.200")).toBe(false);
  });

  it("blocks unsupported protocols", async () => {
    const result = await fetchSitemap({
      websiteId: "website-1",
      sitemapUrl: "ftp://example.com/sitemap.xml",
      options: { resolveHostname: publicResolver, fetchUrl: async () => xmlResponse() },
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.code).toBe("INVALID_URL");
  });

  it("allows safe public hostnames after DNS validation", async () => {
    await expect(
      validateUrlHost(new URL("https://example.com/sitemap.xml"), publicResolver)
    ).resolves.toEqual({ ok: true });
  });
});

describe("secure sitemap fetch redirects and limits", () => {
  it("blocks redirects to private addresses", async () => {
    const result = await fetchSitemap({
      websiteId: "website-1",
      sitemapUrl: "https://example.com/sitemap.xml",
      options: {
        resolveHostname: async (hostname) =>
          hostname === "example.com"
            ? [{ address: "93.184.216.34", family: 4 }]
            : [{ address: "127.0.0.1", family: 4 }],
        fetchUrl: fetchSequence([
          new Response(null, {
            status: 302,
            headers: { location: "http://127.0.0.1/sitemap.xml" },
          }),
        ]),
      },
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.code).toBe("UNSAFE_HOST");
  });

  it("detects redirect loops", async () => {
    const result = await fetchSitemap({
      websiteId: "website-1",
      sitemapUrl: "https://example.com/a.xml",
      options: {
        resolveHostname: publicResolver,
        fetchUrl: fetchSequence([
          new Response(null, {
            status: 302,
            headers: { location: "https://example.com/b.xml" },
          }),
          new Response(null, {
            status: 302,
            headers: { location: "https://example.com/a.xml" },
          }),
        ]),
      },
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.code).toBe("REDIRECT_LOOP");
  });

  it("enforces redirect limits", async () => {
    const result = await fetchSitemap({
      websiteId: "website-1",
      sitemapUrl: "https://example.com/a.xml",
      options: {
        maxRedirects: 1,
        resolveHostname: publicResolver,
        fetchUrl: fetchSequence([
          new Response(null, {
            status: 302,
            headers: { location: "https://example.com/b.xml" },
          }),
          new Response(null, {
            status: 302,
            headers: { location: "https://example.com/c.xml" },
          }),
        ]),
      },
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.code).toBe("REDIRECT_LIMIT");
  });

  it("handles timeout errors safely", async () => {
    const abortError = new DOMException("secret timeout stack", "AbortError");
    const result = await fetchSitemap({
      websiteId: "website-1",
      sitemapUrl: "https://example.com/sitemap.xml",
      options: {
        resolveHostname: publicResolver,
        fetchUrl: async () => {
          throw abortError;
        },
      },
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.code).toBe("TIMEOUT");
    expect(result.message).not.toContain("secret");
  });

  it("enforces response size limits", async () => {
    const result = await fetchSitemap({
      websiteId: "website-1",
      sitemapUrl: "https://example.com/sitemap.xml",
      options: {
        maxBytes: 10,
        resolveHostname: publicResolver,
        fetchUrl: async () => xmlResponse("<?xml version=\"1.0\"?><urlset></urlset>"),
      },
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.code).toBe("RESPONSE_TOO_LARGE");
  });
});

describe("secure sitemap fetch response validation", () => {
  it("accepts XML content types", async () => {
    const result = await fetchSitemap({
      websiteId: "website-1",
      sitemapUrl: "https://example.com/sitemap.xml",
      options: { resolveHostname: publicResolver, fetchUrl: async () => xmlResponse() },
    });

    expect(result.ok).toBe(true);
    expect(result.contentType).toBe("application/xml");
  });

  it("rejects misleading HTML responses", async () => {
    const result = await fetchSitemap({
      websiteId: "website-1",
      sitemapUrl: "https://example.com/sitemap.xml",
      options: {
        resolveHostname: publicResolver,
        fetchUrl: async () =>
          new Response("<!doctype html><html><body>Error</body></html>", {
            status: 200,
            headers: { "content-type": "application/xml" },
          }),
      },
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.code).toBe("UNSUPPORTED_CONTENT");
  });

  it("returns safe error messages", async () => {
    const result = await fetchSitemap({
      websiteId: "website-1",
      sitemapUrl: "https://example.com/sitemap.xml",
      options: {
        resolveHostname: publicResolver,
        fetchUrl: async () => {
          throw new Error("database-password=secret");
        },
      },
    });

    expect(result.ok).toBe(false);
    expect(result.message).toBe("The sitemap could not be fetched.");
    expect(result.message).not.toContain("secret");
  });
});

describe("sitemap fetch record updates", () => {
  it("builds timestamp updates after success", () => {
    const fetchedAt = new Date("2026-07-18T12:00:00.000Z");
    const update = getSitemapFetchUpdateData({
      ok: true,
      requestedUrl: "https://example.com/sitemap.xml",
      finalUrl: "https://example.com/sitemap.xml",
      httpStatus: 200,
      contentType: "application/xml",
      responseSize: 20,
      redirectCount: 0,
      redirectChain: [],
      rawBody: new Uint8Array(),
      fetchedAt,
      durationMs: 10,
      message: "Sitemap fetched successfully.",
    });

    expect(update).toEqual({
      lastFetchedAt: fetchedAt,
      lastSuccessfulFetchAt: fetchedAt,
      lastError: null,
    });
  });

  it("builds error updates after failure", () => {
    const fetchedAt = new Date("2026-07-18T12:00:00.000Z");
    const update = getSitemapFetchUpdateData({
      ok: false,
      code: "UNSAFE_HOST",
      requestedUrl: "http://localhost/sitemap.xml",
      finalUrl: "http://localhost/sitemap.xml",
      redirectCount: 0,
      redirectChain: [],
      fetchedAt,
      durationMs: 10,
      message: "The sitemap host is not allowed.",
    });

    expect(update).toEqual({
      lastFetchedAt: fetchedAt,
      lastError: "The sitemap host is not allowed.",
    });
  });
});
