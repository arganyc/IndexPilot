import "server-only";

import type { GoogleAccountRecord, GoogleAccountRepository } from "@/lib/google/accounts";
import { getValidGoogleAccessToken } from "@/lib/google/accounts";
import { getCurrentOrganizationContext } from "@/lib/auth/organization";
import {
  getTokenExpiresAt,
  refreshGoogleAccessToken,
} from "@/lib/google/oauth";
import { encryptSecret, decryptSecret } from "@/lib/security/encryption";
import {
  DEFAULT_URL_INSPECTION_LANGUAGE_CODE,
  GOOGLE_URL_INSPECTION_ENDPOINT,
  URL_INSPECTION_REQUEST_TIMEOUT_MS,
} from "@/lib/url-inspections/google-config";
import { validateUrlInspectionPropertyCompatibility } from "@/lib/url-inspections/property-compatibility";

export type UrlInspectionPropertyForClient = {
  id: string;
  organizationId: string;
  googleAccountId: string;
  siteUrl: string;
  propertyType: string;
  verified: boolean;
  syncStatus: "ACTIVE" | "MISSING" | "ERROR";
};

export type UrlInspectionGoogleRepository = Pick<
  GoogleAccountRepository,
  "updateTokens"
> & {
  getGoogleAccount: (input: {
    organizationId: string;
    googleAccountId: string;
  }) => Promise<GoogleAccountRecord | null>;
  getSearchConsoleProperty: (input: {
    organizationId: string;
    searchConsolePropertyId: string;
  }) => Promise<UrlInspectionPropertyForClient | null>;
};

export type UrlInspectionClientErrorCode =
  | "INVALID_REQUEST"
  | "UNAUTHORIZED"
  | "REVOKED_AUTHORIZATION"
  | "PERMISSION_DENIED"
  | "PROPERTY_MISMATCH"
  | "PROPERTY_INACTIVE"
  | "PROPERTY_UNVERIFIED"
  | "URL_OUTSIDE_PROPERTY"
  | "QUOTA_EXCEEDED"
  | "RATE_LIMITED"
  | "GOOGLE_SERVICE_UNAVAILABLE"
  | "NETWORK_TIMEOUT"
  | "MALFORMED_GOOGLE_RESPONSE"
  | "UNKNOWN_API_ERROR";

export type UrlInspectionClientSuccess = {
  success: true;
  rawResponse: JsonObject;
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
  referringUrls: string[];
  sitemapUrls: string[];
};

export type UrlInspectionClientFailure = {
  success: false;
  errorCode: UrlInspectionClientErrorCode;
  errorMessage: string;
  retryable: boolean;
  httpStatus?: number;
};

export type UrlInspectionClientResult =
  | UrlInspectionClientSuccess
  | UrlInspectionClientFailure;

export type UrlInspectionLogger = {
  warn?: (event: string, metadata: Record<string, string | number | boolean>) => void;
  info?: (event: string, metadata: Record<string, string | number | boolean>) => void;
};

type JsonObject = Record<string, unknown>;

type GoogleApiErrorPayload = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: Array<{ reason?: string }>;
  };
};

export async function inspectUrlWithGoogle({
  googleAccountId,
  searchConsolePropertyId,
  inspectedUrl,
  languageCode = DEFAULT_URL_INSPECTION_LANGUAGE_CODE,
  repository,
  fetchUrl = fetch,
  organizationId,
  signal,
  timeoutMs = URL_INSPECTION_REQUEST_TIMEOUT_MS,
  logger,
  now,
}: {
  googleAccountId: string;
  searchConsolePropertyId: string;
  inspectedUrl: string;
  languageCode?: string;
  repository: UrlInspectionGoogleRepository;
  fetchUrl?: typeof fetch;
  organizationId?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  logger?: UrlInspectionLogger;
  now?: () => Date;
}): Promise<UrlInspectionClientResult> {
  const currentOrganizationId =
    organizationId ?? (await getCurrentOrganizationContext()).organizationId;
  const account = await repository.getGoogleAccount({
    organizationId: currentOrganizationId,
    googleAccountId,
  });

  if (!account) {
    return failure("UNAUTHORIZED", "Google account was not found.", false);
  }

  const property = await repository.getSearchConsoleProperty({
    organizationId: currentOrganizationId,
    searchConsolePropertyId,
  });

  const validation = validateInspectionRequest({
    account,
    property,
    inspectedUrl,
  });

  if (!validation.valid) {
    return validation.failure;
  }

  const accessToken = await getAccessTokenResult({
    account,
    organizationId: currentOrganizationId,
    repository,
    fetchUrl,
    now,
  });

  if (!accessToken.success) {
    return accessToken;
  }

  const firstAttempt = await callUrlInspectionApi({
    accessToken: accessToken.token,
    propertySiteUrl: validation.property.siteUrl,
    inspectedUrl: validation.normalizedInspectionUrl,
    languageCode,
    fetchUrl,
    signal,
    timeoutMs,
  });

  if (firstAttempt.success || firstAttempt.httpStatus !== 401) {
    logResult({ logger, result: firstAttempt, retried: false });
    return firstAttempt;
  }

  const refreshedToken = await forceRefreshAccessToken({
    account,
    organizationId: currentOrganizationId,
    repository,
    fetchUrl,
  });

  if (!refreshedToken.success) {
    logResult({ logger, result: refreshedToken, retried: true });
    return refreshedToken;
  }

  const retryAttempt = await callUrlInspectionApi({
    accessToken: refreshedToken.token,
    propertySiteUrl: validation.property.siteUrl,
    inspectedUrl: validation.normalizedInspectionUrl,
    languageCode,
    fetchUrl,
    signal,
    timeoutMs,
  });

  logResult({ logger, result: retryAttempt, retried: true });
  return retryAttempt;
}

function validateInspectionRequest({
  account,
  property,
  inspectedUrl,
}: {
  account: GoogleAccountRecord;
  property: UrlInspectionPropertyForClient | null;
  inspectedUrl: string;
}):
  | {
      valid: true;
      property: UrlInspectionPropertyForClient;
      normalizedInspectionUrl: string;
    }
  | {
      valid: false;
      failure: UrlInspectionClientFailure;
    } {
  if (!property) {
    return {
      valid: false,
      failure: failure(
        "PERMISSION_DENIED",
        "Search Console property was not found.",
        false
      ),
    };
  }

  if (property.googleAccountId !== account.id) {
    return {
      valid: false,
      failure: failure(
        "PROPERTY_MISMATCH",
        "Search Console property does not belong to the selected Google account.",
        false
      ),
    };
  }

  if (property.syncStatus !== "ACTIVE") {
    return {
      valid: false,
      failure: failure(
        "PROPERTY_INACTIVE",
        "Search Console property must be active before inspection.",
        false
      ),
    };
  }

  if (!property.verified) {
    return {
      valid: false,
      failure: failure(
        "PROPERTY_UNVERIFIED",
        "Search Console property must be verified before inspection.",
        false
      ),
    };
  }

  const compatibility = validateUrlInspectionPropertyCompatibility({
    propertySiteUrl: property.siteUrl,
    inspectedUrl,
  });

  if (!compatibility.compatible) {
    return {
      valid: false,
      failure: failure(
        compatibility.reason === "INVALID_INSPECTION_URL"
          ? "INVALID_REQUEST"
          : compatibility.reason === "MALFORMED_PROPERTY_URL"
            ? "PROPERTY_MISMATCH"
            : "URL_OUTSIDE_PROPERTY",
        compatibility.message,
        false
      ),
    };
  }

  return {
    valid: true,
    property,
    normalizedInspectionUrl: compatibility.normalizedInspectionUrl,
  };
}

async function getAccessTokenResult({
  account,
  organizationId,
  repository,
  fetchUrl,
  now,
}: {
  account: GoogleAccountRecord;
  organizationId: string;
  repository: Pick<GoogleAccountRepository, "updateTokens">;
  fetchUrl: typeof fetch;
  now?: () => Date;
}): Promise<{ success: true; token: string } | UrlInspectionClientFailure> {
  try {
    return {
      success: true,
      token: await getValidGoogleAccessToken({
        account,
        organizationId,
        repository,
        fetchUrl,
        now,
      }),
    };
  } catch {
    return failure(
      "REVOKED_AUTHORIZATION",
      "Google account needs to be reconnected.",
      false
    );
  }
}

async function forceRefreshAccessToken({
  account,
  organizationId,
  repository,
  fetchUrl,
}: {
  account: GoogleAccountRecord;
  organizationId: string;
  repository: Pick<GoogleAccountRepository, "updateTokens">;
  fetchUrl: typeof fetch;
}): Promise<{ success: true; token: string } | UrlInspectionClientFailure> {
  if (!account.refreshToken) {
    return failure(
      "REVOKED_AUTHORIZATION",
      "Google account needs to be reconnected.",
      false,
      401
    );
  }

  try {
    const tokens = await refreshGoogleAccessToken({
      refreshToken: decryptSecret(account.refreshToken),
      fetchUrl,
    });

    await repository.updateTokens({
      organizationId,
      accountId: account.id,
      encryptedAccessToken: encryptSecret(tokens.access_token),
      encryptedRefreshToken: tokens.refresh_token
        ? encryptSecret(tokens.refresh_token)
        : undefined,
      tokenExpiresAt: getTokenExpiresAt(tokens.expires_in),
    });

    return { success: true, token: tokens.access_token };
  } catch {
    return failure(
      "REVOKED_AUTHORIZATION",
      "Google authorization has expired or been revoked.",
      false,
      401
    );
  }
}

async function callUrlInspectionApi({
  accessToken,
  propertySiteUrl,
  inspectedUrl,
  languageCode,
  fetchUrl,
  signal,
  timeoutMs,
}: {
  accessToken: string;
  propertySiteUrl: string;
  inspectedUrl: string;
  languageCode: string;
  fetchUrl: typeof fetch;
  signal?: AbortSignal;
  timeoutMs: number;
}): Promise<UrlInspectionClientResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const abortFromParent = () => controller.abort();

  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeout);
      return failure("NETWORK_TIMEOUT", "URL Inspection request timed out.", true);
    }

    signal.addEventListener("abort", abortFromParent, { once: true });
  }

  try {
    const response = await fetchUrl(GOOGLE_URL_INSPECTION_ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        inspectionUrl: inspectedUrl,
        siteUrl: propertySiteUrl,
        languageCode,
      }),
      signal: controller.signal,
    });
    const payload = await parseJsonObject(response);

    if (!response.ok) {
      return mapGoogleApiError(response.status, payload);
    }

    return normalizeUrlInspectionResponse(payload);
  } catch (error) {
    if (isAbortError(error)) {
      return failure("NETWORK_TIMEOUT", "URL Inspection request timed out.", true);
    }

    return failure(
      "UNKNOWN_API_ERROR",
      "Google URL Inspection request failed.",
      true
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromParent);
  }
}

async function parseJsonObject(response: Response): Promise<JsonObject | null> {
  const payload = (await response.json().catch(() => null)) as unknown;

  return isJsonObject(payload) ? payload : null;
}

export function normalizeUrlInspectionResponse(
  payload: JsonObject | null
): UrlInspectionClientResult {
  if (!payload || !isJsonObject(payload.inspectionResult)) {
    return failure(
      "MALFORMED_GOOGLE_RESPONSE",
      "Google returned an unexpected URL Inspection response.",
      false
    );
  }

  const inspectionResult = payload.inspectionResult;
  const indexStatusResult = isJsonObject(inspectionResult.indexStatusResult)
    ? inspectionResult.indexStatusResult
    : {};

  return {
    success: true,
    rawResponse: payload,
    inspectionResultLink: optionalString(inspectionResult.inspectionResultLink),
    verdict: optionalString(indexStatusResult.verdict),
    coverageState: optionalString(indexStatusResult.coverageState),
    indexingState: optionalString(indexStatusResult.indexingState),
    robotsTxtState: optionalString(indexStatusResult.robotsTxtState),
    pageFetchState: optionalString(indexStatusResult.pageFetchState),
    googleCanonical: optionalString(indexStatusResult.googleCanonical),
    userCanonical: optionalString(indexStatusResult.userCanonical),
    lastCrawlTime: optionalDate(indexStatusResult.lastCrawlTime),
    crawledAs: optionalString(indexStatusResult.crawledAs),
    referringUrls: stringArray(indexStatusResult.referringUrls),
    sitemapUrls: stringArray(
      indexStatusResult.sitemapUrls ?? indexStatusResult.sitemap
    ),
  };
}

function mapGoogleApiError(
  httpStatus: number,
  payload: JsonObject | null
): UrlInspectionClientFailure {
  const googleError = payload as GoogleApiErrorPayload | null;
  const status = googleError?.error?.status;
  const reason = googleError?.error?.details?.find((detail) => detail.reason)
    ?.reason;

  if (httpStatus === 400) {
    return failure("INVALID_REQUEST", "Google rejected the inspection request.", false, httpStatus);
  }

  if (httpStatus === 401) {
    return failure("UNAUTHORIZED", "Google authorization failed.", true, httpStatus);
  }

  if (httpStatus === 403) {
    if (
      status === "RESOURCE_EXHAUSTED" ||
      reason === "quotaExceeded" ||
      reason === "dailyLimitExceeded"
    ) {
      return failure("QUOTA_EXCEEDED", "Google URL Inspection quota was exceeded.", true, httpStatus);
    }

    return failure("PERMISSION_DENIED", "Google denied access to this property or URL.", false, httpStatus);
  }

  if (httpStatus === 429) {
    return failure("RATE_LIMITED", "Google rate limited the URL Inspection request.", true, httpStatus);
  }

  if (httpStatus >= 500 && httpStatus <= 599) {
    return failure("GOOGLE_SERVICE_UNAVAILABLE", "Google URL Inspection is temporarily unavailable.", true, httpStatus);
  }

  return failure("UNKNOWN_API_ERROR", "Google URL Inspection request failed.", false, httpStatus);
}

function failure(
  errorCode: UrlInspectionClientErrorCode,
  errorMessage: string,
  retryable: boolean,
  httpStatus?: number
): UrlInspectionClientFailure {
  return {
    success: false,
    errorCode,
    errorMessage,
    retryable,
    ...(httpStatus ? { httpStatus } : {}),
  };
}

function logResult({
  logger,
  result,
  retried,
}: {
  logger?: UrlInspectionLogger;
  result: UrlInspectionClientResult;
  retried: boolean;
}) {
  if (result.success) {
    logger?.info?.("url_inspection_api_success", { retried });
    return;
  }

  logger?.warn?.("url_inspection_api_failure", {
    errorCode: result.errorCode,
    retryable: result.retryable,
    httpStatus: result.httpStatus ?? 0,
    retried,
  });
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function optionalDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}
