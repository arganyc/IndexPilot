import "server-only";

import dns from "node:dns/promises";
import net from "node:net";
import { performance } from "node:perf_hooks";

import { SITEMAP_IMPORT_LIMITS } from "@/lib/sitemaps/config";

export const SITEMAP_FETCH_USER_AGENT =
  "IndexPilotBot/0.1 (+sitemap-fetcher)";

export const DEFAULT_SITEMAP_FETCH_TIMEOUT_MS =
  SITEMAP_IMPORT_LIMITS.fetchTimeoutMs;
export const DEFAULT_SITEMAP_FETCH_MAX_BYTES =
  SITEMAP_IMPORT_LIMITS.maxResponseBytes;
export const DEFAULT_SITEMAP_FETCH_MAX_REDIRECTS =
  SITEMAP_IMPORT_LIMITS.maxRedirects;

export type SitemapFetchFailureCode =
  | "INVALID_URL"
  | "UNSAFE_HOST"
  | "DNS_FAILED"
  | "TIMEOUT"
  | "REDIRECT_LIMIT"
  | "REDIRECT_LOOP"
  | "RESPONSE_TOO_LARGE"
  | "HTTP_ERROR"
  | "UNSUPPORTED_CONTENT"
  | "FETCH_FAILED";

export type SitemapRedirectHop = {
  fromUrl: string;
  toUrl: string;
  status: number;
};

type SitemapFetchBaseResult = {
  requestedUrl: string;
  finalUrl?: string;
  httpStatus?: number;
  contentType?: string | null;
  responseSize?: number;
  redirectCount: number;
  redirectChain: SitemapRedirectHop[];
  fetchedAt: Date;
  durationMs: number;
  message: string;
};

export type SitemapFetchSuccess = SitemapFetchBaseResult & {
  ok: true;
  finalUrl: string;
  httpStatus: number;
  contentType: string | null;
  responseSize: number;
  rawBody: Uint8Array;
};

export type SitemapFetchFailure = SitemapFetchBaseResult & {
  ok: false;
  code: SitemapFetchFailureCode;
};

export type SitemapFetchResult = SitemapFetchSuccess | SitemapFetchFailure;

export type ResolveHostname = (
  hostname: string
) => Promise<Array<{ address: string; family: number }>>;

export type FetchUrl = (
  url: string,
  init: RequestInit
) => Promise<Response>;

export type SitemapFetcherOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  resolveHostname?: ResolveHostname;
  fetchUrl?: FetchUrl;
};

const ACCEPTED_CONTENT_TYPES = new Set([
  "application/xml",
  "text/xml",
  "application/gzip",
  "application/x-gzip",
  "text/plain",
  "application/octet-stream",
]);

const HTML_PREFIX_PATTERN = /^\s*(?:<!doctype\s+html\b|<html[\s>])/i;
const XML_PREFIX_PATTERN = /^\s*(?:<\?xml\b|<urlset\b|<sitemapindex\b)/i;

export async function fetchSitemap({
  websiteId,
  sitemapUrl,
  options = {},
}: {
  websiteId: string;
  sitemapUrl: string;
  options?: SitemapFetcherOptions;
}): Promise<SitemapFetchResult> {
  void websiteId;

  const startedAt = performance.now();
  const fetchedAt = new Date();
  const maxRedirects =
    options.maxRedirects ?? DEFAULT_SITEMAP_FETCH_MAX_REDIRECTS;
  const maxBytes = options.maxBytes ?? DEFAULT_SITEMAP_FETCH_MAX_BYTES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_SITEMAP_FETCH_TIMEOUT_MS;
  const fetchUrl = options.fetchUrl ?? fetch;
  const resolveHostname = options.resolveHostname ?? defaultResolveHostname;
  const redirectChain: SitemapRedirectHop[] = [];
  const visitedUrls = new Set<string>();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let currentUrl = sitemapUrl;

  function failure(
    code: SitemapFetchFailureCode,
    message: string,
    extra: Partial<SitemapFetchFailure> = {}
  ): SitemapFetchFailure {
    return {
      ok: false,
      code,
      requestedUrl: sitemapUrl,
      finalUrl: currentUrl,
      redirectCount: redirectChain.length,
      redirectChain,
      fetchedAt,
      durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
      message,
      ...extra,
    };
  }

  try {
    for (let redirectIndex = 0; redirectIndex <= maxRedirects; redirectIndex++) {
      const parsedUrl = parseHttpUrl(currentUrl);

      if (!parsedUrl) {
        return failure("INVALID_URL", "Enter a valid HTTP or HTTPS URL.");
      }

      const hostValidation = await validateUrlHost(parsedUrl, resolveHostname);

      if (!hostValidation.ok) {
        return failure(hostValidation.code, hostValidation.message);
      }

      const canonicalUrl = parsedUrl.toString();

      if (visitedUrls.has(canonicalUrl)) {
        return failure("REDIRECT_LOOP", "The sitemap redirects in a loop.");
      }

      visitedUrls.add(canonicalUrl);

      let response: Response;

      try {
        response = await fetchUrl(canonicalUrl, {
          headers: {
            accept:
              "application/xml,text/xml,text/plain,application/octet-stream,*/*;q=0.1",
            "user-agent": SITEMAP_FETCH_USER_AGENT,
          },
          redirect: "manual",
          signal: controller.signal,
        });
      } catch (error) {
        if (isAbortError(error)) {
          return failure("TIMEOUT", "The sitemap fetch timed out.");
        }

        return failure("FETCH_FAILED", "The sitemap could not be fetched.");
      }

      currentUrl = canonicalUrl;

      if (isRedirectStatus(response.status)) {
        const location = response.headers.get("location");

        if (!location) {
          return failure("FETCH_FAILED", "The redirect response was invalid.", {
            httpStatus: response.status,
          });
        }

        if (redirectChain.length >= maxRedirects) {
          return failure("REDIRECT_LIMIT", "The sitemap redirected too many times.", {
            httpStatus: response.status,
          });
        }

        let redirectUrl: URL;

        try {
          redirectUrl = new URL(location, canonicalUrl);
        } catch {
          return failure("INVALID_URL", "The redirect target is not a valid URL.", {
            httpStatus: response.status,
          });
        }

        const toUrl = redirectUrl.toString();
        redirectChain.push({
          fromUrl: canonicalUrl,
          toUrl,
          status: response.status,
        });
        currentUrl = toUrl;
        continue;
      }

      const contentType = getNormalizedContentType(response);
      const bodyResult = await readLimitedResponseBody(response, maxBytes);

      if (!bodyResult.ok) {
        return failure("RESPONSE_TOO_LARGE", "The sitemap response is too large.", {
          httpStatus: response.status,
          contentType,
          responseSize: bodyResult.responseSize,
        });
      }

      const bodyPreview = decodeBodyPreview(bodyResult.rawBody);

      if (HTML_PREFIX_PATTERN.test(bodyPreview)) {
        return failure(
          "UNSUPPORTED_CONTENT",
          "The response appears to be an HTML page, not a sitemap.",
          {
            httpStatus: response.status,
            contentType,
            responseSize: bodyResult.responseSize,
          }
        );
      }

      if (response.status < 200 || response.status >= 300) {
        return failure("HTTP_ERROR", "The sitemap returned an HTTP error.", {
          httpStatus: response.status,
          contentType,
          responseSize: bodyResult.responseSize,
        });
      }

      if (!isSupportedSitemapContent(contentType, bodyPreview)) {
        return failure(
          "UNSUPPORTED_CONTENT",
          "The response content type is not supported for sitemap fetching.",
          {
            httpStatus: response.status,
            contentType,
            responseSize: bodyResult.responseSize,
          }
        );
      }

      return {
        ok: true,
        requestedUrl: sitemapUrl,
        finalUrl: canonicalUrl,
        httpStatus: response.status,
        contentType,
        responseSize: bodyResult.responseSize,
        redirectCount: redirectChain.length,
        redirectChain,
        rawBody: bodyResult.rawBody,
        fetchedAt,
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
        message: "Sitemap fetched successfully.",
      };
    }

    return failure("REDIRECT_LIMIT", "The sitemap redirected too many times.");
  } finally {
    clearTimeout(timeout);
  }
}

export async function defaultResolveHostname(hostname: string) {
  const literalIp = normalizeIpLiteral(hostname);

  if (net.isIP(literalIp)) {
    return [{ address: literalIp, family: net.isIP(literalIp) }];
  }

  return dns.lookup(hostname, { all: true, verbatim: true });
}

export async function validateUrlHost(
  url: URL,
  resolveHostname: ResolveHostname = defaultResolveHostname
): Promise<
  | { ok: true }
  | { ok: false; code: "INVALID_URL" | "UNSAFE_HOST" | "DNS_FAILED"; message: string }
> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, code: "INVALID_URL", message: "Only HTTP and HTTPS URLs are supported." };
  }

  const hostname = normalizeHostname(url.hostname);

  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost")) {
    return { ok: false, code: "UNSAFE_HOST", message: "The sitemap host is not allowed." };
  }

  if (net.isIP(hostname) && !isSafePublicIp(hostname)) {
    return { ok: false, code: "UNSAFE_HOST", message: "The sitemap host resolves to an unsafe address." };
  }

  let addresses: Array<{ address: string; family: number }>;

  try {
    addresses = await resolveHostname(hostname);
  } catch {
    return { ok: false, code: "DNS_FAILED", message: "The sitemap host could not be resolved." };
  }

  if (!addresses.length) {
    return { ok: false, code: "DNS_FAILED", message: "The sitemap host could not be resolved." };
  }

  if (addresses.some(({ address }) => !isSafePublicIp(address))) {
    return {
      ok: false,
      code: "UNSAFE_HOST",
      message: "The sitemap host resolves to an unsafe address.",
    };
  }

  return { ok: true };
}

export function isSafePublicIp(address: string) {
  const normalizedIp = normalizeIpLiteral(address);
  const family = net.isIP(normalizedIp);

  if (family === 4) {
    return isSafePublicIpv4(normalizedIp);
  }

  if (family === 6) {
    return isSafePublicIpv6(normalizedIp);
  }

  return false;
}

function parseHttpUrl(input: string) {
  try {
    const url = new URL(input);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function normalizeHostname(hostname: string) {
  return normalizeIpLiteral(hostname).toLowerCase().replace(/\.$/, "");
}

function normalizeIpLiteral(address: string) {
  return address.trim().replace(/^\[/, "").replace(/\]$/, "").toLowerCase();
}

function isSafePublicIpv4(address: string) {
  const value = ipv4ToInteger(address);

  return (
    value !== null &&
    !isIpv4InRange(value, "0.0.0.0", 8) &&
    !isIpv4InRange(value, "10.0.0.0", 8) &&
    !isIpv4InRange(value, "100.64.0.0", 10) &&
    !isIpv4InRange(value, "127.0.0.0", 8) &&
    !isIpv4InRange(value, "169.254.0.0", 16) &&
    !isIpv4InRange(value, "172.16.0.0", 12) &&
    !isIpv4InRange(value, "192.0.0.0", 24) &&
    !isIpv4InRange(value, "192.0.2.0", 24) &&
    !isIpv4InRange(value, "192.168.0.0", 16) &&
    !isIpv4InRange(value, "198.18.0.0", 15) &&
    !isIpv4InRange(value, "198.51.100.0", 24) &&
    !isIpv4InRange(value, "203.0.113.0", 24) &&
    !isIpv4InRange(value, "224.0.0.0", 4) &&
    !isIpv4InRange(value, "240.0.0.0", 4) &&
    address !== "255.255.255.255" &&
    address !== "169.254.169.254" &&
    address !== "100.100.100.200"
  );
}

function isSafePublicIpv6(address: string) {
  const lowerAddress = address.toLowerCase();

  if (
    lowerAddress === "::" ||
    lowerAddress === "::1" ||
    lowerAddress.startsWith("fc") ||
    lowerAddress.startsWith("fd") ||
    lowerAddress.startsWith("fe8") ||
    lowerAddress.startsWith("fe9") ||
    lowerAddress.startsWith("fea") ||
    lowerAddress.startsWith("feb") ||
    lowerAddress.startsWith("ff") ||
    lowerAddress.startsWith("2001:db8") ||
    lowerAddress.startsWith("2002:") ||
    lowerAddress.startsWith("64:ff9b:1:") ||
    lowerAddress === "fd00:ec2::254"
  ) {
    return false;
  }

  const mappedIpv4 = lowerAddress.match(/(?:::ffff:)(\d+\.\d+\.\d+\.\d+)$/);

  if (mappedIpv4) {
    return isSafePublicIpv4(mappedIpv4[1]);
  }

  return true;
}

function ipv4ToInteger(address: string) {
  const parts = address.split(".").map((part) => Number(part));

  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return null;
  }

  return (
    ((parts[0] << 24) >>> 0) +
    ((parts[1] << 16) >>> 0) +
    ((parts[2] << 8) >>> 0) +
    parts[3]
  );
}

function isIpv4InRange(address: number, rangeStart: string, prefix: number) {
  const start = ipv4ToInteger(rangeStart);

  if (start === null) {
    return false;
  }

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;

  return (address & mask) === (start & mask);
}

function isRedirectStatus(status: number) {
  return status >= 300 && status < 400;
}

function getNormalizedContentType(response: Response) {
  return (
    response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ??
    null
  );
}

async function readLimitedResponseBody(response: Response, maxBytes: number) {
  if (!response.body) {
    const buffer = new Uint8Array(await response.arrayBuffer());

    return buffer.byteLength > maxBytes
      ? { ok: false as const, responseSize: buffer.byteLength }
      : { ok: true as const, responseSize: buffer.byteLength, rawBody: buffer };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let responseSize = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    responseSize += value.byteLength;

    if (responseSize > maxBytes) {
      await reader.cancel();
      return { ok: false as const, responseSize };
    }

    chunks.push(value);
  }

  const rawBody = new Uint8Array(responseSize);
  let offset = 0;

  for (const chunk of chunks) {
    rawBody.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { ok: true as const, responseSize, rawBody };
}

function decodeBodyPreview(rawBody: Uint8Array) {
  return new TextDecoder("utf-8", { fatal: false }).decode(
    rawBody.slice(0, 1024)
  );
}

function isSupportedSitemapContent(
  contentType: string | null,
  bodyPreview: string
) {
  if (contentType?.endsWith("+xml")) {
    return true;
  }

  if (contentType && ACCEPTED_CONTENT_TYPES.has(contentType)) {
    return true;
  }

  return XML_PREFIX_PATTERN.test(bodyPreview);
}

function isAbortError(error: unknown) {
  return (
    error instanceof DOMException && error.name === "AbortError"
  ) || (error instanceof Error && error.name === "AbortError");
}
