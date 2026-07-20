type ExistingSitemap = {
  id: string;
};

type SitemapLookup = (input: {
  websiteId: string;
  normalizedUrl: string;
}) => Promise<ExistingSitemap | null>;

export async function getDuplicateSitemapMessage({
  websiteId,
  normalizedUrl,
  currentSitemapId,
  findSitemapByNormalizedUrl,
}: {
  websiteId: string;
  normalizedUrl: string;
  currentSitemapId?: string;
  findSitemapByNormalizedUrl: SitemapLookup;
}) {
  const existingSitemap = await findSitemapByNormalizedUrl({
    websiteId,
    normalizedUrl,
  });

  if (!existingSitemap || existingSitemap.id === currentSitemapId) {
    return null;
  }

  return "A sitemap with this URL already exists for this website.";
}

export function isValidParentSitemap({
  sitemapId,
  parentSitemapId,
  childSitemapIds,
}: {
  sitemapId: string;
  parentSitemapId?: string | null;
  childSitemapIds: string[];
}) {
  if (!parentSitemapId) {
    return true;
  }

  return parentSitemapId !== sitemapId && !childSitemapIds.includes(parentSitemapId);
}
