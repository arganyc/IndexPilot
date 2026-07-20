import "server-only";

import { performance } from "node:perf_hooks";

import type { PrismaClient } from "@/lib/generated/prisma/client";
import {
  resolveSitemapImportLimits,
  SITEMAP_IMPORT_LIMITS,
  type SitemapImportLimits,
} from "@/lib/sitemaps/config";
import type { SitemapFetchResult } from "@/lib/sitemaps/fetcher";
import { fetchSitemap } from "@/lib/sitemaps/fetcher";
import type {
  SitemapIndexItem,
  SitemapParseResult,
  SitemapUrlItem,
} from "@/lib/sitemaps/parser";
import { parseSitemap } from "@/lib/sitemaps/parser";
import { normalizeAbsoluteUrl } from "@/lib/sitemaps/url";

export const SITEMAP_IMPORT_MAX_DEPTH =
  SITEMAP_IMPORT_LIMITS.maxRecursionDepth;
export const SITEMAP_IMPORT_MAX_FILES = SITEMAP_IMPORT_LIMITS.maxSitemapFiles;
export const SITEMAP_IMPORT_MAX_URLS =
  SITEMAP_IMPORT_LIMITS.maxDiscoveredUrls;

export type SitemapImportType = "INDEX" | "URL_SET" | "UNKNOWN";

export type SitemapImportResult = {
  success: boolean;
  processedSitemaps: number;
  createdSitemaps: number;
  importedSitemaps: number;
  importedUrlSets: number;
  failedSitemaps: number;
  importedUrls: number;
  addedUrls: number;
  updatedUrls: number;
  skippedUrls: number;
  invalidUrlsSkipped: number;
  duplicateUrlsSkipped: number;
  warnings: string[];
  errors: string[];
  limitReached: boolean;
  limitsReached: string[];
  durationMs: number;
};

export type ExistingUrlRecord = {
  id: string;
  normalizedUrl: string;
  sitemapLastModifiedAt: Date | null;
  firstDiscoveredAt: Date;
};

export type ImportUrlRecord = {
  websiteId: string;
  sitemapId: string;
  url: string;
  normalizedUrl: string;
  path: string;
  sitemapLastModifiedAt: Date | null;
  firstDiscoveredAt: Date;
  lastDiscoveredAt: Date;
};

export type UpdateUrlRecord = {
  id: string;
  sitemapId: string;
  lastDiscoveredAt: Date;
  sitemapLastModifiedAt?: Date;
};

export type SitemapRecordForImport = {
  id: string;
  websiteId: string;
  url: string;
  normalizedUrl: string;
};

export type SitemapImportRepository = {
  getWebsite: (
    websiteId: string
  ) => Promise<{ id: string; normalizedDomain: string } | null>;
  getSitemap: (input: {
    websiteId: string;
    sitemapId: string;
  }) => Promise<SitemapRecordForImport | null>;
  upsertChildSitemap: (input: {
    websiteId: string;
    url: string;
    normalizedUrl: string;
    parentSitemapId: string;
  }) => Promise<{ sitemap: SitemapRecordForImport; created: boolean }>;
  markSitemapFetching: (input: {
    websiteId: string;
    sitemapId: string;
    fetchedAt: Date;
  }) => Promise<void>;
  markSitemapImported: (input: {
    websiteId: string;
    sitemapId: string;
    fetchedAt: Date;
    urlCount: number;
    type: SitemapImportType;
    lastError?: string | null;
  }) => Promise<void>;
  markSitemapFailed: (input: {
    websiteId: string;
    sitemapId: string;
    fetchedAt: Date;
    error: string;
    type?: SitemapImportType;
  }) => Promise<void>;
  findExistingUrlRecords: (input: {
    websiteId: string;
    normalizedUrls: string[];
  }) => Promise<ExistingUrlRecord[]>;
  persistUrlRecords: (input: {
    createRecords: ImportUrlRecord[];
    updateRecords: UpdateUrlRecord[];
  }) => Promise<{ addedUrls: number; updatedUrls: number }>;
};

export type SitemapImportDependencies = {
  repository: SitemapImportRepository;
  fetcher?: (input: {
    websiteId: string;
    sitemapUrl: string;
  }) => Promise<SitemapFetchResult>;
  parser?: (input: {
    rawBody: Uint8Array;
    contentType: string | null | undefined;
    sourceUrl: string;
  }) => SitemapParseResult;
  now?: () => Date;
  maxDepth?: number;
  maxSitemaps?: number;
  maxUrls?: number;
  limits?: Partial<SitemapImportLimits>;
  logger?: SitemapImportLogger;
};

export type SitemapImportLogMetadata =
  | null
  | string
  | number
  | boolean
  | SitemapImportLogMetadata[]
  | { [key: string]: SitemapImportLogMetadata };

export type SitemapImportLogEntry = {
  websiteId: string;
  sitemapId: string;
  action: "SITEMAP_IMPORT";
  status: "STARTED" | "FINISHED";
  message: string;
  metadata: SitemapImportLogMetadata;
};

export type SitemapImportLogger = (
  entry: SitemapImportLogEntry
) => Promise<void>;

type ImportContext = {
  websiteId: string;
  websiteDomain: string;
  rootSitemapId: string;
  rootSitemapUrl: string;
  dependencies: Required<
    Pick<SitemapImportDependencies, "repository" | "fetcher" | "parser" | "now">
  >;
  maxDepth: number;
  maxSitemaps: number;
  maxUrls: number;
  visitedSitemapUrls: Set<string>;
  discoveredPageUrls: Set<string>;
  result: SitemapImportResult;
  logger?: SitemapImportLogger;
};

export async function importUrlSetSitemap({
  websiteId,
  sitemapId,
  dependencies,
}: {
  websiteId: string;
  sitemapId: string;
  dependencies: SitemapImportDependencies;
}): Promise<SitemapImportResult> {
  const startedAt = performance.now();
  const repository = dependencies.repository;
  const now = dependencies.now ?? (() => new Date());
  const result = createEmptyResult();
  const limits = resolveSitemapImportLimits({
    ...dependencies.limits,
    ...(dependencies.maxDepth !== undefined
      ? { maxRecursionDepth: dependencies.maxDepth }
      : {}),
    ...(dependencies.maxSitemaps !== undefined
      ? { maxSitemapFiles: dependencies.maxSitemaps }
      : {}),
    ...(dependencies.maxUrls !== undefined
      ? { maxDiscoveredUrls: dependencies.maxUrls }
      : {}),
  });

  async function finish(success: boolean, context?: ImportContext) {
    result.success = success;
    result.durationMs = Math.max(0, Math.round(performance.now() - startedAt));

    if (!success && !result.errors.length) {
      result.errors.push(result.warnings[0] ?? "Sitemap import failed.");
    }

    if (context) {
      await logImportEvent(context, {
        status: "FINISHED",
        message: success
          ? "Sitemap import finished."
          : "Sitemap import finished without usable imported data.",
        metadata: createFinishedLogMetadata(context),
      });
    }

    return result;
  }

  const website = await repository.getWebsite(websiteId);

  if (!website) {
    result.errors.push("Website was not found.");
    return finish(false);
  }

  const sitemap = await repository.getSitemap({ websiteId, sitemapId });

  if (!sitemap) {
    result.errors.push("Sitemap was not found for this website.");
    return finish(false);
  }

  const context: ImportContext = {
    websiteId,
    websiteDomain: website.normalizedDomain,
    rootSitemapId: sitemap.id,
    rootSitemapUrl: sitemap.normalizedUrl,
    dependencies: {
      repository,
      fetcher:
        dependencies.fetcher ??
        ((input: { websiteId: string; sitemapUrl: string }) =>
          fetchSitemap({
            ...input,
            options: {
              maxRedirects: limits.maxRedirects,
              maxBytes: limits.maxResponseBytes,
              timeoutMs: limits.fetchTimeoutMs,
            },
          })),
      parser:
        dependencies.parser ??
        ((input: {
          rawBody: Uint8Array;
          contentType: string | null | undefined;
          sourceUrl: string;
        }) =>
          parseSitemap({
            ...input,
            maxUncompressedBytes: limits.maxResponseBytes,
            maxDepth: limits.maxXmlDepth,
            maxElements: limits.maxXmlNodes,
          })),
      now,
    },
    maxDepth: limits.maxRecursionDepth,
    maxSitemaps: limits.maxSitemapFiles,
    maxUrls: limits.maxDiscoveredUrls,
    visitedSitemapUrls: new Set(),
    discoveredPageUrls: new Set(),
    result,
    logger: dependencies.logger,
  };

  await logImportEvent(context, {
    status: "STARTED",
    message: "Sitemap import started.",
    metadata: {
      websiteId,
      rootSitemapId: sitemap.id,
      rootSitemapUrl: sitemap.normalizedUrl,
      maxRecursionDepth: limits.maxRecursionDepth,
      maxSitemapFiles: limits.maxSitemapFiles,
      maxDiscoveredUrls: limits.maxDiscoveredUrls,
      maxRedirects: limits.maxRedirects,
      fetchTimeoutMs: limits.fetchTimeoutMs,
      maxResponseBytes: limits.maxResponseBytes,
      maxXmlDepth: limits.maxXmlDepth,
      maxXmlNodes: limits.maxXmlNodes,
    },
  });

  await processSitemap({ context, sitemap, depth: 0 });

  return finish(result.importedUrlSets > 0, context);
}

export function createPrismaSitemapImportRepository(
  prisma: PrismaClient
): SitemapImportRepository {
  return {
    getWebsite(websiteId) {
      return prisma.website.findUnique({
        where: { id: websiteId },
        select: { id: true, normalizedDomain: true },
      });
    },
    getSitemap({ websiteId, sitemapId }) {
      return prisma.sitemap.findFirst({
        where: { id: sitemapId, websiteId },
        select: { id: true, websiteId: true, url: true, normalizedUrl: true },
      });
    },
    async upsertChildSitemap({
      websiteId,
      url,
      normalizedUrl,
      parentSitemapId,
    }) {
      const existing = await prisma.sitemap.findUnique({
        where: { websiteId_normalizedUrl: { websiteId, normalizedUrl } },
        select: { id: true, websiteId: true, url: true, normalizedUrl: true },
      });

      if (existing) {
        const sitemap = await prisma.sitemap.update({
          where: { id: existing.id, websiteId },
          data: { parentSitemapId, url },
          select: { id: true, websiteId: true, url: true, normalizedUrl: true },
        });

        return { sitemap, created: false };
      }

      const sitemap = await prisma.sitemap.create({
        data: {
          websiteId,
          url,
          normalizedUrl,
          parentSitemapId,
        },
        select: { id: true, websiteId: true, url: true, normalizedUrl: true },
      });

      return { sitemap, created: true };
    },
    async markSitemapFetching({ websiteId, sitemapId, fetchedAt }) {
      await prisma.sitemap.update({
        where: { id: sitemapId, websiteId },
        data: {
          status: "FETCHING",
          lastFetchedAt: fetchedAt,
          lastError: null,
        },
        select: { id: true },
      });
    },
    async markSitemapImported({
      websiteId,
      sitemapId,
      fetchedAt,
      urlCount,
      type,
      lastError,
    }) {
      await prisma.sitemap.update({
        where: { id: sitemapId, websiteId },
        data: {
          type,
          status: "IMPORTED",
          urlCount,
          lastFetchedAt: fetchedAt,
          lastSuccessfulFetchAt: fetchedAt,
          lastError: lastError ?? null,
        },
        select: { id: true },
      });
    },
    async markSitemapFailed({ websiteId, sitemapId, fetchedAt, error, type }) {
      await prisma.sitemap.update({
        where: { id: sitemapId, websiteId },
        data: {
          ...(type ? { type } : {}),
          status: "FAILED",
          lastFetchedAt: fetchedAt,
          lastError: error.slice(0, 500),
        },
        select: { id: true },
      });
    },
    findExistingUrlRecords({ websiteId, normalizedUrls }) {
      return prisma.urlRecord.findMany({
        where: { websiteId, normalizedUrl: { in: normalizedUrls } },
        select: {
          id: true,
          normalizedUrl: true,
          sitemapLastModifiedAt: true,
          firstDiscoveredAt: true,
        },
      });
    },
    async persistUrlRecords({ createRecords, updateRecords }) {
      const operations = [];

      if (createRecords.length) {
        operations.push(
          prisma.urlRecord.createMany({
            data: createRecords,
            skipDuplicates: true,
          })
        );
      }

      const updateGroups = new Map<string, UpdateUrlRecord[]>();

      for (const record of updateRecords) {
        const key = `${record.sitemapId}:${record.lastDiscoveredAt.toISOString()}`;
        updateGroups.set(key, [...(updateGroups.get(key) ?? []), record]);
      }

      for (const records of updateGroups.values()) {
        const firstRecord = records[0];
        operations.push(
          prisma.urlRecord.updateMany({
            where: { id: { in: records.map((record) => record.id) } },
            data: {
              sitemapId: firstRecord.sitemapId,
              lastDiscoveredAt: firstRecord.lastDiscoveredAt,
            },
          })
        );
      }

      for (const record of updateRecords.filter(
        (candidate) => candidate.sitemapLastModifiedAt
      )) {
        operations.push(
          prisma.urlRecord.update({
            where: { id: record.id },
            data: {
              sitemapLastModifiedAt: record.sitemapLastModifiedAt,
            },
            select: { id: true },
          })
        );
      }

      const results = await prisma.$transaction(operations);
      const createResult = createRecords.length ? results[0] : null;
      const addedUrls =
        createResult && "count" in createResult ? createResult.count : 0;

      return {
        addedUrls,
        updatedUrls: updateRecords.length,
      };
    },
  };
}

export function createPrismaSitemapImportLogger(
  prisma: PrismaClient
): SitemapImportLogger {
  return async (entry) => {
    await prisma.activityLog.create({
      data: {
        websiteId: entry.websiteId,
        sitemapId: entry.sitemapId,
        action: entry.action,
        status: entry.status,
        message: entry.message,
        metadata: entry.metadata ?? undefined,
      },
      select: { id: true },
    });
  };
}

async function processSitemap({
  context,
  sitemap,
  depth,
}: {
  context: ImportContext;
  sitemap: SitemapRecordForImport;
  depth: number;
}): Promise<number> {
  const normalizedSitemap = normalizeSitemapUrlForImport(
    sitemap.url,
    context.websiteDomain
  );
  const fetchedAt = context.dependencies.now();

  if (!normalizedSitemap.ok) {
    await markFailed(context, sitemap, fetchedAt, normalizedSitemap.error);
    return 0;
  }

  if (context.visitedSitemapUrls.has(normalizedSitemap.normalizedUrl)) {
    context.result.warnings.push(
      `Skipped already processed sitemap: ${normalizedSitemap.normalizedUrl}`
    );
    return 0;
  }

  if (depth > context.maxDepth) {
    recordLimitReached(context, "Sitemap recursion depth limit reached.");
    await markFailed(
      context,
      sitemap,
      fetchedAt,
      "Sitemap recursion depth limit reached."
    );
    return 0;
  }

  if (context.result.processedSitemaps >= context.maxSitemaps) {
    recordLimitReached(context, "Sitemap file processing limit reached.");
    return 0;
  }

  context.visitedSitemapUrls.add(normalizedSitemap.normalizedUrl);
  context.result.processedSitemaps += 1;

  try {
    await context.dependencies.repository.markSitemapFetching({
      websiteId: context.websiteId,
      sitemapId: sitemap.id,
      fetchedAt,
    });
  } catch {
    context.result.errors.push("Sitemap status could not be updated.");
    return 0;
  }

  let fetchResult: SitemapFetchResult;

  try {
    fetchResult = await context.dependencies.fetcher({
      websiteId: context.websiteId,
      sitemapUrl: sitemap.url,
    });
  } catch {
    await markFailed(
      context,
      sitemap,
      fetchedAt,
      "The sitemap could not be fetched."
    );
    return 0;
  }

  if (!fetchResult.ok) {
    await markFailed(context, sitemap, fetchResult.fetchedAt, fetchResult.message);
    return 0;
  }

  let parseResult: SitemapParseResult;

  try {
    parseResult = context.dependencies.parser({
      rawBody: fetchResult.rawBody,
      contentType: fetchResult.contentType,
      sourceUrl: fetchResult.finalUrl,
    });
  } catch {
    await markFailed(
      context,
      sitemap,
      fetchResult.fetchedAt,
      "The sitemap could not be parsed."
    );
    return 0;
  }
  appendParseWarnings(context, parseResult);

  if (parseResult.detectedType === "URL_SET") {
    return importUrlSet({
      context,
      sitemap,
      parseResult,
      fetchedAt: fetchResult.fetchedAt,
    });
  }

  if (parseResult.detectedType === "SITEMAP_INDEX") {
    const discoveredUrlCount = await importSitemapIndex({
      context,
      sitemap,
      items: parseResult.items,
      depth,
    });

    if (discoveredUrlCount > 0) {
      await context.dependencies.repository.markSitemapImported({
        websiteId: context.websiteId,
        sitemapId: sitemap.id,
        fetchedAt: fetchResult.fetchedAt,
        type: "INDEX",
        urlCount: discoveredUrlCount,
        lastError: summarizeWarnings(context.result.warnings),
      });
      context.result.importedSitemaps += 1;
    } else {
      await markFailed(
        context,
        sitemap,
        fetchResult.fetchedAt,
        "No usable child sitemaps were imported.",
        "INDEX"
      );
    }

    return discoveredUrlCount;
  }

  await markFailed(
    context,
    sitemap,
    fetchResult.fetchedAt,
    parseResult.errors[0]?.message ?? "The sitemap could not be parsed."
  );

  return 0;
}

async function importSitemapIndex({
  context,
  sitemap,
  items,
  depth,
}: {
  context: ImportContext;
  sitemap: SitemapRecordForImport;
  items: SitemapIndexItem[];
  depth: number;
}) {
  const initialDiscoveredCount = context.discoveredPageUrls.size;

  for (const item of items) {
    const normalizedChild = normalizeSitemapUrlForImport(
      item.loc,
      context.websiteDomain
    );

    if (!normalizedChild.ok) {
      context.result.warnings.push(normalizedChild.error);
      continue;
    }

    if (context.visitedSitemapUrls.has(normalizedChild.normalizedUrl)) {
      context.result.warnings.push(
        `Skipped circular or duplicate sitemap reference: ${normalizedChild.normalizedUrl}`
      );
      continue;
    }

    if (context.result.processedSitemaps >= context.maxSitemaps) {
      recordLimitReached(context, "Sitemap file processing limit reached.");
      break;
    }

    let child: { sitemap: SitemapRecordForImport; created: boolean };

    try {
      child = await context.dependencies.repository.upsertChildSitemap({
        websiteId: context.websiteId,
        url: normalizedChild.normalizedUrl,
        normalizedUrl: normalizedChild.normalizedUrl,
        parentSitemapId: sitemap.id,
      });
    } catch {
      context.result.failedSitemaps += 1;
      context.result.warnings.push(
        `Child sitemap could not be saved: ${normalizedChild.normalizedUrl}`
      );
      continue;
    }

    if (child.created) {
      context.result.createdSitemaps += 1;
    }

    await processSitemap({
      context,
      sitemap: child.sitemap,
      depth: depth + 1,
    });
  }

  return context.discoveredPageUrls.size - initialDiscoveredCount;
}

async function importUrlSet({
  context,
  sitemap,
  parseResult,
  fetchedAt,
}: {
  context: ImportContext;
  sitemap: SitemapRecordForImport;
  parseResult: Extract<SitemapParseResult, { detectedType: "URL_SET" }>;
  fetchedAt: Date;
}) {
  const duplicateUrlsSkipped = parseResult.warnings.filter(
    (warning) => warning.code === "DUPLICATE_ENTRY"
  ).length;
  const invalidUrlsSkipped = parseResult.warnings.filter(
    (warning) => warning.code === "INVALID_URL" || warning.code === "MISSING_LOC"
  ).length;
  const normalizedEntries = [];
  let duplicateUrlsInImport = 0;
  let limitSkippedUrls = 0;

  for (const entry of parseUrlSetItems(parseResult.items)) {
    if (context.discoveredPageUrls.has(entry.normalizedUrl)) {
      duplicateUrlsInImport += 1;
      continue;
    }

    if (context.discoveredPageUrls.size >= context.maxUrls) {
      limitSkippedUrls += 1;
      continue;
    }

    context.discoveredPageUrls.add(entry.normalizedUrl);
    normalizedEntries.push(entry);
  }

  if (limitSkippedUrls > 0) {
    recordLimitReached(context, "Discovered URL limit reached.");
  }

  if (!normalizedEntries.length) {
    context.result.invalidUrlsSkipped += invalidUrlsSkipped;
    context.result.duplicateUrlsSkipped += duplicateUrlsSkipped + duplicateUrlsInImport;
    context.result.skippedUrls +=
      invalidUrlsSkipped +
      duplicateUrlsSkipped +
      duplicateUrlsInImport +
      limitSkippedUrls;
    await markFailed(
      context,
      sitemap,
      fetchedAt,
      "No usable URLs were imported from this sitemap.",
      "URL_SET"
    );
    return 0;
  }

  const existingRecords =
    await context.dependencies.repository.findExistingUrlRecords({
      websiteId: context.websiteId,
      normalizedUrls: normalizedEntries.map((entry) => entry.normalizedUrl),
    });
  const existingByUrl = new Map(
    existingRecords.map((record) => [record.normalizedUrl, record])
  );
  const discoveredAt = context.dependencies.now();
  const createRecords: ImportUrlRecord[] = [];
  const updateRecords: UpdateUrlRecord[] = [];

  for (const entry of normalizedEntries) {
    const existingRecord = existingByUrl.get(entry.normalizedUrl);
    const sitemapLastModifiedAt = parseValidDate(entry.lastmod);

    if (!existingRecord) {
      createRecords.push({
        websiteId: context.websiteId,
        sitemapId: sitemap.id,
        url: entry.url,
        normalizedUrl: entry.normalizedUrl,
        path: entry.path,
        sitemapLastModifiedAt,
        firstDiscoveredAt: discoveredAt,
        lastDiscoveredAt: discoveredAt,
      });
      continue;
    }

    const updateRecord: UpdateUrlRecord = {
      id: existingRecord.id,
      sitemapId: sitemap.id,
      lastDiscoveredAt: discoveredAt,
    };

    if (
      sitemapLastModifiedAt &&
      isNewerDate(sitemapLastModifiedAt, existingRecord.sitemapLastModifiedAt)
    ) {
      updateRecord.sitemapLastModifiedAt = sitemapLastModifiedAt;
    }

    updateRecords.push(updateRecord);
  }

  let persisted: { addedUrls: number; updatedUrls: number };

  try {
    persisted = await context.dependencies.repository.persistUrlRecords({
      createRecords,
      updateRecords,
    });
  } catch {
    await markFailed(
      context,
      sitemap,
      fetchedAt,
      "URL records could not be saved.",
      "URL_SET"
    );
    return 0;
  }

  await context.dependencies.repository.markSitemapImported({
    websiteId: context.websiteId,
    sitemapId: sitemap.id,
    fetchedAt,
    type: "URL_SET",
    urlCount: normalizedEntries.length,
  });

  context.result.importedSitemaps += 1;
  context.result.importedUrlSets += 1;
  context.result.importedUrls += persisted.addedUrls + persisted.updatedUrls;
  context.result.addedUrls += persisted.addedUrls;
  context.result.updatedUrls += persisted.updatedUrls;
  context.result.invalidUrlsSkipped += invalidUrlsSkipped;
  context.result.duplicateUrlsSkipped += duplicateUrlsSkipped + duplicateUrlsInImport;
  context.result.skippedUrls +=
    invalidUrlsSkipped +
    duplicateUrlsSkipped +
    duplicateUrlsInImport +
    limitSkippedUrls;

  return normalizedEntries.length;
}

async function markFailed(
  context: ImportContext,
  sitemap: SitemapRecordForImport,
  fetchedAt: Date,
  error: string,
  type?: SitemapImportType
) {
  context.result.failedSitemaps += 1;
  context.result.warnings.push(error);
  await context.dependencies.repository.markSitemapFailed({
    websiteId: context.websiteId,
    sitemapId: sitemap.id,
    fetchedAt,
    error,
    type,
  });
}

function parseUrlSetItems(items: SitemapUrlItem[]) {
  return items.map((item) => {
    const normalized = normalizeAbsoluteUrl(item.loc);

    return {
      url: normalized.normalizedUrl,
      normalizedUrl: normalized.normalizedUrl,
      path: normalized.path,
      lastmod: item.lastmod,
    };
  });
}

function normalizeSitemapUrlForImport(
  url: string,
  websiteDomain: string
):
  | { ok: true; normalizedUrl: string }
  | { ok: false; error: string } {
  try {
    const normalized = normalizeAbsoluteUrl(url).normalizedUrl;
    const hostname = new URL(normalized).hostname;

    if (hostname !== websiteDomain) {
      return {
        ok: false,
        error: `Skipped cross-domain sitemap: ${normalized}`,
      };
    }

    return { ok: true, normalizedUrl: normalized };
  } catch {
    return { ok: false, error: "Sitemap URL is invalid." };
  }
}

function parseValidDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function isNewerDate(nextDate: Date | null, currentDate: Date | null) {
  if (!nextDate) {
    return false;
  }

  if (!currentDate) {
    return true;
  }

  return nextDate.getTime() > currentDate.getTime();
}

function createEmptyResult(): SitemapImportResult {
  return {
    success: false,
    processedSitemaps: 0,
    createdSitemaps: 0,
    importedSitemaps: 0,
    importedUrlSets: 0,
    failedSitemaps: 0,
    importedUrls: 0,
    addedUrls: 0,
    updatedUrls: 0,
    skippedUrls: 0,
    invalidUrlsSkipped: 0,
    duplicateUrlsSkipped: 0,
    warnings: [],
    errors: [],
    limitReached: false,
    limitsReached: [],
    durationMs: 0,
  };
}

function summarizeWarnings(warnings: string[]) {
  if (!warnings.length) {
    return null;
  }

  return warnings.slice(0, 3).join(" ").slice(0, 500);
}

function appendParseWarnings(context: ImportContext, parseResult: SitemapParseResult) {
  for (const warning of parseResult.warnings) {
    context.result.warnings.push(warning.message);
  }
}

function recordLimitReached(context: ImportContext, message: string) {
  context.result.limitReached = true;

  if (!context.result.limitsReached.includes(message)) {
    context.result.limitsReached.push(message);
  }

  if (!context.result.warnings.includes(message)) {
    context.result.warnings.push(message);
  }
}

async function logImportEvent(
  context: ImportContext,
  input: Pick<SitemapImportLogEntry, "status" | "message" | "metadata">
) {
  if (!context.logger) {
    return;
  }

  try {
    await context.logger({
      websiteId: context.websiteId,
      sitemapId: context.rootSitemapId,
      action: "SITEMAP_IMPORT",
      ...input,
    });
  } catch {
    if (!context.result.warnings.includes("Import activity log could not be written.")) {
      context.result.warnings.push("Import activity log could not be written.");
    }
  }
}

function createFinishedLogMetadata(
  context: ImportContext
): SitemapImportLogMetadata {
  return {
    websiteId: context.websiteId,
    rootSitemapId: context.rootSitemapId,
    rootSitemapUrl: context.rootSitemapUrl,
    processedSitemaps: context.result.processedSitemaps,
    importedSitemaps: context.result.importedSitemaps,
    failedSitemaps: context.result.failedSitemaps,
    importedUrlSets: context.result.importedUrlSets,
    importedUrls: context.result.importedUrls,
    addedUrls: context.result.addedUrls,
    updatedUrls: context.result.updatedUrls,
    skippedUrls: context.result.skippedUrls,
    warnings: context.result.warnings.slice(0, 20),
    errors: context.result.errors.slice(0, 20),
    limitReached: context.result.limitReached,
    limitsReached: context.result.limitsReached,
    durationMs: context.result.durationMs,
  };
}
