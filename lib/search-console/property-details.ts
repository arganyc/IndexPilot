import "server-only";

export type SearchConsolePropertySyncStatus = "ACTIVE" | "MISSING" | "ERROR";

export type SearchConsolePropertyDetailsRecord = {
  id: string;
  organizationId: string;
  siteUrl: string;
  normalizedSiteUrl: string;
  propertyType: string;
  permissionLevel: string;
  verified: boolean;
  syncStatus: SearchConsolePropertySyncStatus;
  lastSyncedAt: Date | null;
  lastSeenAt: Date | null;
  removedFromGoogleAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  googleAccount: {
    id: string;
    organizationId: string;
    email: string;
    displayName: string | null;
  } | null;
  website: {
    id: string;
    organizationId?: string | null;
    name: string;
    domain: string;
    status: string;
  } | null;
};

export type SearchConsolePropertyDetailsRepository = {
  getPropertyById: (
    propertyId: string
  ) => Promise<SearchConsolePropertyDetailsRecord | null>;
};

export type SearchConsolePropertyDetailsResult =
  | {
      ok: true;
      property: SearchConsolePropertyDetailsRecord;
    }
  | {
      ok: false;
      reason:
        | "NOT_FOUND"
        | "MISSING_GOOGLE_ACCOUNT"
        | "INVALID_GOOGLE_ACCOUNT_ORG"
        | "INVALID_LINKED_WEBSITE_ORG";
    };

export type PropertyBadgeView = {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className?: string;
};

export type PropertyDetailsViewModel = {
  id: string;
  title: string;
  googleSearchConsoleUrl: string;
  isLinked: boolean;
  isArchivedWebsite: boolean;
  statusBadge: PropertyBadgeView;
  verificationBadge: PropertyBadgeView;
  linkBadge: PropertyBadgeView;
  propertyTypeBadge: PropertyBadgeView;
  details: {
    label: string;
    value: string;
    placeholder: boolean;
  }[];
};

export async function getSearchConsolePropertyDetails({
  propertyId,
  organizationId,
  repository,
}: {
  propertyId: string;
  organizationId: string;
  repository: SearchConsolePropertyDetailsRepository;
}): Promise<SearchConsolePropertyDetailsResult> {
  const property = await repository.getPropertyById(propertyId);

  if (!property || property.organizationId !== organizationId) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  if (!property.googleAccount) {
    return { ok: false, reason: "MISSING_GOOGLE_ACCOUNT" };
  }

  if (property.googleAccount.organizationId !== organizationId) {
    return { ok: false, reason: "INVALID_GOOGLE_ACCOUNT_ORG" };
  }

  if (
    property.website?.organizationId &&
    property.website.organizationId !== organizationId
  ) {
    return { ok: false, reason: "INVALID_LINKED_WEBSITE_ORG" };
  }

  return { ok: true, property };
}

export function buildSearchConsolePropertyDetailsViewModel(
  property: SearchConsolePropertyDetailsRecord
): PropertyDetailsViewModel {
  return {
    id: property.id,
    title: property.siteUrl,
    googleSearchConsoleUrl: buildGoogleSearchConsolePropertyUrl(property.siteUrl),
    isLinked: Boolean(property.website),
    isArchivedWebsite: property.website?.status === "ARCHIVED",
    statusBadge: getSyncStatusBadge(property.syncStatus),
    verificationBadge: property.verified
      ? { label: "Verified", variant: "default" }
      : { label: "Unverified", variant: "secondary" },
    linkBadge: property.website
      ? { label: "Linked", variant: "default" }
      : { label: "Unlinked", variant: "outline" },
    propertyTypeBadge: {
      label: formatSearchConsolePropertyType(property.propertyType),
      variant: "outline",
    },
    details: [
      detail("Full property URL", property.siteUrl),
      detail("Normalized property URL", property.normalizedSiteUrl),
      detail("Property type", formatSearchConsolePropertyType(property.propertyType)),
      detail("Permission level", formatPermissionLevel(property.permissionLevel)),
      detail("Verification status", property.verified ? "Verified" : "Unverified"),
      detail("Sync status", formatSearchConsoleSyncStatus(property.syncStatus)),
      detail("Google account email", property.googleAccount?.email),
      detail("Google account display name", property.googleAccount?.displayName),
      detail("Linked website name", property.website?.name),
      detail("Linked website domain", property.website?.domain),
      detail("Last synchronized date", formatSearchConsoleDate(property.lastSyncedAt)),
      detail("Last seen in Google", formatSearchConsoleDate(property.lastSeenAt)),
      detail(
        "Removed from Google date",
        formatSearchConsoleDate(property.removedFromGoogleAt)
      ),
      detail("Created date", formatSearchConsoleDate(property.createdAt)),
      detail("Updated date", formatSearchConsoleDate(property.updatedAt)),
    ],
  };
}

export function buildGoogleSearchConsolePropertyUrl(siteUrl: string) {
  const url = new URL("https://search.google.com/search-console");
  url.searchParams.set("resource_id", siteUrl);

  return url.toString();
}

export function formatSearchConsolePropertyType(value: string) {
  if (value === "DOMAIN") {
    return "Domain property";
  }

  if (value === "URL_PREFIX") {
    return "URL-prefix property";
  }

  return toReadableLabel(value);
}

export function formatSearchConsoleSyncStatus(
  value: SearchConsolePropertySyncStatus
) {
  return toReadableLabel(value);
}

export function formatPermissionLevel(value: string) {
  if (!value) {
    return "Not available";
  }

  return value
    .replace(/^site/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());
}

export function getSyncStatusBadge(
  status: SearchConsolePropertySyncStatus
): PropertyBadgeView {
  if (status === "ACTIVE") {
    return { label: "Active", variant: "default" };
  }

  if (status === "MISSING") {
    return {
      label: "Missing",
      variant: "secondary",
      className: "border-amber-200 bg-amber-100 text-amber-900",
    };
  }

  return { label: "Error", variant: "destructive" };
}

function detail(label: string, value: string | null | undefined) {
  const safeValue = value || "Not available";

  return {
    label,
    value: safeValue,
    placeholder: safeValue === "Not available",
  };
}

export function formatSearchConsoleDate(date: Date | null) {
  if (!date) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function toReadableLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}
