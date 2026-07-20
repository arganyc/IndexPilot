import "server-only";

import { gunzipSync } from "node:zlib";

import { SITEMAP_IMPORT_LIMITS } from "@/lib/sitemaps/config";
import { normalizeAbsoluteUrl } from "@/lib/sitemaps/url";

export const SITEMAP_PARSE_MAX_UNCOMPRESSED_BYTES =
  SITEMAP_IMPORT_LIMITS.maxResponseBytes;
export const SITEMAP_PARSE_MAX_DEPTH = SITEMAP_IMPORT_LIMITS.maxXmlDepth;
export const SITEMAP_PARSE_MAX_ELEMENTS = SITEMAP_IMPORT_LIMITS.maxXmlNodes;

export type SitemapParseIssueCode =
  | "DECOMPRESSION_FAILED"
  | "DECOMPRESSED_TOO_LARGE"
  | "MALFORMED_XML"
  | "UNSAFE_XML"
  | "MAX_DEPTH_EXCEEDED"
  | "MAX_ELEMENTS_EXCEEDED"
  | "UNSUPPORTED_ROOT"
  | "EMPTY_SITEMAP"
  | "MISSING_LOC"
  | "INVALID_URL"
  | "DUPLICATE_ENTRY"
  | "INVALID_LASTMOD"
  | "INVALID_PRIORITY";

export type SitemapParseIssue = {
  code: SitemapParseIssueCode;
  message: string;
};

export type SitemapIndexItem = {
  loc: string;
  lastmod?: string;
};

export type SitemapUrlItem = {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
};

type SitemapParseBase = {
  sourceUrl: string;
  compressed: boolean;
  responseSize: number;
  parsedSize: number;
  itemCount: number;
  warnings: SitemapParseIssue[];
  errors: SitemapParseIssue[];
};

export type SitemapIndexParseResult = SitemapParseBase & {
  detectedType: "SITEMAP_INDEX";
  items: SitemapIndexItem[];
};

export type SitemapUrlSetParseResult = SitemapParseBase & {
  detectedType: "URL_SET";
  items: SitemapUrlItem[];
};

export type InvalidSitemapParseResult = SitemapParseBase & {
  detectedType: "INVALID";
  items: [];
};

export type SitemapParseResult =
  | SitemapIndexParseResult
  | SitemapUrlSetParseResult
  | InvalidSitemapParseResult;

export type ParseSitemapInput = {
  rawBody: Uint8Array;
  contentType: string | null | undefined;
  sourceUrl: string;
  maxUncompressedBytes?: number;
  maxDepth?: number;
  maxElements?: number;
};

type CurrentItem = {
  loc?: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
};

const TAG_PATTERN = /<([^>]+)>/g;
const UNSAFE_XML_PATTERN = /<!DOCTYPE\b|<!ENTITY\b/i;
const VALID_CHANGEFREQ = new Set([
  "always",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "never",
]);

export function parseSitemap(input: ParseSitemapInput): SitemapParseResult {
  const maxUncompressedBytes =
    input.maxUncompressedBytes ?? SITEMAP_PARSE_MAX_UNCOMPRESSED_BYTES;
  const responseSize = input.rawBody.byteLength;
  const compressed = isGzipSitemap({
    rawBody: input.rawBody,
    contentType: input.contentType,
    sourceUrl: input.sourceUrl,
  });
  const decompressed = decompressIfNeeded(
    input.rawBody,
    compressed,
    maxUncompressedBytes
  );

  if (!decompressed.ok) {
    return invalidResult({
      sourceUrl: input.sourceUrl,
      compressed,
      responseSize,
      parsedSize: 0,
      errors: [decompressed.error],
    });
  }

  const parsedSize = decompressed.body.byteLength;
  const xml = new TextDecoder("utf-8", { fatal: false }).decode(
    decompressed.body
  );

  if (UNSAFE_XML_PATTERN.test(xml)) {
    return invalidResult({
      sourceUrl: input.sourceUrl,
      compressed,
      responseSize,
      parsedSize,
      errors: [
        {
          code: "UNSAFE_XML",
          message: "XML declarations with external entities are not supported.",
        },
      ],
    });
  }

  return parseXmlText({
    xml,
    sourceUrl: input.sourceUrl,
    compressed,
    responseSize,
    parsedSize,
    maxDepth: input.maxDepth ?? SITEMAP_PARSE_MAX_DEPTH,
    maxElements: input.maxElements ?? SITEMAP_PARSE_MAX_ELEMENTS,
  });
}

export function isGzipSitemap({
  rawBody,
  contentType,
  sourceUrl,
}: {
  rawBody: Uint8Array;
  contentType: string | null | undefined;
  sourceUrl: string;
}) {
  const normalizedContentType =
    contentType?.split(";")[0]?.trim().toLowerCase() ?? "";

  return (
    normalizedContentType === "application/gzip" ||
    normalizedContentType === "application/x-gzip" ||
    new URL(sourceUrl).pathname.toLowerCase().endsWith(".gz") ||
    (rawBody[0] === 0x1f && rawBody[1] === 0x8b)
  );
}

function decompressIfNeeded(
  rawBody: Uint8Array,
  compressed: boolean,
  maxUncompressedBytes: number
):
  | { ok: true; body: Uint8Array }
  | { ok: false; error: SitemapParseIssue } {
  if (!compressed) {
    if (rawBody.byteLength > maxUncompressedBytes) {
      return {
        ok: false,
        error: {
          code: "DECOMPRESSED_TOO_LARGE",
          message: "The sitemap XML is larger than the allowed parse limit.",
        },
      };
    }

    return { ok: true, body: rawBody };
  }

  try {
    const body = gunzipSync(Buffer.from(rawBody), {
      maxOutputLength: maxUncompressedBytes,
    });

    return { ok: true, body: new Uint8Array(body) };
  } catch (error) {
    const message =
      error instanceof Error &&
      (error.message.includes("maxOutputLength") ||
        error.message.includes("Cannot create a Buffer larger"))
        ? "The decompressed sitemap is larger than the allowed parse limit."
        : "The gzip sitemap could not be decompressed.";

    return {
      ok: false,
      error: {
        code: message.includes("larger")
          ? "DECOMPRESSED_TOO_LARGE"
          : "DECOMPRESSION_FAILED",
        message,
      },
    };
  }
}

function parseXmlText({
  xml,
  sourceUrl,
  compressed,
  responseSize,
  parsedSize,
  maxDepth,
  maxElements,
}: {
  xml: string;
  sourceUrl: string;
  compressed: boolean;
  responseSize: number;
  parsedSize: number;
  maxDepth: number;
  maxElements: number;
}): SitemapParseResult {
  const warnings: SitemapParseIssue[] = [];
  const errors: SitemapParseIssue[] = [];
  const stack: string[] = [];
  const seenEntries = new Set<string>();
  const indexItems: SitemapIndexItem[] = [];
  const urlItems: SitemapUrlItem[] = [];
  let rootName: string | null = null;
  let currentItem: CurrentItem | null = null;
  let activeField: keyof CurrentItem | null = null;
  let elementCount = 0;
  let previousIndex = 0;
  let invalidSecurityOrStructure = false;

  function appendText(text: string) {
    if (currentItem && activeField) {
      currentItem[activeField] = `${currentItem[activeField] ?? ""}${decodeXmlText(
        text
      )}`;
    }
  }

  for (const match of xml.matchAll(TAG_PATTERN)) {
    const fullTag = match[0];
    const tagBody = match[1].trim();
    appendText(xml.slice(previousIndex, match.index));
    previousIndex = (match.index ?? 0) + fullTag.length;

    if (
      !tagBody ||
      tagBody.startsWith("?") ||
      tagBody.startsWith("!--") ||
      tagBody.startsWith("![CDATA[")
    ) {
      continue;
    }

    if (tagBody.startsWith("!")) {
      invalidSecurityOrStructure = true;
      errors.push({
        code: "UNSAFE_XML",
        message: "Unsupported XML declaration found.",
      });
      break;
    }

    if (tagBody.startsWith("/")) {
      const closingName = localName(tagBody.slice(1).split(/\s+/)[0]);
      const expectedName = stack.pop();

      if (expectedName !== closingName) {
        errors.push({
          code: "MALFORMED_XML",
          message: "The sitemap XML is malformed.",
        });
        invalidSecurityOrStructure = true;
        break;
      }

      if (activeField === closingName) {
        activeField = null;
      }

      if (
        rootName === "sitemapindex" &&
        closingName === "sitemap" &&
        stack.at(-1) === "sitemapindex" &&
        currentItem
      ) {
        finalizeIndexItem(currentItem, indexItems, seenEntries, warnings);
        currentItem = null;
      }

      if (
        rootName === "urlset" &&
        closingName === "url" &&
        stack.at(-1) === "urlset" &&
        currentItem
      ) {
        finalizeUrlItem(currentItem, urlItems, seenEntries, warnings);
        currentItem = null;
      }

      continue;
    }

    const selfClosing = tagBody.endsWith("/");
    const openingName = localName(tagBody.replace(/\/$/, "").split(/\s+/)[0]);
    elementCount += 1;

    if (elementCount > maxElements) {
      errors.push({
        code: "MAX_ELEMENTS_EXCEEDED",
        message: "The sitemap XML contains too many elements.",
      });
      invalidSecurityOrStructure = true;
      break;
    }

    if (!rootName) {
      rootName = openingName;
    }

    if (stack.length + 1 > maxDepth) {
      errors.push({
        code: "MAX_DEPTH_EXCEEDED",
        message: "The sitemap XML is nested too deeply.",
      });
      invalidSecurityOrStructure = true;
      break;
    }

    stack.push(openingName);

    if (
      rootName === "sitemapindex" &&
      openingName === "sitemap" &&
      stack.at(-2) === "sitemapindex"
    ) {
      currentItem = {};
    }

    if (
      rootName === "urlset" &&
      openingName === "url" &&
      stack.at(-2) === "urlset"
    ) {
      currentItem = {};
    }

    if (
      currentItem &&
      (openingName === "loc" ||
        openingName === "lastmod" ||
        openingName === "changefreq" ||
        openingName === "priority")
    ) {
      activeField = openingName;
    }

    if (selfClosing) {
      stack.pop();
      if (activeField === openingName) {
        activeField = null;
      }
    }
  }

  appendText(xml.slice(previousIndex));

  if (!rootName) {
    errors.push({ code: "MALFORMED_XML", message: "No XML root element found." });
  } else if (!invalidSecurityOrStructure && stack.length > 0) {
    errors.push({
      code: "MALFORMED_XML",
      message: "The sitemap XML is malformed.",
    });
  }

  if (errors.length) {
    return invalidResult({
      sourceUrl,
      compressed,
      responseSize,
      parsedSize,
      warnings,
      errors,
    });
  }

  if (rootName !== "sitemapindex" && rootName !== "urlset") {
    return invalidResult({
      sourceUrl,
      compressed,
      responseSize,
      parsedSize,
      warnings,
      errors: [
        {
          code: "UNSUPPORTED_ROOT",
          message: "The XML root element is not a supported sitemap type.",
        },
      ],
    });
  }

  if (rootName === "sitemapindex") {
    return {
      detectedType: indexItems.length ? "SITEMAP_INDEX" : "INVALID",
      sourceUrl,
      compressed,
      responseSize,
      parsedSize,
      itemCount: indexItems.length,
      items: indexItems.length ? indexItems : [],
      warnings,
      errors: indexItems.length
        ? []
        : [{ code: "EMPTY_SITEMAP", message: "The sitemap index is empty." }],
    } as SitemapParseResult;
  }

  return {
    detectedType: urlItems.length ? "URL_SET" : "INVALID",
    sourceUrl,
    compressed,
    responseSize,
    parsedSize,
    itemCount: urlItems.length,
    items: urlItems.length ? urlItems : [],
    warnings,
    errors: urlItems.length
      ? []
      : [{ code: "EMPTY_SITEMAP", message: "The URL set is empty." }],
  } as SitemapParseResult;
}

function finalizeIndexItem(
  item: CurrentItem,
  items: SitemapIndexItem[],
  seenEntries: Set<string>,
  warnings: SitemapParseIssue[]
) {
  const loc = item.loc?.trim();

  if (!loc) {
    warnings.push({ code: "MISSING_LOC", message: "Skipped sitemap without loc." });
    return;
  }

  const normalizedLoc = normalizeLoc(loc, warnings);

  if (!normalizedLoc) {
    return;
  }

  if (seenEntries.has(normalizedLoc)) {
    warnings.push({
      code: "DUPLICATE_ENTRY",
      message: "Skipped duplicate sitemap entry.",
    });
    return;
  }

  seenEntries.add(normalizedLoc);

  const parsedLastmod = parseLastmod(item.lastmod, warnings);
  items.push({
    loc: normalizedLoc,
    ...(parsedLastmod ? { lastmod: parsedLastmod } : {}),
  });
}

function finalizeUrlItem(
  item: CurrentItem,
  items: SitemapUrlItem[],
  seenEntries: Set<string>,
  warnings: SitemapParseIssue[]
) {
  const loc = item.loc?.trim();

  if (!loc) {
    warnings.push({ code: "MISSING_LOC", message: "Skipped URL without loc." });
    return;
  }

  const normalizedLoc = normalizeLoc(loc, warnings);

  if (!normalizedLoc) {
    return;
  }

  if (seenEntries.has(normalizedLoc)) {
    warnings.push({
      code: "DUPLICATE_ENTRY",
      message: "Skipped duplicate URL entry.",
    });
    return;
  }

  seenEntries.add(normalizedLoc);

  const parsedLastmod = parseLastmod(item.lastmod, warnings);
  const parsedPriority = parsePriority(item.priority, warnings);
  const changefreq = item.changefreq?.trim().toLowerCase();
  items.push({
    loc: normalizedLoc,
    ...(parsedLastmod ? { lastmod: parsedLastmod } : {}),
    ...(changefreq && VALID_CHANGEFREQ.has(changefreq) ? { changefreq } : {}),
    ...(parsedPriority !== undefined ? { priority: parsedPriority } : {}),
  });
}

function normalizeLoc(loc: string, warnings: SitemapParseIssue[]) {
  try {
    return normalizeAbsoluteUrl(loc).normalizedUrl;
  } catch {
    warnings.push({
      code: "INVALID_URL",
      message: "Skipped entry with an invalid URL.",
    });
    return null;
  }
}

function parseLastmod(value: string | undefined, warnings: SitemapParseIssue[]) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  const date = new Date(trimmed);

  if (Number.isNaN(date.getTime())) {
    warnings.push({
      code: "INVALID_LASTMOD",
      message: "Skipped invalid lastmod value.",
    });
    return undefined;
  }

  return trimmed;
}

function parsePriority(value: string | undefined, warnings: SitemapParseIssue[]) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  const priority = Number(trimmed);

  if (!Number.isFinite(priority) || priority < 0 || priority > 1) {
    warnings.push({
      code: "INVALID_PRIORITY",
      message: "Skipped invalid priority value.",
    });
    return undefined;
  }

  return priority;
}

function localName(name: string) {
  return name.toLowerCase().split(":").pop() ?? name.toLowerCase();
}

function decodeXmlText(text: string) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function invalidResult({
  sourceUrl,
  compressed,
  responseSize,
  parsedSize,
  warnings = [],
  errors,
}: {
  sourceUrl: string;
  compressed: boolean;
  responseSize: number;
  parsedSize: number;
  warnings?: SitemapParseIssue[];
  errors: SitemapParseIssue[];
}): InvalidSitemapParseResult {
  return {
    detectedType: "INVALID",
    sourceUrl,
    compressed,
    responseSize,
    parsedSize,
    itemCount: 0,
    items: [],
    warnings,
    errors,
  };
}
