"use server";

import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { getDuplicateSitemapMessage } from "@/lib/sitemaps/duplicates";
import { fetchSitemap } from "@/lib/sitemaps/fetcher";
import { getSitemapFetchUpdateData } from "@/lib/sitemaps/fetch-updates";
import {
  createPrismaSitemapImportLogger,
  createPrismaSitemapImportRepository,
  importUrlSetSitemap,
} from "@/lib/sitemaps/importer";
import { parseSitemap } from "@/lib/sitemaps/parser";
import { normalizeAbsoluteUrl } from "@/lib/sitemaps/url";
import {
  type SitemapFormInput,
  type SitemapTypeFormInput,
  sitemapFormSchema,
  sitemapTypeFormSchema,
} from "@/lib/sitemaps/validation";
import { z } from "zod";

export type SitemapActionResult = {
  ok: boolean;
  message: string;
  sitemapId?: string;
  redirectTo?: string;
  fieldErrors?: Partial<Record<keyof SitemapFormInput, string>>;
};

export type TestFetchActionResult = {
  ok: boolean;
  message: string;
  statusCode?: number;
  finalUrl?: string;
  contentType?: string | null;
  responseSize?: number;
  redirectCount?: number;
  durationMs?: number;
  errorCode?: string;
};

export type ParseTestEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
};

export type ParseTestActionResult = {
  ok: boolean;
  message: string;
  detectedType?: "SITEMAP_INDEX" | "URL_SET" | "INVALID";
  itemCount?: number;
  compressed?: boolean;
  responseSize?: number;
  parsedSize?: number;
  entries?: ParseTestEntry[];
  warnings?: string[];
  errors?: string[];
  statusCode?: number;
  finalUrl?: string;
  contentType?: string | null;
  durationMs?: number;
  errorCode?: string;
};

export type ImportSitemapActionResult = {
  ok: boolean;
  message: string;
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
  limitReached: boolean;
  limitsReached: string[];
  durationMs: number;
  errors: string[];
};

const testFetchInputSchema = z.object({
  websiteId: z.string().min(1),
  sitemapId: z.string().min(1),
});

function toFieldErrors(error: ZodError<SitemapFormInput>) {
  const flattened = error.flatten().fieldErrors;

  return Object.fromEntries(
    Object.entries(flattened)
      .filter(([, messages]) => messages?.[0])
      .map(([field, messages]) => [field, messages?.[0]])
  ) as SitemapActionResult["fieldErrors"];
}

async function findSitemapByNormalizedUrl({
  websiteId,
  normalizedUrl,
}: {
  websiteId: string;
  normalizedUrl: string;
}) {
  return prisma.sitemap.findUnique({
    where: { websiteId_normalizedUrl: { websiteId, normalizedUrl } },
    select: { id: true },
  });
}

function revalidateSitemapPaths(websiteId: string, sitemapId?: string) {
  revalidatePath(`/websites/${websiteId}`);
  revalidatePath(`/websites/${websiteId}/sitemaps`);

  if (sitemapId) {
    revalidatePath(`/websites/${websiteId}/sitemaps/${sitemapId}`);
  }
}

export async function createSitemap(
  websiteId: string,
  input: SitemapFormInput
): Promise<SitemapActionResult> {
  const parsed = sitemapFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  try {
    const { normalizedUrl } = normalizeAbsoluteUrl(parsed.data.url);
    const duplicateMessage = await getDuplicateSitemapMessage({
      websiteId,
      normalizedUrl,
      findSitemapByNormalizedUrl,
    });

    if (duplicateMessage) {
      return {
        ok: false,
        message: duplicateMessage,
        fieldErrors: { url: duplicateMessage },
      };
    }

    if (parsed.data.parentSitemapId) {
      const parentSitemap = await prisma.sitemap.findFirst({
        where: { id: parsed.data.parentSitemapId, websiteId },
        select: { id: true },
      });

      if (!parentSitemap) {
        return {
          ok: false,
          message: "Parent sitemap was not found.",
          fieldErrors: { parentSitemapId: "Parent sitemap was not found." },
        };
      }
    }

    const sitemap = await prisma.sitemap.create({
      data: {
        websiteId,
        url: normalizedUrl,
        normalizedUrl,
        type: parsed.data.type,
        parentSitemapId: parsed.data.parentSitemapId || null,
      },
      select: { id: true },
    });

    revalidateSitemapPaths(websiteId, sitemap.id);

    return {
      ok: true,
      message: "Sitemap created.",
      sitemapId: sitemap.id,
      redirectTo: `/websites/${websiteId}/sitemaps/${sitemap.id}`,
    };
  } catch {
    return {
      ok: false,
      message: "Sitemap could not be created.",
    };
  }
}

export async function updateSitemapType(
  websiteId: string,
  sitemapId: string,
  input: SitemapTypeFormInput
): Promise<SitemapActionResult> {
  const parsed = sitemapTypeFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Select a sitemap type.",
      fieldErrors: { type: parsed.error.flatten().fieldErrors.type?.[0] },
    };
  }

  try {
    const sitemap = await prisma.sitemap.update({
      where: { id: sitemapId, websiteId },
      data: { type: parsed.data.type },
      select: { id: true },
    });

    revalidateSitemapPaths(websiteId, sitemap.id);

    return {
      ok: true,
      message: "Sitemap type updated.",
      sitemapId: sitemap.id,
    };
  } catch {
    return {
      ok: false,
      message: "Sitemap type could not be updated.",
    };
  }
}

export async function archiveSitemap(
  websiteId: string,
  sitemapId: string
): Promise<SitemapActionResult> {
  try {
    const sitemap = await prisma.sitemap.update({
      where: { id: sitemapId, websiteId },
      data: { status: "ARCHIVED" },
      select: { id: true },
    });

    revalidateSitemapPaths(websiteId, sitemap.id);

    return { ok: true, message: "Sitemap archived.", sitemapId: sitemap.id };
  } catch {
    return { ok: false, message: "Sitemap could not be archived." };
  }
}

export async function restoreSitemap(
  websiteId: string,
  sitemapId: string
): Promise<SitemapActionResult> {
  try {
    const sitemap = await prisma.sitemap.update({
      where: { id: sitemapId, websiteId },
      data: { status: "PENDING" },
      select: { id: true },
    });

    revalidateSitemapPaths(websiteId, sitemap.id);

    return { ok: true, message: "Sitemap restored.", sitemapId: sitemap.id };
  } catch {
    return { ok: false, message: "Sitemap could not be restored." };
  }
}

export async function deleteSitemap(
  websiteId: string,
  sitemapId: string
): Promise<SitemapActionResult> {
  try {
    await prisma.sitemap.delete({
      where: { id: sitemapId, websiteId },
      select: { id: true },
    });

    revalidateSitemapPaths(websiteId, sitemapId);

    return {
      ok: true,
      message: "Sitemap deleted.",
      redirectTo: `/websites/${websiteId}/sitemaps`,
    };
  } catch {
    return { ok: false, message: "Sitemap could not be deleted." };
  }
}

export async function testFetchSitemap(input: {
  websiteId: string;
  sitemapId: string;
}): Promise<TestFetchActionResult> {
  const parsed = testFetchInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid sitemap fetch request.",
      errorCode: "INVALID_URL",
    };
  }

  const { websiteId, sitemapId } = parsed.data;

  try {
    const sitemap = await prisma.sitemap.findFirst({
      where: { id: sitemapId, websiteId },
      select: { id: true, url: true },
    });

    if (!sitemap) {
      return {
        ok: false,
        message: "Sitemap was not found for this website.",
        errorCode: "FETCH_FAILED",
      };
    }

    const result = await fetchSitemap({
      websiteId,
      sitemapUrl: sitemap.url,
    });

    await prisma.sitemap.update({
      where: { id: sitemap.id, websiteId },
      data: getSitemapFetchUpdateData(result),
      select: { id: true },
    });

    revalidateSitemapPaths(websiteId, sitemap.id);

    if (result.ok) {
      return {
        ok: true,
        message: result.message,
        statusCode: result.httpStatus,
        finalUrl: result.finalUrl,
        contentType: result.contentType,
        responseSize: result.responseSize,
        redirectCount: result.redirectCount,
        durationMs: result.durationMs,
      };
    }

    return {
      ok: false,
      message: result.message,
      statusCode: result.httpStatus,
      finalUrl: result.finalUrl,
      contentType: result.contentType,
      responseSize: result.responseSize,
      redirectCount: result.redirectCount,
      durationMs: result.durationMs,
      errorCode: result.code,
    };
  } catch {
    return {
      ok: false,
      message: "The sitemap fetch test could not be completed.",
      errorCode: "FETCH_FAILED",
    };
  }
}

export async function parseTestSitemap(input: {
  websiteId: string;
  sitemapId: string;
}): Promise<ParseTestActionResult> {
  const parsed = testFetchInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid sitemap parse request.",
      errorCode: "INVALID_URL",
    };
  }

  const { websiteId, sitemapId } = parsed.data;

  try {
    const sitemap = await prisma.sitemap.findFirst({
      where: { id: sitemapId, websiteId },
      select: { id: true, url: true },
    });

    if (!sitemap) {
      return {
        ok: false,
        message: "Sitemap was not found for this website.",
        errorCode: "FETCH_FAILED",
      };
    }

    const fetchResult = await fetchSitemap({
      websiteId,
      sitemapUrl: sitemap.url,
    });

    await prisma.sitemap.update({
      where: { id: sitemap.id, websiteId },
      data: getSitemapFetchUpdateData(fetchResult),
      select: { id: true },
    });

    revalidateSitemapPaths(websiteId, sitemap.id);

    if (!fetchResult.ok) {
      return {
        ok: false,
        message: fetchResult.message,
        statusCode: fetchResult.httpStatus,
        finalUrl: fetchResult.finalUrl,
        contentType: fetchResult.contentType,
        responseSize: fetchResult.responseSize,
        durationMs: fetchResult.durationMs,
        errorCode: fetchResult.code,
      };
    }

    const parseResult = parseSitemap({
      rawBody: fetchResult.rawBody,
      contentType: fetchResult.contentType,
      sourceUrl: fetchResult.finalUrl,
    });
    const entries: ParseTestEntry[] = parseResult.items
      .slice(0, 10)
      .map((item) => {
        const entry: ParseTestEntry = { loc: item.loc };

        if (item.lastmod) {
          entry.lastmod = item.lastmod;
        }

        if ("changefreq" in item && typeof item.changefreq === "string") {
          entry.changefreq = item.changefreq;
        }

        if ("priority" in item && typeof item.priority === "number") {
          entry.priority = item.priority;
        }

        return entry;
      });

    return {
      ok: parseResult.detectedType !== "INVALID",
      message:
        parseResult.detectedType === "INVALID"
          ? "The sitemap could not be parsed."
          : "Sitemap parsed successfully.",
      detectedType: parseResult.detectedType,
      itemCount: parseResult.itemCount,
      compressed: parseResult.compressed,
      responseSize: parseResult.responseSize,
      parsedSize: parseResult.parsedSize,
      entries,
      warnings: parseResult.warnings.map((warning) => warning.message),
      errors: parseResult.errors.map((error) => error.message),
      statusCode: fetchResult.httpStatus,
      finalUrl: fetchResult.finalUrl,
      contentType: fetchResult.contentType,
      durationMs: fetchResult.durationMs,
    };
  } catch {
    return {
      ok: false,
      message: "The sitemap parse test could not be completed.",
      errorCode: "FETCH_FAILED",
    };
  }
}

export async function importSitemap(input: {
  websiteId: string;
  sitemapId: string;
}): Promise<ImportSitemapActionResult> {
  const parsed = testFetchInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid sitemap import request.",
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
      limitReached: false,
      limitsReached: [],
      durationMs: 0,
      errors: ["Invalid sitemap import request."],
    };
  }

  const { websiteId, sitemapId } = parsed.data;
  const result = await importUrlSetSitemap({
    websiteId,
    sitemapId,
    dependencies: {
      repository: createPrismaSitemapImportRepository(prisma),
      logger: createPrismaSitemapImportLogger(prisma),
    },
  });

  revalidateSitemapPaths(websiteId, sitemapId);

  return {
    ok: result.success,
    message: result.success
      ? "Sitemap imported."
      : "Sitemap import failed.",
    processedSitemaps: result.processedSitemaps,
    createdSitemaps: result.createdSitemaps,
    importedSitemaps: result.importedSitemaps,
    importedUrlSets: result.importedUrlSets,
    failedSitemaps: result.failedSitemaps,
    importedUrls: result.importedUrls,
    addedUrls: result.addedUrls,
    updatedUrls: result.updatedUrls,
    skippedUrls: result.skippedUrls,
    invalidUrlsSkipped: result.invalidUrlsSkipped,
    duplicateUrlsSkipped: result.duplicateUrlsSkipped,
    warnings: result.warnings,
    limitReached: result.limitReached,
    limitsReached: result.limitsReached,
    durationMs: result.durationMs,
    errors: result.errors,
  };
}
