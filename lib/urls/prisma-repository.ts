import "server-only";

import type { PrismaClient } from "@/lib/generated/prisma/client";
import { getUrlInventoryOffset, type UrlInventoryRepository } from "@/lib/urls/inventory";

export function createPrismaUrlInventoryRepository(
  prisma: PrismaClient
): UrlInventoryRepository {
  return {
    getWebsite({ websiteId }) {
      return prisma.website.findUnique({
        where: { id: websiteId },
        select: { id: true, name: true, domain: true, status: true },
      });
    },
    listSourceSitemaps({ websiteId }) {
      return prisma.sitemap.findMany({
        where: { websiteId, urlRecords: { some: {} } },
        orderBy: { url: "asc" },
        select: { id: true, url: true },
      });
    },
    countUrlRecords({ websiteId, query }) {
      return prisma.urlRecord.count({
        where: createUrlRecordWhere(websiteId, query),
      });
    },
    listUrlRecords({ websiteId, query }) {
      return prisma.urlRecord.findMany({
        where: createUrlRecordWhere(websiteId, query),
        orderBy: [
          { [query.sort]: query.direction },
          { id: "asc" },
        ],
        skip: getUrlInventoryOffset(query),
        take: query.pageSize,
        select: {
          id: true,
          url: true,
          path: true,
          sitemapLastModifiedAt: true,
          firstDiscoveredAt: true,
          lastDiscoveredAt: true,
          sitemap: {
            select: { id: true, url: true },
          },
        },
      });
    },
    async getSummary({ websiteId, since }) {
      const [totalUrls, discoveredLast7Days, updatedLast7Days, sources] =
        await Promise.all([
          prisma.urlRecord.count({ where: { websiteId } }),
          prisma.urlRecord.count({
            where: { websiteId, firstDiscoveredAt: { gte: since } },
          }),
          prisma.urlRecord.count({
            where: { websiteId, lastDiscoveredAt: { gte: since } },
          }),
          prisma.urlRecord.findMany({
            where: { websiteId, sitemapId: { not: null } },
            distinct: ["sitemapId"],
            select: { sitemapId: true },
          }),
        ]);

      return {
        totalUrls,
        discoveredLast7Days,
        updatedLast7Days,
        sourceSitemaps: sources.length,
      };
    },
    getUrlDetails({ websiteId, urlId }) {
      return prisma.urlRecord.findFirst({
        where: { id: urlId, websiteId },
        select: {
          id: true,
          url: true,
          path: true,
          sitemapLastModifiedAt: true,
          firstDiscoveredAt: true,
          lastDiscoveredAt: true,
          createdAt: true,
          updatedAt: true,
          website: {
            select: { id: true, name: true, domain: true },
          },
          sitemap: {
            select: { id: true, url: true },
          },
        },
      });
    },
  };
}

function createUrlRecordWhere(
  websiteId: string,
  query: {
    search: string;
    sitemapId: string;
  }
) {
  return {
    websiteId,
    ...(query.sitemapId ? { sitemapId: query.sitemapId } : {}),
    ...(query.search
      ? {
          OR: [
            { url: { contains: query.search, mode: "insensitive" as const } },
            { path: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}
