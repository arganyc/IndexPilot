import type { SitemapFetchResult } from "@/lib/sitemaps/fetcher";

export type SitemapFetchUpdateData =
  | {
      lastFetchedAt: Date;
      lastSuccessfulFetchAt: Date;
      lastError: null;
    }
  | {
      lastFetchedAt: Date;
      lastError: string;
    };

export function getSitemapFetchUpdateData(
  result: SitemapFetchResult
): SitemapFetchUpdateData {
  if (result.ok) {
    return {
      lastFetchedAt: result.fetchedAt,
      lastSuccessfulFetchAt: result.fetchedAt,
      lastError: null,
    };
  }

  return {
    lastFetchedAt: result.fetchedAt,
    lastError: result.message.slice(0, 500),
  };
}
