import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { parseSitemap } from "../lib/sitemaps/parser";

const fixturesPath = path.join(__dirname, "fixtures");

function fixture(name: string) {
  return readFileSync(path.join(fixturesPath, name));
}

function parseXmlFixture(name: string, sourceUrl = "https://example.com/sitemap.xml") {
  return parseSitemap({
    rawBody: new Uint8Array(fixture(name)),
    contentType: "application/xml",
    sourceUrl,
  });
}

describe("sitemap XML parser", () => {
  it("parses a basic sitemap index", () => {
    const result = parseXmlFixture("sitemap-index.xml");

    expect(result.detectedType).toBe("SITEMAP_INDEX");
    expect(result.itemCount).toBe(2);
    expect(result.items[0]).toEqual({
      loc: "https://example.com/post-sitemap.xml",
      lastmod: "2026-07-18",
    });
  });

  it("parses a basic URL set", () => {
    const result = parseXmlFixture("url-set.xml");

    expect(result.detectedType).toBe("URL_SET");
    expect(result.itemCount).toBe(2);
    expect(result.items[0]).toEqual({
      loc: "https://example.com/",
      lastmod: "2026-07-18",
      changefreq: "daily",
      priority: 0.8,
    });
  });

  it("supports XML namespaces", () => {
    const result = parseXmlFixture("namespaced.xml");

    expect(result.detectedType).toBe("URL_SET");
    expect(result.itemCount).toBe(1);
    expect(result.items[0].loc).toBe("https://example.com/namespaced");
  });

  it("supports optional lastmod, changefreq, and priority", () => {
    const result = parseXmlFixture("url-set.xml");

    expect(result.detectedType).toBe("URL_SET");
    expect(result.items[1]).toEqual({ loc: "https://example.com/about" });
  });

  it("returns invalid for malformed XML", () => {
    const result = parseXmlFixture("malformed.xml");

    expect(result.detectedType).toBe("INVALID");
    expect(result.errors.map((error) => error.code)).toContain("MALFORMED_XML");
  });

  it("warns and skips missing loc entries", () => {
    const result = parseXmlFixture("invalid-entries.xml");

    expect(result.warnings.map((warning) => warning.code)).toContain("MISSING_LOC");
  });

  it("warns and skips invalid URLs", () => {
    const result = parseXmlFixture("invalid-entries.xml");

    expect(result.warnings.map((warning) => warning.code)).toContain("INVALID_URL");
  });

  it("warns and skips duplicate entries", () => {
    const result = parseXmlFixture("duplicate-entries.xml");

    expect(result.detectedType).toBe("URL_SET");
    expect(result.itemCount).toBe(1);
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "DUPLICATE_ENTRY"
    );
  });

  it("warns on invalid lastmod dates", () => {
    const result = parseXmlFixture("invalid-entries.xml");

    expect(result.warnings.map((warning) => warning.code)).toContain(
      "INVALID_LASTMOD"
    );
  });

  it("warns on invalid priority values", () => {
    const result = parseXmlFixture("invalid-entries.xml");

    expect(result.warnings.map((warning) => warning.code)).toContain(
      "INVALID_PRIORITY"
    );
  });

  it("returns invalid for an empty sitemap", () => {
    const result = parseSitemap({
      rawBody: new TextEncoder().encode("<urlset></urlset>"),
      contentType: "application/xml",
      sourceUrl: "https://example.com/sitemap.xml",
    });

    expect(result.detectedType).toBe("INVALID");
    expect(result.errors.map((error) => error.code)).toContain("EMPTY_SITEMAP");
  });

  it("returns invalid for unsupported root elements", () => {
    const result = parseSitemap({
      rawBody: new TextEncoder().encode("<rss><channel /></rss>"),
      contentType: "application/xml",
      sourceUrl: "https://example.com/sitemap.xml",
    });

    expect(result.detectedType).toBe("INVALID");
    expect(result.errors.map((error) => error.code)).toContain(
      "UNSUPPORTED_ROOT"
    );
  });
});

describe("sitemap gzip parser", () => {
  it("detects gzip by content type", () => {
    const result = parseSitemap({
      rawBody: gzipSync(fixture("url-set.xml")),
      contentType: "application/gzip",
      sourceUrl: "https://example.com/sitemap.xml",
    });

    expect(result.detectedType).toBe("URL_SET");
    expect(result.compressed).toBe(true);
  });

  it("detects gzip by file extension", () => {
    const result = parseSitemap({
      rawBody: gzipSync(fixture("url-set.xml")),
      contentType: "application/octet-stream",
      sourceUrl: "https://example.com/sitemap.xml.gz",
    });

    expect(result.detectedType).toBe("URL_SET");
    expect(result.compressed).toBe(true);
  });

  it("detects gzip by magic bytes", () => {
    const result = parseSitemap({
      rawBody: new Uint8Array(
        Buffer.from(fixture("gzip-sitemap.xml.gz.base64").toString(), "base64")
      ),
      contentType: "application/octet-stream",
      sourceUrl: "https://example.com/sitemap.xml",
    });

    expect(result.detectedType).toBe("URL_SET");
    expect(result.compressed).toBe(true);
  });

  it("rejects oversized decompressed content", () => {
    const result = parseSitemap({
      rawBody: gzipSync(new TextEncoder().encode("<urlset></urlset>")),
      contentType: "application/gzip",
      sourceUrl: "https://example.com/sitemap.xml.gz",
      maxUncompressedBytes: 5,
    });

    expect(result.detectedType).toBe("INVALID");
    expect(result.errors.map((error) => error.code)).toContain(
      "DECOMPRESSED_TOO_LARGE"
    );
  });

  it("rejects invalid gzip", () => {
    const result = parseSitemap({
      rawBody: new TextEncoder().encode("not gzip"),
      contentType: "application/gzip",
      sourceUrl: "https://example.com/sitemap.xml.gz",
    });

    expect(result.detectedType).toBe("INVALID");
    expect(result.errors.map((error) => error.code)).toContain(
      "DECOMPRESSION_FAILED"
    );
  });
});

describe("sitemap XML security protections", () => {
  it("rejects external entity declarations", () => {
    const result = parseSitemap({
      rawBody: new TextEncoder().encode(`<!DOCTYPE foo [
        <!ENTITY xxe SYSTEM "file:///etc/passwd">
      ]><urlset><url><loc>&xxe;</loc></url></urlset>`),
      contentType: "application/xml",
      sourceUrl: "https://example.com/sitemap.xml",
    });

    expect(result.detectedType).toBe("INVALID");
    expect(result.errors.map((error) => error.code)).toContain("UNSAFE_XML");
  });

  it("rejects entity expansion declarations", () => {
    const result = parseSitemap({
      rawBody: new TextEncoder().encode(`<!DOCTYPE foo [
        <!ENTITY a "aaaaaaaaaa">
        <!ENTITY b "&a;&a;&a;&a;">
      ]><urlset><url><loc>https://example.com/&b;</loc></url></urlset>`),
      contentType: "application/xml",
      sourceUrl: "https://example.com/sitemap.xml",
    });

    expect(result.detectedType).toBe("INVALID");
    expect(result.errors.map((error) => error.code)).toContain("UNSAFE_XML");
  });

  it("enforces maximum depth", () => {
    const result = parseSitemap({
      rawBody: new TextEncoder().encode(
        "<urlset><url><a><b><c><loc>https://example.com/</loc></c></b></a></url></urlset>"
      ),
      contentType: "application/xml",
      sourceUrl: "https://example.com/sitemap.xml",
      maxDepth: 4,
    });

    expect(result.detectedType).toBe("INVALID");
    expect(result.errors.map((error) => error.code)).toContain(
      "MAX_DEPTH_EXCEEDED"
    );
  });

  it("returns safe warnings and errors", () => {
    const result = parseXmlFixture("invalid-entries.xml");
    const messages = [...result.warnings, ...result.errors].map(
      (issue) => issue.message
    );

    expect(messages.join(" ")).not.toContain("Error:");
    expect(messages.join(" ")).not.toContain("stack");
  });
});
