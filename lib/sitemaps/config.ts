export type SitemapImportLimits = {
  maxRecursionDepth: number;
  maxSitemapFiles: number;
  maxDiscoveredUrls: number;
  maxRedirects: number;
  fetchTimeoutMs: number;
  maxResponseBytes: number;
  maxXmlDepth: number;
  maxXmlNodes: number;
};

export const SITEMAP_IMPORT_LIMITS: SitemapImportLimits = {
  maxRecursionDepth: 5,
  maxSitemapFiles: 100,
  maxDiscoveredUrls: 50_000,
  maxRedirects: 5,
  fetchTimeoutMs: 15_000,
  maxResponseBytes: 20 * 1024 * 1024,
  maxXmlDepth: 50,
  maxXmlNodes: 250_000,
};

export function resolveSitemapImportLimits(
  overrides: Partial<SitemapImportLimits> = {}
): SitemapImportLimits {
  return {
    ...SITEMAP_IMPORT_LIMITS,
    ...overrides,
  };
}
