import { describe, expect, it } from "vitest";

import { normalizeInspectionUrl } from "../lib/url-inspections/url";
import {
  completedUrlInspectionResultSchema,
  createUrlInspectionSchema,
  failedUrlInspectionResultSchema,
  hasDuplicateActiveInspection,
  prepareUrlInspectionCreateData,
  updateUrlInspectionStatusSchema,
} from "../lib/url-inspections/validation";

const baseCreateInput = {
  organizationId: "org-1",
  websiteId: "website-1",
  searchConsolePropertyId: "property-1",
  inspectedUrl: "HTTPS://Example.com:443/path/#section",
};

describe("URL inspection validation foundation", () => {
  it("prepares data for creating an inspection record", () => {
    const data = prepareUrlInspectionCreateData(baseCreateInput);

    expect(data).toMatchObject({
      organizationId: "org-1",
      websiteId: "website-1",
      searchConsolePropertyId: "property-1",
      inspectedUrl: "HTTPS://Example.com:443/path/#section",
      normalizedUrl: "https://example.com/path",
      status: "PENDING",
    });
  });

  it("allows an optional UrlRecord relationship", () => {
    expect(
      createUrlInspectionSchema.parse({
        ...baseCreateInput,
        urlRecordId: null,
      }).urlRecordId
    ).toBeNull();
    expect(createUrlInspectionSchema.parse(baseCreateInput).urlRecordId).toBeUndefined();
  });

  it("requires an organization relationship", () => {
    expect(() =>
      createUrlInspectionSchema.parse({ ...baseCreateInput, organizationId: "" })
    ).toThrow("Organization is required.");
  });

  it("requires a website relationship", () => {
    expect(() =>
      createUrlInspectionSchema.parse({ ...baseCreateInput, websiteId: "" })
    ).toThrow("Website is required.");
  });

  it("requires a Search Console property relationship", () => {
    expect(() =>
      createUrlInspectionSchema.parse({
        ...baseCreateInput,
        searchConsolePropertyId: "",
      })
    ).toThrow("Search Console property is required.");
  });

  it("validates inspection status enum values", () => {
    expect(
      updateUrlInspectionStatusSchema.parse({
        id: "inspection-1",
        organizationId: "org-1",
        status: "RUNNING",
      }).status
    ).toBe("RUNNING");
    expect(() =>
      updateUrlInspectionStatusSchema.parse({
        id: "inspection-1",
        organizationId: "org-1",
        status: "ARCHIVED",
      })
    ).toThrow();
  });

  it("normalizes URLs without dropping meaningful query parameters", () => {
    const result = normalizeInspectionUrl(
      "HTTP://WWW.Example.com:80/products/?utm_source=test&id=10#reviews"
    );

    expect(result.normalizedUrl).toBe(
      "http://www.example.com/products?utm_source=test&id=10"
    );
    expect(result.path).toBe("/products");
  });

  it("accepts completed result fields", () => {
    const completedAt = new Date("2026-07-18T12:00:00.000Z");
    const result = completedUrlInspectionResultSchema.parse({
      id: "inspection-1",
      organizationId: "org-1",
      completedAt,
      status: "COMPLETED",
      inspectionResultLink: "https://search.google.com/search-console",
      verdict: "PASS",
      coverageState: "Submitted and indexed",
      indexingState: "INDEXING_ALLOWED",
      robotsTxtState: "ALLOWED",
      pageFetchState: "SUCCESSFUL",
      googleCanonical: "https://example.com/products",
      userCanonical: "https://example.com/products",
      lastCrawlTime: completedAt,
      crawledAs: "MOBILE",
      referringUrls: ["https://example.com/category"],
      sitemapUrls: ["https://example.com/sitemap.xml"],
      rawResponse: { inspectionResult: { verdict: "PASS" } },
    });

    expect(result.status).toBe("COMPLETED");
    expect(result.referringUrls).toEqual(["https://example.com/category"]);
    expect(result.rawResponse).toEqual({ inspectionResult: { verdict: "PASS" } });
  });

  it("accepts failed result fields", () => {
    const result = failedUrlInspectionResultSchema.parse({
      id: "inspection-1",
      organizationId: "org-1",
      completedAt: new Date("2026-07-18T12:00:00.000Z"),
      status: "FAILED",
      errorCode: "GOOGLE_API_ERROR",
      errorMessage: "Google URL Inspection request failed.",
      rawResponse: { error: { code: 500 } },
    });

    expect(result.status).toBe("FAILED");
    expect(result.errorCode).toBe("GOOGLE_API_ERROR");
    expect(result.rawResponse).toEqual({ error: { code: 500 } });
  });

  it("allows JSON storage fields on completed results", () => {
    const result = completedUrlInspectionResultSchema.parse({
      id: "inspection-1",
      organizationId: "org-1",
      completedAt: new Date("2026-07-18T12:00:00.000Z"),
      status: "COMPLETED",
      referringUrls: ["https://example.com/a", "https://example.com/b"],
      sitemapUrls: ["https://example.com/sitemap.xml"],
      rawResponse: {
        nested: {
          arrays: [1, 2, 3],
        },
      },
    });

    expect(result.referringUrls).toHaveLength(2);
    expect(result.sitemapUrls).toEqual(["https://example.com/sitemap.xml"]);
    expect(result.rawResponse).toEqual({ nested: { arrays: [1, 2, 3] } });
  });

  it("detects duplicate active inspections by service rule", () => {
    const inspections = [
      {
        organizationId: "org-1",
        searchConsolePropertyId: "property-1",
        normalizedUrl: "https://example.com/products",
        status: "RUNNING" as const,
      },
      {
        organizationId: "org-1",
        searchConsolePropertyId: "property-1",
        normalizedUrl: "https://example.com/products",
        status: "COMPLETED" as const,
      },
    ];

    expect(
      hasDuplicateActiveInspection({
        inspections,
        organizationId: "org-1",
        searchConsolePropertyId: "property-1",
        normalizedUrl: "https://example.com/products",
      })
    ).toBe(true);
    expect(
      hasDuplicateActiveInspection({
        inspections,
        organizationId: "org-2",
        searchConsolePropertyId: "property-1",
        normalizedUrl: "https://example.com/products",
      })
    ).toBe(false);
  });
});
