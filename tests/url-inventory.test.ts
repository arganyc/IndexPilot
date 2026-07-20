import { describe, expect, it } from "vitest";

import {
  getUrlDetailsForWebsite,
  getUrlInventoryPageData,
  type SourceSitemapOption,
  type UrlDetails,
  type UrlInventoryItem,
  type UrlInventoryQuery,
  type UrlInventoryRepository,
  type WebsiteForUrlInventory,
} from "../lib/urls/inventory";

type FakeRecord = UrlInventoryItem & {
  websiteId: string;
  createdAt: Date;
  updatedAt: Date;
};

const baseNow = new Date("2026-07-18T12:00:00.000Z");
const website: WebsiteForUrlInventory = {
  id: "website-1",
  name: "Example",
  domain: "example.com",
  status: "ACTIVE",
};
const otherWebsite: WebsiteForUrlInventory = {
  id: "website-2",
  name: "Other",
  domain: "other.com",
  status: "ACTIVE",
};
const sitemapA: SourceSitemapOption = {
  id: "sitemap-a",
  url: "https://example.com/sitemap-a.xml",
};
const sitemapB: SourceSitemapOption = {
  id: "sitemap-b",
  url: "https://example.com/sitemap-b.xml",
};

function daysAgo(days: number) {
  return new Date(baseNow.getTime() - days * 24 * 60 * 60 * 1000);
}

function createRepository({
  websites = [website, otherWebsite],
  records = createRecords(),
}: {
  websites?: WebsiteForUrlInventory[];
  records?: FakeRecord[];
} = {}): UrlInventoryRepository {
  return {
    async getWebsite({ websiteId }) {
      return websites.find((item) => item.id === websiteId) ?? null;
    },
    async listSourceSitemaps({ websiteId }) {
      const sitemaps = new Map<string, SourceSitemapOption>();

      for (const record of records) {
        if (record.websiteId === websiteId && record.sitemap) {
          sitemaps.set(record.sitemap.id, record.sitemap);
        }
      }

      return [...sitemaps.values()].sort((a, b) => a.url.localeCompare(b.url));
    },
    async countUrlRecords({ websiteId, query }) {
      return filterRecords(records, websiteId, query).length;
    },
    async listUrlRecords({ websiteId, query }) {
      return filterRecords(records, websiteId, query)
        .sort((a, b) => compareRecords(a, b, query))
        .slice((query.page - 1) * query.pageSize, query.page * query.pageSize)
        .map(stripWebsiteId);
    },
    async getSummary({ websiteId, since }) {
      const scoped = records.filter((record) => record.websiteId === websiteId);
      const sourceSitemaps = new Set(
        scoped
          .map((record) => record.sitemap?.id)
          .filter((id): id is string => Boolean(id))
      );

      return {
        totalUrls: scoped.length,
        discoveredLast7Days: scoped.filter(
          (record) => record.firstDiscoveredAt >= since
        ).length,
        updatedLast7Days: scoped.filter(
          (record) => record.lastDiscoveredAt >= since
        ).length,
        sourceSitemaps: sourceSitemaps.size,
      };
    },
    async getUrlDetails({ websiteId, urlId }) {
      const record = records.find(
        (item) => item.websiteId === websiteId && item.id === urlId
      );

      if (!record) {
        return null;
      }

      const parentWebsite = websites.find((item) => item.id === websiteId);

      if (!parentWebsite) {
        return null;
      }

      return {
        ...stripWebsiteId(record),
        website: {
          id: parentWebsite.id,
          name: parentWebsite.name,
          domain: parentWebsite.domain,
        },
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      } satisfies UrlDetails;
    },
  };
}

function createRecords(): FakeRecord[] {
  return [
    {
      id: "url-1",
      websiteId: "website-1",
      url: "https://example.com/about",
      path: "/about",
      sitemap: sitemapA,
      sitemapLastModifiedAt: daysAgo(3),
      firstDiscoveredAt: daysAgo(10),
      lastDiscoveredAt: daysAgo(1),
      createdAt: daysAgo(10),
      updatedAt: daysAgo(1),
    },
    {
      id: "url-2",
      websiteId: "website-1",
      url: "https://example.com/contact",
      path: "/contact",
      sitemap: sitemapA,
      sitemapLastModifiedAt: daysAgo(2),
      firstDiscoveredAt: daysAgo(5),
      lastDiscoveredAt: daysAgo(2),
      createdAt: daysAgo(5),
      updatedAt: daysAgo(2),
    },
    {
      id: "url-3",
      websiteId: "website-1",
      url: "https://example.com/services/mold-removal",
      path: "/services/mold-removal",
      sitemap: sitemapB,
      sitemapLastModifiedAt: daysAgo(20),
      firstDiscoveredAt: daysAgo(30),
      lastDiscoveredAt: daysAgo(8),
      createdAt: daysAgo(30),
      updatedAt: daysAgo(8),
    },
    {
      id: "url-4",
      websiteId: "website-2",
      url: "https://other.com/about",
      path: "/about",
      sitemap: null,
      sitemapLastModifiedAt: null,
      firstDiscoveredAt: daysAgo(1),
      lastDiscoveredAt: daysAgo(1),
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
  ];
}

function filterRecords(
  records: FakeRecord[],
  websiteId: string,
  query: UrlInventoryQuery
) {
  const search = query.search.toLowerCase();

  return records.filter((record) => {
    if (record.websiteId !== websiteId) {
      return false;
    }

    if (query.sitemapId && record.sitemap?.id !== query.sitemapId) {
      return false;
    }

    if (!search) {
      return true;
    }

    return (
      record.url.toLowerCase().includes(search) ||
      record.path.toLowerCase().includes(search)
    );
  });
}

function compareRecords(
  a: FakeRecord,
  b: FakeRecord,
  query: UrlInventoryQuery
) {
  const direction = query.direction === "asc" ? 1 : -1;
  const left = sortableValue(a, query.sort);
  const right = sortableValue(b, query.sort);

  if (left < right) {
    return -1 * direction;
  }

  if (left > right) {
    return 1 * direction;
  }

  return a.id.localeCompare(b.id);
}

function sortableValue(
  record: FakeRecord,
  sort: UrlInventoryQuery["sort"]
) {
  if (sort === "url") {
    return record.url;
  }

  return record[sort]?.getTime() ?? 0;
}

function stripWebsiteId(record: FakeRecord): UrlInventoryItem {
  return {
    id: record.id,
    url: record.url,
    path: record.path,
    sitemap: record.sitemap,
    sitemapLastModifiedAt: record.sitemapLastModifiedAt,
    firstDiscoveredAt: record.firstDiscoveredAt,
    lastDiscoveredAt: record.lastDiscoveredAt,
  };
}

describe("URL inventory", () => {
  it("returns URL inventory query data scoped to the selected website", async () => {
    const data = await getUrlInventoryPageData({
      websiteId: "website-1",
      searchParams: {},
      repository: createRepository(),
      now: () => baseNow,
    });

    expect(data?.summary.totalUrls).toBe(3);
    expect(data?.sourceSitemaps).toHaveLength(2);
    expect(data?.urls.map((record) => record.id)).not.toContain("url-4");
  });

  it("searches by URL", async () => {
    const data = await getUrlInventoryPageData({
      websiteId: "website-1",
      searchParams: { q: "contact" },
      repository: createRepository(),
      now: () => baseNow,
    });

    expect(data?.totalResults).toBe(1);
    expect(data?.urls[0]?.url).toBe("https://example.com/contact");
  });

  it("searches by path", async () => {
    const data = await getUrlInventoryPageData({
      websiteId: "website-1",
      searchParams: { q: "/services" },
      repository: createRepository(),
      now: () => baseNow,
    });

    expect(data?.totalResults).toBe(1);
    expect(data?.urls[0]?.path).toBe("/services/mold-removal");
  });

  it("filters by source sitemap", async () => {
    const data = await getUrlInventoryPageData({
      websiteId: "website-1",
      searchParams: { sitemapId: "sitemap-b" },
      repository: createRepository(),
      now: () => baseNow,
    });

    expect(data?.totalResults).toBe(1);
    expect(data?.urls[0]?.sitemap?.id).toBe("sitemap-b");
  });

  it("sorts by URL", async () => {
    const data = await getUrlInventoryPageData({
      websiteId: "website-1",
      searchParams: { sort: "url", dir: "asc" },
      repository: createRepository(),
      now: () => baseNow,
    });

    expect(data?.urls.map((record) => record.path)).toEqual([
      "/about",
      "/contact",
      "/services/mold-removal",
    ]);
  });

  it("sorts by first discovered date", async () => {
    const data = await getUrlInventoryPageData({
      websiteId: "website-1",
      searchParams: { sort: "firstDiscoveredAt", dir: "desc" },
      repository: createRepository(),
      now: () => baseNow,
    });

    expect(data?.urls[0]?.id).toBe("url-2");
  });

  it("sorts by last discovered date", async () => {
    const data = await getUrlInventoryPageData({
      websiteId: "website-1",
      searchParams: { sort: "lastDiscoveredAt", dir: "desc" },
      repository: createRepository(),
      now: () => baseNow,
    });

    expect(data?.urls[0]?.id).toBe("url-1");
  });

  it("sorts by sitemap lastmod", async () => {
    const data = await getUrlInventoryPageData({
      websiteId: "website-1",
      searchParams: { sort: "sitemapLastModifiedAt", dir: "asc" },
      repository: createRepository(),
      now: () => baseNow,
    });

    expect(data?.urls[0]?.id).toBe("url-3");
  });

  it("paginates URL inventory results", async () => {
    const records = Array.from({ length: 12 }, (_, index) => ({
      id: `url-page-${index + 1}`,
      websiteId: "website-1",
      url: `https://example.com/page-${String(index + 1).padStart(2, "0")}`,
      path: `/page-${String(index + 1).padStart(2, "0")}`,
      sitemap: sitemapA,
      sitemapLastModifiedAt: daysAgo(index),
      firstDiscoveredAt: daysAgo(index),
      lastDiscoveredAt: daysAgo(index),
      createdAt: daysAgo(index),
      updatedAt: daysAgo(index),
    }));
    const data = await getUrlInventoryPageData({
      websiteId: "website-1",
      searchParams: { sort: "url", dir: "asc", pageSize: "10", page: "2" },
      repository: createRepository({ records }),
      now: () => baseNow,
    });

    expect(data?.totalPages).toBe(2);
    expect(data?.urls).toHaveLength(2);
    expect(data?.urls[0]?.id).toBe("url-page-11");
  });

  it("returns an empty-state friendly result when no URLs exist", async () => {
    const data = await getUrlInventoryPageData({
      websiteId: "website-1",
      searchParams: {},
      repository: createRepository({ records: [] }),
      now: () => baseNow,
    });

    expect(data?.summary.totalUrls).toBe(0);
    expect(data?.totalResults).toBe(0);
    expect(data?.urls).toEqual([]);
  });

  it("rejects inventory access when the website is unavailable", async () => {
    const data = await getUrlInventoryPageData({
      websiteId: "missing",
      searchParams: {},
      repository: createRepository(),
      now: () => baseNow,
    });

    expect(data).toBeNull();
  });

  it("allows URL details access for records on the selected website", async () => {
    const details = await getUrlDetailsForWebsite({
      websiteId: "website-1",
      urlId: "url-1",
      repository: createRepository(),
    });

    expect(details?.id).toBe("url-1");
    expect(details?.website.id).toBe("website-1");
  });

  it("prevents access to a URL from another website", async () => {
    const details = await getUrlDetailsForWebsite({
      websiteId: "website-1",
      urlId: "url-4",
      repository: createRepository(),
    });

    expect(details).toBeNull();
  });
});
