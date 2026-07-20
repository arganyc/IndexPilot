import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../lib/generated/prisma/client";
import { normalizeAbsoluteUrl } from "../lib/sitemaps/url";
import { normalizeDomain } from "../lib/websites/domain";

const demoWebsites = [
  "Washingtonista.com",
  "UsDentistsDirectory.com",
  "DMVMoldRemoval.com",
  "ArniesAppliance.com",
  "Larriy.com",
  "Ageless.nyc",
  "BaylinerBoatCovers.com",
];

const demoSitemaps = [
  {
    websiteDomain: "Washingtonista.com",
    url: "https://washingtonista.com/sitemap.xml",
    type: "INDEX" as const,
    children: [
      {
        url: "https://washingtonista.com/post-sitemap.xml",
        type: "URL_SET" as const,
        urls: [
          "https://washingtonista.com/",
          "https://washingtonista.com/about/",
          "https://washingtonista.com/contact/",
        ],
      },
    ],
  },
  {
    websiteDomain: "UsDentistsDirectory.com",
    url: "https://www.usdentistsdirectory.com/sitemap.xml",
    type: "INDEX" as const,
    children: [
      {
        url: "https://www.usdentistsdirectory.com/sitemap-static.xml",
        type: "URL_SET" as const,
        urls: [
          "https://www.usdentistsdirectory.com/",
          "https://www.usdentistsdirectory.com/for-dentists/google-business-profile-strategy",
          "https://www.usdentistsdirectory.com/tools/dental-cancellation-loss-calculator",
        ],
      },
    ],
  },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to seed the database.");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  for (const domain of demoWebsites) {
    const { normalizedDomain, protocol } = normalizeDomain(domain);

    await prisma.website.upsert({
      where: { normalizedDomain },
      update: {
        name: domain,
        domain: normalizedDomain,
        protocol,
        notes: "Demo data for Website Manager.",
      },
      create: {
        name: domain,
        domain: normalizedDomain,
        normalizedDomain,
        protocol,
        platform: "OTHER",
        priority: "MEDIUM",
        status: "ACTIVE",
        notes: "Demo data for Website Manager.",
      },
    });
  }

  for (const demoSitemap of demoSitemaps) {
    const { normalizedDomain } = normalizeDomain(demoSitemap.websiteDomain);
    const website = await prisma.website.findUniqueOrThrow({
      where: { normalizedDomain },
      select: { id: true },
    });
    const normalizedParent = normalizeAbsoluteUrl(demoSitemap.url);
    const parentSitemap = await prisma.sitemap.upsert({
      where: {
        websiteId_normalizedUrl: {
          websiteId: website.id,
          normalizedUrl: normalizedParent.normalizedUrl,
        },
      },
      update: {
        url: normalizedParent.normalizedUrl,
        type: demoSitemap.type,
        status: "IMPORTED",
        lastFetchedAt: new Date("2026-07-18T00:00:00.000Z"),
        lastSuccessfulFetchAt: new Date("2026-07-18T00:00:00.000Z"),
        lastError: null,
      },
      create: {
        websiteId: website.id,
        url: normalizedParent.normalizedUrl,
        normalizedUrl: normalizedParent.normalizedUrl,
        type: demoSitemap.type,
        status: "IMPORTED",
        lastFetchedAt: new Date("2026-07-18T00:00:00.000Z"),
        lastSuccessfulFetchAt: new Date("2026-07-18T00:00:00.000Z"),
      },
    });

    for (const child of demoSitemap.children) {
      const normalizedChild = normalizeAbsoluteUrl(child.url);
      const childSitemap = await prisma.sitemap.upsert({
        where: {
          websiteId_normalizedUrl: {
            websiteId: website.id,
            normalizedUrl: normalizedChild.normalizedUrl,
          },
        },
        update: {
          url: normalizedChild.normalizedUrl,
          type: child.type,
          status: "IMPORTED",
          parentSitemapId: parentSitemap.id,
          urlCount: child.urls.length,
          lastFetchedAt: new Date("2026-07-18T00:00:00.000Z"),
          lastSuccessfulFetchAt: new Date("2026-07-18T00:00:00.000Z"),
          lastError: null,
        },
        create: {
          websiteId: website.id,
          url: normalizedChild.normalizedUrl,
          normalizedUrl: normalizedChild.normalizedUrl,
          type: child.type,
          status: "IMPORTED",
          parentSitemapId: parentSitemap.id,
          urlCount: child.urls.length,
          lastFetchedAt: new Date("2026-07-18T00:00:00.000Z"),
          lastSuccessfulFetchAt: new Date("2026-07-18T00:00:00.000Z"),
        },
      });

      for (const url of child.urls) {
        const normalizedUrl = normalizeAbsoluteUrl(url);

        await prisma.urlRecord.upsert({
          where: {
            websiteId_normalizedUrl: {
              websiteId: website.id,
              normalizedUrl: normalizedUrl.normalizedUrl,
            },
          },
          update: {
            sitemapId: childSitemap.id,
            url: normalizedUrl.normalizedUrl,
            path: normalizedUrl.path,
            lastDiscoveredAt: new Date("2026-07-18T00:00:00.000Z"),
          },
          create: {
            websiteId: website.id,
            sitemapId: childSitemap.id,
            url: normalizedUrl.normalizedUrl,
            normalizedUrl: normalizedUrl.normalizedUrl,
            path: normalizedUrl.path,
            firstDiscoveredAt: new Date("2026-07-18T00:00:00.000Z"),
            lastDiscoveredAt: new Date("2026-07-18T00:00:00.000Z"),
          },
        });
      }
    }
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
