import "server-only";

import { sanitizeInspectionErrorMessage } from "@/lib/url-inspections/service";
import type { UrlInspectionStatus } from "@/lib/url-inspections/validation";

export type UrlInspectionResultWebsite = {
  id: string;
  name: string;
  domain: string;
  organizationId?: string | null;
};

export type UrlInspectionResultRecord = {
  id: string;
  organizationId: string;
  websiteId: string;
  searchConsolePropertyId: string;
  urlRecordId: string | null;
  inspectedUrl: string;
  requestedAt: Date;
  completedAt: Date | null;
  status: UrlInspectionStatus;
  inspectionResultLink: string | null;
  verdict: string | null;
  coverageState: string | null;
  indexingState: string | null;
  robotsTxtState: string | null;
  pageFetchState: string | null;
  googleCanonical: string | null;
  userCanonical: string | null;
  lastCrawlTime: Date | null;
  crawledAs: string | null;
  referringUrls: unknown;
  sitemapUrls: unknown;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  website: UrlInspectionResultWebsite;
  searchConsoleProperty: {
    id: string;
    organizationId: string;
    siteUrl: string;
    normalizedSiteUrl: string;
  };
};

export type UrlInspectionResultRepository = {
  getWebsiteById: (
    websiteId: string
  ) => Promise<UrlInspectionResultWebsite | null>;
  getInspectionById: (
    inspectionId: string
  ) => Promise<UrlInspectionResultRecord | null>;
};

export type UrlInspectionResultPageData =
  | {
      ok: true;
      inspection: UrlInspectionResultRecord;
    }
  | {
      ok: false;
      reason: "NOT_FOUND" | "UNAUTHORIZED";
    };

export type ResultBadgeView = {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className?: string;
};

export type ResultDetailView = {
  label: string;
  value: string;
};

export type UrlInspectionResultViewModel = {
  statusBadge: ResultBadgeView;
  verdictBadge: ResultBadgeView | null;
  inspectionDate: string;
  completedDate: string;
  safeErrorCode: string | null;
  safeErrorMessage: string | null;
  googleInspectionResultUrl: string | null;
  indexingSummary: ResultDetailView[];
  crawlDetails: ResultDetailView[];
  canonicalInformation: ResultDetailView[];
  referringUrls: string[];
  sitemapUrls: string[];
};

export async function getUrlInspectionResultPageData({
  websiteId,
  inspectionId,
  organizationId,
  repository,
}: {
  websiteId: string;
  inspectionId: string;
  organizationId: string;
  repository: UrlInspectionResultRepository;
}): Promise<UrlInspectionResultPageData> {
  const [website, inspection] = await Promise.all([
    repository.getWebsiteById(websiteId),
    repository.getInspectionById(inspectionId),
  ]);

  if (!website) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  if (website.organizationId && website.organizationId !== organizationId) {
    return { ok: false, reason: "UNAUTHORIZED" };
  }

  if (
    !inspection ||
    inspection.organizationId !== organizationId ||
    inspection.websiteId !== websiteId ||
    inspection.website.id !== website.id ||
    inspection.searchConsoleProperty.organizationId !== organizationId
  ) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  return {
    ok: true,
    inspection,
  };
}

export function buildUrlInspectionResultViewModel(
  inspection: UrlInspectionResultRecord
): UrlInspectionResultViewModel {
  return {
    statusBadge: getStatusBadge(inspection.status),
    verdictBadge: inspection.verdict ? getVerdictBadge(inspection.verdict) : null,
    inspectionDate: formatInspectionDate(inspection.requestedAt),
    completedDate: formatInspectionDate(inspection.completedAt),
    safeErrorCode: getSafeErrorCode(inspection.errorCode),
    safeErrorMessage: inspection.errorMessage
      ? sanitizeInspectionErrorMessage(inspection.errorMessage)
      : null,
    googleInspectionResultUrl: getSafeGoogleInspectionResultUrl(
      inspection.inspectionResultLink
    ),
    indexingSummary: compactDetails([
      detail("Verdict", formatInspectionLabel(inspection.verdict)),
      detail("Coverage state", formatInspectionLabel(inspection.coverageState)),
      detail("Indexing state", formatInspectionLabel(inspection.indexingState)),
      detail("Robots.txt state", formatInspectionLabel(inspection.robotsTxtState)),
      detail("Page fetch state", formatInspectionLabel(inspection.pageFetchState)),
    ]),
    crawlDetails: compactDetails([
      detail("Last crawl time", formatInspectionDate(inspection.lastCrawlTime)),
      detail("Crawled as", formatInspectionLabel(inspection.crawledAs)),
    ]),
    canonicalInformation: compactDetails([
      detail("Google-selected canonical", inspection.googleCanonical),
      detail("User-declared canonical", inspection.userCanonical),
    ]),
    referringUrls: getStringArray(inspection.referringUrls),
    sitemapUrls: getStringArray(inspection.sitemapUrls),
  };
}

export function getStatusBadge(status: UrlInspectionStatus): ResultBadgeView {
  if (status === "COMPLETED") {
    return { label: "Completed", variant: "default" };
  }

  if (status === "FAILED") {
    return { label: "Failed", variant: "destructive" };
  }

  if (status === "RUNNING") {
    return {
      label: "Running",
      variant: "secondary",
      className: "border-blue-200 bg-blue-100 text-blue-900",
    };
  }

  return { label: "Pending", variant: "outline" };
}

export function getVerdictBadge(verdict: string): ResultBadgeView {
  const normalized = verdict.trim().toUpperCase();

  if (normalized === "PASS") {
    return { label: "Pass", variant: "default" };
  }

  if (normalized === "PARTIAL") {
    return {
      label: "Partial",
      variant: "secondary",
      className: "border-amber-200 bg-amber-100 text-amber-900",
    };
  }

  if (normalized === "FAIL") {
    return { label: "Fail", variant: "destructive" };
  }

  if (normalized === "NEUTRAL") {
    return { label: "Neutral", variant: "secondary" };
  }

  return { label: "Unknown", variant: "outline" };
}

export function formatInspectionDate(date: Date | null) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatInspectionLabel(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function detail(label: string, value: string | null | undefined): ResultDetailView {
  return {
    label,
    value: value?.trim() ?? "",
  };
}

function compactDetails(details: ResultDetailView[]) {
  return details.filter((item) => item.value.length > 0);
}

function getStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === "string" && item.length > 0
  );
}

function getSafeErrorCode(value: string | null) {
  if (!value || !/^[A-Z0-9_:-]{1,80}$/.test(value)) {
    return null;
  }

  return value;
}

function getSafeGoogleInspectionResultUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "https:" || url.hostname !== "search.google.com") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}
