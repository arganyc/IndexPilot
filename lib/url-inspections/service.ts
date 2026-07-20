import "server-only";

import { z } from "zod";

import { getCurrentOrganizationContext } from "@/lib/auth/organization";
import type {
  UrlInspectionClientFailure,
  UrlInspectionClientResult,
  UrlInspectionClientSuccess,
} from "@/lib/url-inspections/google-client";
import { validateUrlInspectionPropertyCompatibility } from "@/lib/url-inspections/property-compatibility";
import { normalizeInspectionUrl } from "@/lib/url-inspections/url";
import {
  type UrlInspectionStatus,
  activeUrlInspectionStatuses,
  isActiveUrlInspectionStatus,
} from "@/lib/url-inspections/validation";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type WebsiteForSingleInspection = {
  id: string;
  domain: string;
  normalizedDomain: string;
  organizationId?: string | null;
};

export type SearchConsolePropertyForSingleInspection = {
  id: string;
  organizationId: string;
  googleAccountId: string;
  websiteId: string | null;
  siteUrl: string;
  propertyType: string;
  verified: boolean;
  syncStatus: "ACTIVE" | "MISSING" | "ERROR";
};

export type UrlRecordForSingleInspection = {
  id: string;
  websiteId: string;
  normalizedUrl: string;
};

export type UrlInspectionLifecycleRecord = {
  id: string;
  status: UrlInspectionStatus;
};

export type CreatePendingInspectionData = {
  organizationId: string;
  websiteId: string;
  searchConsolePropertyId: string;
  urlRecordId?: string | null;
  inspectedUrl: string;
  normalizedUrl: string;
  requestedAt: Date;
};

export type SaveCompletedInspectionData = {
  inspectionId: string;
  organizationId: string;
  completedAt: Date;
  result: PersistedUrlInspectionSuccess;
};

export type SaveFailedInspectionData = {
  inspectionId: string;
  organizationId: string;
  completedAt: Date;
  result: PersistedUrlInspectionFailure;
};

export type PersistedUrlInspectionSuccess = Omit<
  UrlInspectionClientSuccess,
  "rawResponse"
> & {
  rawResponse: JsonValue;
};

export type PersistedUrlInspectionFailure = UrlInspectionClientFailure;

export type SingleUrlInspectionRepository = {
  getWebsite: (input: {
    websiteId: string;
    organizationId: string;
  }) => Promise<WebsiteForSingleInspection | null>;
  getSearchConsoleProperty: (input: {
    searchConsolePropertyId: string;
    organizationId: string;
  }) => Promise<SearchConsolePropertyForSingleInspection | null>;
  getUrlRecord: (input: {
    urlRecordId: string;
    websiteId: string;
  }) => Promise<UrlRecordForSingleInspection | null>;
  findActiveInspection: (input: {
    organizationId: string;
    searchConsolePropertyId: string;
    normalizedUrl: string;
  }) => Promise<UrlInspectionLifecycleRecord | null>;
  createPendingInspection: (
    data: CreatePendingInspectionData
  ) => Promise<UrlInspectionLifecycleRecord>;
  markInspectionRunning: (input: {
    inspectionId: string;
    organizationId: string;
  }) => Promise<void>;
  saveCompletedInspection: (data: SaveCompletedInspectionData) => Promise<void>;
  saveFailedInspection: (data: SaveFailedInspectionData) => Promise<void>;
};

export type RunGoogleSingleUrlInspection = (input: {
  organizationId: string;
  googleAccountId: string;
  searchConsolePropertyId: string;
  inspectedUrl: string;
}) => Promise<UrlInspectionClientResult>;

export type SingleUrlInspectionResult =
  | {
      outcome: "completed";
      inspectionId: string;
    }
  | {
      outcome: "failed";
      inspectionId: string;
      errorCode: string;
      errorMessage: string;
      retryable: boolean;
    }
  | {
      outcome: "alreadyInProgress";
      inspectionId: string;
    }
  | {
      outcome: "validationError";
      errorCode: string;
      errorMessage: string;
    }
  | {
      outcome: "unauthorized";
      errorMessage: string;
    }
  | {
      outcome: "notFound";
      errorMessage: string;
    };

export class DuplicateActiveInspectionError extends Error {
  constructor(readonly inspectionId: string) {
    super("A URL inspection is already in progress.");
  }
}

const singleUrlInspectionInputSchema = z.object({
  websiteId: z.string().trim().min(1, "Website is required."),
  searchConsolePropertyId: z
    .string()
    .trim()
    .min(1, "Search Console property is required."),
  inspectedUrl: z.string().trim().min(1, "Inspected URL is required."),
  urlRecordId: z.string().trim().min(1).optional(),
});

export async function runSingleUrlInspection({
  input,
  repository,
  googleClient,
  getOrganizationContext = getCurrentOrganizationContext,
  now = () => new Date(),
}: {
  input: {
    websiteId: string;
    searchConsolePropertyId: string;
    inspectedUrl: string;
    urlRecordId?: string;
  };
  repository: SingleUrlInspectionRepository;
  googleClient: RunGoogleSingleUrlInspection;
  getOrganizationContext?: typeof getCurrentOrganizationContext;
  now?: () => Date;
}): Promise<SingleUrlInspectionResult> {
  const parsedInput = singleUrlInspectionInputSchema.safeParse(input);

  if (!parsedInput.success) {
    return validationError("INVALID_INPUT", parsedInput.error.issues[0]?.message);
  }

  let organizationId: string;

  try {
    ({ organizationId } = await getOrganizationContext());
  } catch {
    return {
      outcome: "unauthorized",
      errorMessage: "Authentication is required.",
    };
  }

  const { inspectedUrl, searchConsolePropertyId, urlRecordId, websiteId } =
    parsedInput.data;
  let normalizedUrl: string;

  try {
    normalizedUrl = normalizeInspectionUrl(inspectedUrl).normalizedUrl;
  } catch (error) {
    return validationError("INVALID_URL", safeErrorMessage(error));
  }

  const [website, property] = await Promise.all([
    repository.getWebsite({ websiteId, organizationId }),
    repository.getSearchConsoleProperty({
      searchConsolePropertyId,
      organizationId,
    }),
  ]);

  if (!website) {
    return {
      outcome: "notFound",
      errorMessage: "Website was not found.",
    };
  }

  if (website.organizationId && website.organizationId !== organizationId) {
    return {
      outcome: "unauthorized",
      errorMessage: "Website was not found.",
    };
  }

  if (!property) {
    return {
      outcome: "notFound",
      errorMessage: "Search Console property was not found.",
    };
  }

  const validation = await validateInspectionRelationships({
    website,
    property,
    inspectedUrl,
    normalizedUrl,
    urlRecordId,
    repository,
  });

  if (validation) {
    return validation;
  }

  const activeInspection = await repository.findActiveInspection({
    organizationId,
    searchConsolePropertyId,
    normalizedUrl,
  });

  if (activeInspection && isActiveUrlInspectionStatus(activeInspection.status)) {
    return {
      outcome: "alreadyInProgress",
      inspectionId: activeInspection.id,
    };
  }

  let inspection: UrlInspectionLifecycleRecord;

  try {
    inspection = await repository.createPendingInspection({
      organizationId,
      websiteId,
      searchConsolePropertyId,
      urlRecordId: urlRecordId ?? null,
      inspectedUrl,
      normalizedUrl,
      requestedAt: now(),
    });
  } catch (error) {
    if (error instanceof DuplicateActiveInspectionError) {
      return {
        outcome: "alreadyInProgress",
        inspectionId: error.inspectionId,
      };
    }

    throw error;
  }

  await repository.markInspectionRunning({
    inspectionId: inspection.id,
    organizationId,
  });

  const completedAt = now();
  const googleResult = await callGoogleClientSafely({
    googleClient,
    organizationId,
    property,
    inspectedUrl: normalizedUrl,
  });

  if (googleResult.success) {
    await repository.saveCompletedInspection({
      inspectionId: inspection.id,
      organizationId,
      completedAt,
      result: sanitizeCompletedResult(googleResult),
    });

    return {
      outcome: "completed",
      inspectionId: inspection.id,
    };
  }

  await repository.saveFailedInspection({
    inspectionId: inspection.id,
    organizationId,
    completedAt,
    result: sanitizeFailedResult(googleResult),
  });

  return {
    outcome: "failed",
    inspectionId: inspection.id,
    errorCode: googleResult.errorCode,
    errorMessage: googleResult.errorMessage,
    retryable: googleResult.retryable,
  };
}

export function sanitizeUrlInspectionRawResponse(value: unknown): JsonValue {
  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeUrlInspectionRawResponse);
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !isSensitiveKey(key))
        .map(([key, item]) => [key, sanitizeUrlInspectionRawResponse(item)])
    );
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  return null;
}

export function sanitizeInspectionErrorMessage(message: string) {
  return message
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer [redacted]")
    .replace(/(access[_-]?token|refresh[_-]?token)=?[A-Za-z0-9._~+/=-]*/gi, "$1=[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

async function validateInspectionRelationships({
  website,
  property,
  inspectedUrl,
  normalizedUrl,
  urlRecordId,
  repository,
}: {
  website: WebsiteForSingleInspection;
  property: SearchConsolePropertyForSingleInspection;
  inspectedUrl: string;
  normalizedUrl: string;
  urlRecordId?: string;
  repository: SingleUrlInspectionRepository;
}): Promise<SingleUrlInspectionResult | null> {
  if (property.syncStatus !== "ACTIVE") {
    return validationError(
      "PROPERTY_INACTIVE",
      "Search Console property must be active before inspection."
    );
  }

  if (!property.verified) {
    return validationError(
      "PROPERTY_UNVERIFIED",
      "Search Console property must be verified before inspection."
    );
  }

  if (property.websiteId && property.websiteId !== website.id) {
    return validationError(
      "PROPERTY_WEBSITE_MISMATCH",
      "Search Console property is linked to a different website."
    );
  }

  if (!isUrlWithinWebsiteDomain({ website, normalizedUrl })) {
    return validationError(
      "URL_OUTSIDE_WEBSITE",
      "The inspected URL is outside the selected website."
    );
  }

  const compatibility = validateUrlInspectionPropertyCompatibility({
    propertySiteUrl: property.siteUrl,
    inspectedUrl,
  });

  if (!compatibility.compatible) {
    return validationError("PROPERTY_INCOMPATIBLE_URL", compatibility.message);
  }

  if (urlRecordId) {
    const urlRecord = await repository.getUrlRecord({
      urlRecordId,
      websiteId: website.id,
    });

    if (!urlRecord) {
      return validationError(
        "INVALID_URL_RECORD",
        "URL record does not belong to the selected website."
      );
    }
  }

  return null;
}

function isUrlWithinWebsiteDomain({
  website,
  normalizedUrl,
}: {
  website: WebsiteForSingleInspection;
  normalizedUrl: string;
}) {
  const hostname = new URL(normalizedUrl).hostname
    .toLowerCase()
    .replace(/\.$/, "");
  const websiteDomain = website.normalizedDomain.toLowerCase().replace(/\.$/, "");

  return (
    hostname === websiteDomain ||
    hostname === `www.${websiteDomain}` ||
    hostname.endsWith(`.${websiteDomain}`)
  );
}

async function callGoogleClientSafely({
  googleClient,
  organizationId,
  property,
  inspectedUrl,
}: {
  googleClient: RunGoogleSingleUrlInspection;
  organizationId: string;
  property: SearchConsolePropertyForSingleInspection;
  inspectedUrl: string;
}): Promise<UrlInspectionClientResult> {
  try {
    return await googleClient({
      organizationId,
      googleAccountId: property.googleAccountId,
      searchConsolePropertyId: property.id,
      inspectedUrl,
    });
  } catch {
    return {
      success: false,
      errorCode: "UNKNOWN_API_ERROR",
      errorMessage: "Google URL Inspection request failed.",
      retryable: true,
    };
  }
}

function validationError(
  errorCode: string,
  errorMessage = "URL inspection request is invalid."
): SingleUrlInspectionResult {
  return {
    outcome: "validationError",
    errorCode,
    errorMessage,
  };
}

function safeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "URL inspection request is invalid.";
}

function sanitizeCompletedResult(
  result: UrlInspectionClientSuccess
): PersistedUrlInspectionSuccess {
  return {
    ...result,
    rawResponse: sanitizeUrlInspectionRawResponse(result.rawResponse),
  };
}

function sanitizeFailedResult(
  result: UrlInspectionClientFailure
): PersistedUrlInspectionFailure {
  return {
    ...result,
    errorMessage: sanitizeInspectionErrorMessage(result.errorMessage),
  };
}

function isSensitiveKey(key: string) {
  return /authorization|access[_-]?token|refresh[_-]?token|client[_-]?secret|secret/i.test(
    key
  );
}

export const activeSingleUrlInspectionStatuses = activeUrlInspectionStatuses;
