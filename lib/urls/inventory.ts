import "server-only";

export const urlInventorySortValues = [
  "url",
  "firstDiscoveredAt",
  "lastDiscoveredAt",
  "sitemapLastModifiedAt",
] as const;

export const urlInventoryPageSizeValues = [10, 25, 50, 100] as const;

export type UrlInventorySort = (typeof urlInventorySortValues)[number];
export type UrlInventoryPageSize = (typeof urlInventoryPageSizeValues)[number];
export type UrlInventoryDirection = "asc" | "desc";

export type WebsiteForUrlInventory = {
  id: string;
  name: string;
  domain: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
};

export type SourceSitemapOption = {
  id: string;
  url: string;
};

export type UrlInventoryQuery = {
  search: string;
  sitemapId: string;
  sort: UrlInventorySort;
  direction: UrlInventoryDirection;
  page: number;
  pageSize: UrlInventoryPageSize;
};

export type UrlInventoryItem = {
  id: string;
  url: string;
  path: string;
  sitemapLastModifiedAt: Date | null;
  firstDiscoveredAt: Date;
  lastDiscoveredAt: Date;
  sitemap: SourceSitemapOption | null;
};

export type UrlInventorySummary = {
  totalUrls: number;
  discoveredLast7Days: number;
  updatedLast7Days: number;
  sourceSitemaps: number;
};

export type UrlInventoryPageData = {
  website: WebsiteForUrlInventory;
  sourceSitemaps: SourceSitemapOption[];
  urls: UrlInventoryItem[];
  summary: UrlInventorySummary;
  query: UrlInventoryQuery;
  totalResults: number;
  totalPages: number;
};

export type UrlDetails = UrlInventoryItem & {
  website: Pick<WebsiteForUrlInventory, "id" | "name" | "domain">;
  createdAt: Date;
  updatedAt: Date;
};

export type UrlInventoryRepository = {
  getWebsite: (input: {
    websiteId: string;
    organizationId?: string;
  }) => Promise<WebsiteForUrlInventory | null>;
  listSourceSitemaps: (input: {
    websiteId: string;
  }) => Promise<SourceSitemapOption[]>;
  countUrlRecords: (input: {
    websiteId: string;
    query: UrlInventoryQuery;
  }) => Promise<number>;
  listUrlRecords: (input: {
    websiteId: string;
    query: UrlInventoryQuery;
  }) => Promise<UrlInventoryItem[]>;
  getSummary: (input: {
    websiteId: string;
    since: Date;
  }) => Promise<UrlInventorySummary>;
  getUrlDetails: (input: {
    websiteId: string;
    urlId: string;
  }) => Promise<UrlDetails | null>;
};

export type UrlInventorySearchParams = {
  q?: string | string[];
  sitemapId?: string | string[];
  sort?: string | string[];
  dir?: string | string[];
  page?: string | string[];
  pageSize?: string | string[];
};

export function parseUrlInventoryQuery(
  searchParams: UrlInventorySearchParams
): UrlInventoryQuery {
  const sort = firstParam(searchParams.sort);
  const direction = firstParam(searchParams.dir);
  const page = Number.parseInt(firstParam(searchParams.page) ?? "", 10);
  const pageSize = Number.parseInt(firstParam(searchParams.pageSize) ?? "", 10);

  return {
    search: (firstParam(searchParams.q) ?? "").trim(),
    sitemapId: (firstParam(searchParams.sitemapId) ?? "").trim(),
    sort: isUrlInventorySort(sort) ? sort : "lastDiscoveredAt",
    direction: direction === "asc" ? "asc" : "desc",
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: isUrlInventoryPageSize(pageSize) ? pageSize : 25,
  };
}

export async function getUrlInventoryPageData({
  websiteId,
  organizationId,
  searchParams,
  repository,
  now = () => new Date(),
}: {
  websiteId: string;
  organizationId?: string;
  searchParams: UrlInventorySearchParams;
  repository: UrlInventoryRepository;
  now?: () => Date;
}): Promise<UrlInventoryPageData | null> {
  const website = await repository.getWebsite({ websiteId, organizationId });

  if (!website) {
    return null;
  }

  const query = parseUrlInventoryQuery(searchParams);
  const since = new Date(now().getTime() - 7 * 24 * 60 * 60 * 1000);
  const [sourceSitemaps, summary, totalResults] = await Promise.all([
    repository.listSourceSitemaps({ websiteId }),
    repository.getSummary({ websiteId, since }),
    repository.countUrlRecords({ websiteId, query }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalResults / query.pageSize));
  const boundedQuery = {
    ...query,
    page: Math.min(query.page, totalPages),
  };
  const urls = await repository.listUrlRecords({
    websiteId,
    query: boundedQuery,
  });

  return {
    website,
    sourceSitemaps,
    urls,
    summary,
    query: boundedQuery,
    totalResults,
    totalPages,
  };
}

export async function getUrlDetailsForWebsite({
  websiteId,
  urlId,
  repository,
}: {
  websiteId: string;
  urlId: string;
  repository: UrlInventoryRepository;
}) {
  const website = await repository.getWebsite({ websiteId });

  if (!website) {
    return null;
  }

  return repository.getUrlDetails({ websiteId, urlId });
}

export function getUrlInventoryOffset(query: UrlInventoryQuery) {
  return (query.page - 1) * query.pageSize;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isUrlInventorySort(
  value: string | undefined
): value is UrlInventorySort {
  return urlInventorySortValues.includes(value as UrlInventorySort);
}

function isUrlInventoryPageSize(value: number): value is UrlInventoryPageSize {
  return urlInventoryPageSizeValues.includes(value as UrlInventoryPageSize);
}
