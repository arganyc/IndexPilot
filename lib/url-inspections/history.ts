import "server-only";

import type { UrlInspectionStatus } from "@/lib/url-inspections/validation";

export type InspectionHistoryWebsite = {
  id: string;
  name: string;
  domain: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  organizationId?: string | null;
};

export type InspectionHistoryItem = {
  id: string;
  inspectedUrl: string;
  status: UrlInspectionStatus;
  verdict: string | null;
  coverageState: string | null;
  createdAt: Date;
  completedAt: Date | null;
  searchConsolePropertyId: string;
  searchConsoleProperty: {
    siteUrl: string;
  } | null;
};

export type InspectionHistoryPropertyOption = {
  id: string;
  siteUrl: string;
};

export type InspectionHistoryRepository = {
  getWebsite: (input: {
    websiteId: string;
    organizationId: string;
  }) => Promise<InspectionHistoryWebsite | null>;
  listInspectionPropertyOptions: (input: {
    websiteId: string;
    organizationId: string;
  }) => Promise<InspectionHistoryPropertyOption[]>;
  listRecentInspections: (input: {
    websiteId: string;
    organizationId: string;
    limit: number;
    search: string;
    status: UrlInspectionStatus | null;
    selectedPropertyId: string | null;
  }) => Promise<InspectionHistoryItem[]>;
};

export type InspectionHistoryPageData =
  | {
      ok: true;
      website: InspectionHistoryWebsite;
      inspections: InspectionHistoryItem[];
      propertyOptions: InspectionHistoryPropertyOption[];
      search: string;
      status: UrlInspectionStatus | null;
      selectedPropertyId: string | null;
      hasActiveProperty: boolean;
      hasActiveFilters: boolean;
    }
  | {
      ok: false;
      reason: "NOT_FOUND" | "UNAUTHORIZED";
    };

export const inspectionHistoryLimit = 25;
export const inspectionHistorySearchMaxLength = 200;

export type InspectionHistorySearchParams = {
  q?: string | string[];
  status?: string | string[];
  property?: string | string[];
};

export type InspectionHistoryStatusFilterOption = {
  value: "all" | "pending" | "running" | "completed" | "failed";
  label: string;
  status: UrlInspectionStatus | null;
};

export const inspectionHistoryStatusFilterOptions = [
  { value: "all", label: "All statuses", status: null },
  { value: "pending", label: "Pending", status: "PENDING" },
  { value: "running", label: "Running", status: "RUNNING" },
  { value: "completed", label: "Completed", status: "COMPLETED" },
  { value: "failed", label: "Failed", status: "FAILED" },
] as const satisfies readonly InspectionHistoryStatusFilterOption[];

const statusQueryValues = new Map<string, UrlInspectionStatus>(
  inspectionHistoryStatusFilterOptions.flatMap((option) =>
    option.status ? [[option.value, option.status]] : []
  )
);

export function parseInspectionHistorySearch(
  searchParams: InspectionHistorySearchParams
) {
  const value = firstParam(searchParams.q);

  return typeof value === "string"
    ? value.trim().slice(0, inspectionHistorySearchMaxLength)
    : "";
}

export function normalizeInspectionHistoryStatus(
  value: string | string[] | undefined
): UrlInspectionStatus | null {
  const rawValue = firstParam(value);

  if (typeof rawValue !== "string") {
    return null;
  }

  const normalizedValue = rawValue.trim().toLowerCase();

  if (!normalizedValue || normalizedValue === "all") {
    return null;
  }

  return statusQueryValues.get(normalizedValue) ?? null;
}

export function getInspectionHistoryStatusQueryValue(
  status: UrlInspectionStatus | null
): InspectionHistoryStatusFilterOption["value"] {
  return (
    inspectionHistoryStatusFilterOptions.find(
      (option) => option.status === status
    )?.value ?? "all"
  );
}

export function normalizeInspectionHistoryPropertyCandidate(
  value: string | string[] | undefined
): string | null {
  const rawValue = firstParam(value);

  if (typeof rawValue !== "string") {
    return null;
  }

  const normalizedValue = rawValue.trim();

  if (!normalizedValue || normalizedValue.toLowerCase() === "all") {
    return null;
  }

  return normalizedValue;
}

export function validateInspectionHistoryPropertyId({
  propertyId,
  propertyOptions,
}: {
  propertyId: string | null;
  propertyOptions: InspectionHistoryPropertyOption[];
}) {
  if (!propertyId) {
    return null;
  }

  return propertyOptions.some((option) => option.id === propertyId)
    ? propertyId
    : null;
}

export type InspectionHistorySummary = {
  loaded: number;
  completed: number;
  failed: number;
  inProgress: number;
};

export function getInspectionHistorySummary(
  inspections: InspectionHistoryItem[]
): InspectionHistorySummary {
  return inspections.reduce(
    (summary, inspection) => {
      summary.loaded += 1;

      if (inspection.status === "COMPLETED") {
        summary.completed += 1;
      } else if (inspection.status === "FAILED") {
        summary.failed += 1;
      } else if (inspection.status === "PENDING" || inspection.status === "RUNNING") {
        summary.inProgress += 1;
      }

      return summary;
    },
    {
      loaded: 0,
      completed: 0,
      failed: 0,
      inProgress: 0,
    }
  );
}

export async function getInspectionHistoryPageData({
  websiteId,
  organizationId,
  searchParams = {},
  repository,
}: {
  websiteId: string;
  organizationId: string;
  searchParams?: InspectionHistorySearchParams;
  repository: InspectionHistoryRepository;
}): Promise<InspectionHistoryPageData> {
  const website = await repository.getWebsite({ websiteId, organizationId });

  if (!website) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  if (website.organizationId && website.organizationId !== organizationId) {
    return { ok: false, reason: "UNAUTHORIZED" };
  }

  const search = parseInspectionHistorySearch(searchParams);
  const status = normalizeInspectionHistoryStatus(searchParams.status);
  const propertyOptions = await repository.listInspectionPropertyOptions({
    websiteId,
    organizationId,
  });
  const selectedPropertyId = validateInspectionHistoryPropertyId({
    propertyId: normalizeInspectionHistoryPropertyCandidate(searchParams.property),
    propertyOptions,
  });
  const hasActiveProperty = selectedPropertyId !== null;
  const hasActiveFilters = Boolean(search || status || selectedPropertyId);
  const inspections = await repository.listRecentInspections({
    websiteId,
    organizationId,
    limit: inspectionHistoryLimit,
    search,
    status,
    selectedPropertyId,
  });

  return {
    ok: true,
    website,
    inspections,
    propertyOptions,
    search,
    status,
    selectedPropertyId,
    hasActiveProperty,
    hasActiveFilters,
  };
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
