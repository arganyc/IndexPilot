import { describe, expect, it } from "vitest";

import {
  type SitemapImportLogEntry,
  importUrlSetSitemap,
  type ExistingUrlRecord,
  type ImportUrlRecord,
  type SitemapImportRepository,
  type SitemapRecordForImport,
  type UpdateUrlRecord,
} from "../lib/sitemaps/importer";
import { getImportSummaryState } from "../lib/sitemaps/import-summary";
import type { SitemapFetchSuccess } from "../lib/sitemaps/fetcher";
import { normalizeAbsoluteUrl } from "../lib/sitemaps/url";

function textBytes(value: string) {
  return new TextEncoder().encode(value);
}

function urlSetXml(entries: Array<{ loc: string; lastmod?: string }>) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (entry) => `<url><loc>${entry.loc}</loc>${
      entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ""
    }</url>`
  )
  .join("\n")}
</urlset>`;
}

function sitemapIndexXml(children: string[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${children.map((child) => `<sitemap><loc>${child}</loc></sitemap>`).join("\n")}
</sitemapindex>`;
}

function fetchSuccess(url: string, rawBody: Uint8Array): SitemapFetchSuccess {
  return {
    ok: true,
    requestedUrl: url,
    finalUrl: url,
    httpStatus: 200,
    contentType: "application/xml",
    responseSize: rawBody.byteLength,
    redirectCount: 0,
    redirectChain: [],
    rawBody,
    fetchedAt: new Date("2026-07-18T12:00:00.000Z"),
    durationMs: 10,
    message: "Sitemap fetched successfully.",
  };
}

type FakeSitemap = SitemapRecordForImport & {
  status: string;
  type: string;
  parentSitemapId: string | null;
  urlCount: number;
  lastFetchedAt: Date | null;
  lastSuccessfulFetchAt: Date | null;
  lastError: string | null;
};

class FakeImportRepository implements SitemapImportRepository {
  websites = new Map([
    ["website-1", { id: "website-1", normalizedDomain: "example.com" }],
  ]);
  sitemaps = new Map<string, FakeSitemap>();
  urlRecords: Array<
    ExistingUrlRecord & {
      websiteId: string;
      sitemapId: string | null;
      url: string;
      path: string;
      lastDiscoveredAt: Date;
    }
  > = [];

  constructor(rootUrl = "https://example.com/sitemap.xml") {
    this.addSitemap({
      id: "sitemap-1",
      websiteId: "website-1",
      url: rootUrl,
      normalizedUrl: normalizeAbsoluteUrl(rootUrl).normalizedUrl,
      parentSitemapId: null,
    });
  }

  addSitemap(input: {
    id: string;
    websiteId: string;
    url: string;
    normalizedUrl: string;
    parentSitemapId: string | null;
  }) {
    this.sitemaps.set(input.id, {
      ...input,
      status: "PENDING",
      type: "UNKNOWN",
      urlCount: 0,
      lastFetchedAt: null,
      lastSuccessfulFetchAt: null,
      lastError: null,
    });
  }

  async getWebsite(websiteId: string) {
    return this.websites.get(websiteId) ?? null;
  }

  async getSitemap({
    websiteId,
    sitemapId,
  }: {
    websiteId: string;
    sitemapId: string;
  }) {
    const sitemap = this.sitemaps.get(sitemapId);
    return sitemap && sitemap.websiteId === websiteId ? sitemap : null;
  }

  async upsertChildSitemap({
    websiteId,
    url,
    normalizedUrl,
    parentSitemapId,
  }: {
    websiteId: string;
    url: string;
    normalizedUrl: string;
    parentSitemapId: string;
  }) {
    const existing = [...this.sitemaps.values()].find(
      (sitemap) =>
        sitemap.websiteId === websiteId && sitemap.normalizedUrl === normalizedUrl
    );

    if (existing) {
      existing.parentSitemapId = parentSitemapId;
      existing.url = url;
      return { sitemap: existing, created: false };
    }

    const sitemap: FakeSitemap = {
      id: `sitemap-${this.sitemaps.size + 1}`,
      websiteId,
      url,
      normalizedUrl,
      parentSitemapId,
      status: "PENDING",
      type: "UNKNOWN",
      urlCount: 0,
      lastFetchedAt: null,
      lastSuccessfulFetchAt: null,
      lastError: null,
    };
    this.sitemaps.set(sitemap.id, sitemap);

    return { sitemap, created: true };
  }

  async markSitemapFetching({
    websiteId,
    sitemapId,
    fetchedAt,
  }: {
    websiteId: string;
    sitemapId: string;
    fetchedAt: Date;
  }) {
    const sitemap = this.requireSitemap(websiteId, sitemapId);
    sitemap.status = "FETCHING";
    sitemap.lastFetchedAt = fetchedAt;
    sitemap.lastError = null;
  }

  async markSitemapImported({
    websiteId,
    sitemapId,
    fetchedAt,
    urlCount,
    type,
    lastError,
  }: {
    websiteId: string;
    sitemapId: string;
    fetchedAt: Date;
    urlCount: number;
    type: string;
    lastError?: string | null;
  }) {
    const sitemap = this.requireSitemap(websiteId, sitemapId);
    sitemap.status = "IMPORTED";
    sitemap.type = type;
    sitemap.urlCount = urlCount;
    sitemap.lastFetchedAt = fetchedAt;
    sitemap.lastSuccessfulFetchAt = fetchedAt;
    sitemap.lastError = lastError ?? null;
  }

  async markSitemapFailed({
    websiteId,
    sitemapId,
    fetchedAt,
    error,
    type,
  }: {
    websiteId: string;
    sitemapId: string;
    fetchedAt: Date;
    error: string;
    type?: string;
  }) {
    const sitemap = this.requireSitemap(websiteId, sitemapId);
    sitemap.status = "FAILED";
    sitemap.type = type ?? sitemap.type;
    sitemap.lastFetchedAt = fetchedAt;
    sitemap.lastError = error;
  }

  async findExistingUrlRecords({
    websiteId,
    normalizedUrls,
  }: {
    websiteId: string;
    normalizedUrls: string[];
  }) {
    return this.urlRecords.filter(
      (record) =>
        record.websiteId === websiteId &&
        normalizedUrls.includes(record.normalizedUrl)
    );
  }

  async persistUrlRecords({
    createRecords,
    updateRecords,
  }: {
    createRecords: ImportUrlRecord[];
    updateRecords: UpdateUrlRecord[];
  }) {
    let addedUrls = 0;

    for (const record of createRecords) {
      if (
        this.urlRecords.some(
          (existing) =>
            existing.websiteId === record.websiteId &&
            existing.normalizedUrl === record.normalizedUrl
        )
      ) {
        continue;
      }

      this.urlRecords.push({
        id: `url-${this.urlRecords.length + 1}`,
        websiteId: record.websiteId,
        sitemapId: record.sitemapId,
        url: record.url,
        normalizedUrl: record.normalizedUrl,
        path: record.path,
        sitemapLastModifiedAt: record.sitemapLastModifiedAt,
        firstDiscoveredAt: record.firstDiscoveredAt,
        lastDiscoveredAt: record.lastDiscoveredAt,
      });
      addedUrls += 1;
    }

    for (const update of updateRecords) {
      const record = this.urlRecords.find((candidate) => candidate.id === update.id);

      if (record) {
        record.sitemapId = update.sitemapId;
        record.lastDiscoveredAt = update.lastDiscoveredAt;

        if (update.sitemapLastModifiedAt) {
          record.sitemapLastModifiedAt = update.sitemapLastModifiedAt;
        }
      }
    }

    return {
      addedUrls,
      updatedUrls: updateRecords.length,
    };
  }

  private requireSitemap(websiteId: string, sitemapId: string) {
    const sitemap = this.sitemaps.get(sitemapId);

    if (!sitemap || sitemap.websiteId !== websiteId) {
      throw new Error("Missing sitemap");
    }

    return sitemap;
  }
}

function nowSequence(...dates: string[]) {
  let index = 0;
  return () => new Date(dates[Math.min(index++, dates.length - 1)]);
}

async function runImport({
  repository = new FakeImportRepository(),
  fetchMap = {
    "https://example.com/sitemap.xml": urlSetXml([
      { loc: "https://example.com/", lastmod: "2026-07-18" },
      { loc: "https://example.com/about" },
    ]),
  },
  now = nowSequence("2026-07-18T12:00:00.000Z", "2026-07-18T12:00:01.000Z"),
  maxDepth,
  maxSitemaps,
  maxUrls,
  logEntries = [],
}: {
  repository?: FakeImportRepository;
  fetchMap?: Record<string, string>;
  now?: () => Date;
  maxDepth?: number;
  maxSitemaps?: number;
  maxUrls?: number;
  logEntries?: SitemapImportLogEntry[];
} = {}) {
  const result = await importUrlSetSitemap({
    websiteId: "website-1",
    sitemapId: "sitemap-1",
    dependencies: {
      repository,
      fetcher: async ({ sitemapUrl }) => {
        const body = fetchMap[sitemapUrl];

        if (!body) {
          return {
            ok: false,
            code: "FETCH_FAILED",
            requestedUrl: sitemapUrl,
            finalUrl: sitemapUrl,
            redirectCount: 0,
            redirectChain: [],
            fetchedAt: new Date("2026-07-18T12:00:00.000Z"),
            durationMs: 1,
            message: "Mock fetch failed.",
          };
        }

        return fetchSuccess(sitemapUrl, textBytes(body));
      },
      now,
      logger: async (entry) => {
        logEntries.push(entry);
      },
      ...(maxDepth !== undefined ? { maxDepth } : {}),
      ...(maxSitemaps !== undefined ? { maxSitemaps } : {}),
      ...(maxUrls !== undefined ? { maxUrls } : {}),
    },
  });

  return { result, repository, logEntries };
}

describe("recursive sitemap import persistence", () => {
  it("imports a simple URL set", async () => {
    const { result, repository } = await runImport();

    expect(result.success).toBe(true);
    expect(result.addedUrls).toBe(2);
    expect(result.importedUrlSets).toBe(1);
    expect(repository.urlRecords).toHaveLength(2);
  });

  it("imports one sitemap index with two URL-set children", async () => {
    const { result, repository } = await runImport({
      fetchMap: {
        "https://example.com/sitemap.xml": sitemapIndexXml([
          "https://example.com/a.xml",
          "https://example.com/b.xml",
        ]),
        "https://example.com/a.xml": urlSetXml([
          { loc: "https://example.com/a-1" },
          { loc: "https://example.com/a-2" },
        ]),
        "https://example.com/b.xml": urlSetXml([
          { loc: "https://example.com/b-1" },
          { loc: "https://example.com/b-2" },
        ]),
      },
    });

    expect(result.success).toBe(true);
    expect(result.processedSitemaps).toBe(3);
    expect(result.createdSitemaps).toBe(2);
    expect(result.importedSitemaps).toBe(3);
    expect(result.importedUrlSets).toBe(2);
    expect(result.importedUrls).toBe(4);
    expect(result.addedUrls).toBe(4);
    expect(repository.sitemaps.get("sitemap-1")?.urlCount).toBe(4);
  });

  it("supports nested sitemap indexes", async () => {
    const { result, repository } = await runImport({
      fetchMap: {
        "https://example.com/sitemap.xml": sitemapIndexXml([
          "https://example.com/nested.xml",
        ]),
        "https://example.com/nested.xml": sitemapIndexXml([
          "https://example.com/deep.xml",
        ]),
        "https://example.com/deep.xml": urlSetXml([
          { loc: "https://example.com/deep-page" },
        ]),
      },
    });

    expect(result.success).toBe(true);
    expect(result.processedSitemaps).toBe(3);
    expect(repository.urlRecords).toHaveLength(1);
    expect(repository.sitemaps.get("sitemap-1")?.urlCount).toBe(1);
  });

  it("handles duplicate child sitemap references once", async () => {
    const { result, repository } = await runImport({
      fetchMap: {
        "https://example.com/sitemap.xml": sitemapIndexXml([
          "https://example.com/child.xml",
          "https://www.example.com/child.xml/",
        ]),
        "https://example.com/child.xml": urlSetXml([
          { loc: "https://example.com/child-page" },
        ]),
      },
    });

    expect(result.success).toBe(true);
    expect(result.createdSitemaps).toBe(1);
    expect(result.processedSitemaps).toBe(2);
    expect(repository.sitemaps.size).toBe(2);
    expect(result.warnings.join(" ")).toContain("duplicate sitemap entry");
  });

  it("prevents circular sitemap references", async () => {
    const { result } = await runImport({
      fetchMap: {
        "https://example.com/sitemap.xml": sitemapIndexXml([
          "https://example.com/child-index.xml",
        ]),
        "https://example.com/child-index.xml": sitemapIndexXml([
          "https://example.com/sitemap.xml",
          "https://example.com/child-urlset.xml",
        ]),
        "https://example.com/child-urlset.xml": urlSetXml([
          { loc: "https://example.com/page" },
        ]),
      },
    });

    expect(result.success).toBe(true);
    expect(result.addedUrls).toBe(1);
    expect(result.warnings.join(" ")).toContain("circular");
  });

  it("enforces the recursion-depth limit", async () => {
    const { result } = await runImport({
      maxDepth: 1,
      fetchMap: {
        "https://example.com/sitemap.xml": sitemapIndexXml([
          "https://example.com/level-1.xml",
        ]),
        "https://example.com/level-1.xml": sitemapIndexXml([
          "https://example.com/level-2.xml",
        ]),
        "https://example.com/level-2.xml": urlSetXml([
          { loc: "https://example.com/too-deep" },
        ]),
      },
    });

    expect(result.success).toBe(false);
    expect(result.limitReached).toBe(true);
    expect(result.warnings.join(" ")).toContain("depth limit");
  });

  it("enforces the sitemap-file limit", async () => {
    const { result } = await runImport({
      maxSitemaps: 2,
      fetchMap: {
        "https://example.com/sitemap.xml": sitemapIndexXml([
          "https://example.com/a.xml",
          "https://example.com/b.xml",
        ]),
        "https://example.com/a.xml": urlSetXml([
          { loc: "https://example.com/a" },
        ]),
        "https://example.com/b.xml": urlSetXml([
          { loc: "https://example.com/b" },
        ]),
      },
    });

    expect(result.success).toBe(true);
    expect(result.limitReached).toBe(true);
    expect(result.processedSitemaps).toBe(2);
    expect(result.addedUrls).toBe(1);
  });

  it("continues when one child fails and one child succeeds", async () => {
    const { result, repository } = await runImport({
      fetchMap: {
        "https://example.com/sitemap.xml": sitemapIndexXml([
          "https://example.com/fail.xml",
          "https://example.com/success.xml",
        ]),
        "https://example.com/fail.xml": "<not-sitemap></not-sitemap>",
        "https://example.com/success.xml": urlSetXml([
          { loc: "https://example.com/success" },
        ]),
      },
    });

    expect(result.success).toBe(true);
    expect(result.failedSitemaps).toBe(1);
    expect(result.addedUrls).toBe(1);
    expect(repository.sitemaps.get("sitemap-1")?.status).toBe("IMPORTED");
  });

  it("marks the parent failed when all children fail", async () => {
    const { result, repository } = await runImport({
      fetchMap: {
        "https://example.com/sitemap.xml": sitemapIndexXml([
          "https://example.com/fail-a.xml",
          "https://example.com/fail-b.xml",
        ]),
        "https://example.com/fail-a.xml": "<not-sitemap></not-sitemap>",
        "https://example.com/fail-b.xml": "<not-sitemap></not-sitemap>",
      },
    });

    expect(result.success).toBe(false);
    expect(result.failedSitemaps).toBeGreaterThanOrEqual(2);
    expect(repository.sitemaps.get("sitemap-1")?.status).toBe("FAILED");
  });

  it("is idempotent on re-import", async () => {
    const repository = new FakeImportRepository();
    await runImport({ repository });
    const second = await runImport({
      repository,
      now: nowSequence(
        "2026-07-19T12:00:00.000Z",
        "2026-07-19T12:00:01.000Z"
      ),
    });

    expect(second.result.success).toBe(true);
    expect(second.result.addedUrls).toBe(0);
    expect(second.result.updatedUrls).toBe(2);
    expect(repository.urlRecords).toHaveLength(2);
  });

  it("persists parent-child relationships", async () => {
    const { repository } = await runImport({
      fetchMap: {
        "https://example.com/sitemap.xml": sitemapIndexXml([
          "https://example.com/child.xml",
        ]),
        "https://example.com/child.xml": urlSetXml([
          { loc: "https://example.com/child-page" },
        ]),
      },
    });
    const child = [...repository.sitemaps.values()].find(
      (sitemap) => sitemap.normalizedUrl === "https://example.com/child.xml"
    );

    expect(child?.parentSitemapId).toBe("sitemap-1");
  });

  it("sets an accurate parent urlCount", async () => {
    const { repository } = await runImport({
      fetchMap: {
        "https://example.com/sitemap.xml": sitemapIndexXml([
          "https://example.com/a.xml",
          "https://example.com/b.xml",
        ]),
        "https://example.com/a.xml": urlSetXml([
          { loc: "https://example.com/shared" },
          { loc: "https://example.com/a" },
        ]),
        "https://example.com/b.xml": urlSetXml([
          { loc: "https://example.com/shared" },
          { loc: "https://example.com/b" },
        ]),
      },
    });

    expect(repository.sitemaps.get("sitemap-1")?.urlCount).toBe(3);
  });

  it("rejects cross-domain child sitemaps", async () => {
    const { result } = await runImport({
      fetchMap: {
        "https://example.com/sitemap.xml": sitemapIndexXml([
          "https://other.example.net/child.xml",
        ]),
      },
    });

    expect(result.success).toBe(false);
    expect(result.warnings.join(" ")).toContain("cross-domain");
  });

  it("returns an accurate recursive import summary", async () => {
    const { result } = await runImport({
      fetchMap: {
        "https://example.com/sitemap.xml": sitemapIndexXml([
          "https://example.com/a.xml",
          "https://example.com/b.xml",
        ]),
        "https://example.com/a.xml": urlSetXml([
          { loc: "https://example.com/a" },
        ]),
        "https://example.com/b.xml": "<not-sitemap></not-sitemap>",
      },
    });

    expect(result).toMatchObject({
      success: true,
      processedSitemaps: 3,
      createdSitemaps: 2,
      importedSitemaps: 2,
      importedUrlSets: 1,
      failedSitemaps: 1,
      importedUrls: 1,
      addedUrls: 1,
      updatedUrls: 0,
      limitReached: false,
    });
  });

  it("enforces the maximum discovered URL limit", async () => {
    const { result, repository } = await runImport({
      maxUrls: 2,
      fetchMap: {
        "https://example.com/sitemap.xml": urlSetXml([
          { loc: "https://example.com/a" },
          { loc: "https://example.com/b" },
          { loc: "https://example.com/c" },
        ]),
      },
    });

    expect(result.success).toBe(true);
    expect(result.addedUrls).toBe(2);
    expect(result.skippedUrls).toBe(1);
    expect(result.limitReached).toBe(true);
    expect(result.limitsReached).toContain("Discovered URL limit reached.");
    expect(repository.urlRecords).toHaveLength(2);
  });

  it("marks invalid XML as a sitemap failure without throwing", async () => {
    const { result, repository } = await runImport({
      fetchMap: {
        "https://example.com/sitemap.xml": "<urlset><url></urlset>",
      },
    });

    expect(result.success).toBe(false);
    expect(result.failedSitemaps).toBe(1);
    expect(repository.sitemaps.get("sitemap-1")?.status).toBe("FAILED");
  });

  it("handles timeout results as failed sitemap imports", async () => {
    const repository = new FakeImportRepository();
    const result = await importUrlSetSitemap({
      websiteId: "website-1",
      sitemapId: "sitemap-1",
      dependencies: {
        repository,
        fetcher: async ({ sitemapUrl }) => ({
          ok: false,
          code: "TIMEOUT",
          requestedUrl: sitemapUrl,
          finalUrl: sitemapUrl,
          redirectCount: 0,
          redirectChain: [],
          fetchedAt: new Date("2026-07-18T12:00:00.000Z"),
          durationMs: 15_000,
          message: "The sitemap fetch timed out.",
        }),
      },
    });

    expect(result.success).toBe(false);
    expect(result.errors[0]).toBe("The sitemap fetch timed out.");
    expect(repository.sitemaps.get("sitemap-1")?.status).toBe("FAILED");
  });

  it("handles thrown fetch failures safely", async () => {
    const repository = new FakeImportRepository();
    const result = await importUrlSetSitemap({
      websiteId: "website-1",
      sitemapId: "sitemap-1",
      dependencies: {
        repository,
        fetcher: async () => {
          throw new Error("secret network detail");
        },
      },
    });

    expect(result.success).toBe(false);
    expect(result.errors[0]).toBe("The sitemap could not be fetched.");
    expect(result.errors.join(" ")).not.toContain("secret");
  });

  it("keeps persisted data unchanged when URL persistence fails", async () => {
    const repository = new FakeImportRepository();
    repository.persistUrlRecords = async () => {
      throw new Error("database unavailable");
    };

    const { result } = await runImport({ repository });

    expect(result.success).toBe(false);
    expect(result.failedSitemaps).toBe(1);
    expect(repository.urlRecords).toHaveLength(0);
    expect(repository.sitemaps.get("sitemap-1")?.status).toBe("FAILED");
  });

  it("logs import start and finish without raw XML", async () => {
    const logEntries: SitemapImportLogEntry[] = [];
    const { result } = await runImport({ logEntries });

    expect(result.success).toBe(true);
    expect(logEntries).toHaveLength(2);
    expect(logEntries.map((entry) => entry.status)).toEqual([
      "STARTED",
      "FINISHED",
    ]);
    expect(JSON.stringify(logEntries)).not.toContain("<urlset");
  });

  it("generates import summary state", () => {
    const summary = getImportSummaryState({
      success: true,
      warnings: ["One child sitemap failed."],
      errors: [],
      limitReached: true,
    });

    expect(summary).toEqual({
      title: "Import successful",
      tone: "warning",
      hasWarnings: true,
      hasErrors: false,
      limitLabel: "Reached",
    });
  });
});
