import "server-only";

import { getCurrentOrganizationContext } from "@/lib/auth/organization";
import { isSearchConsolePropertyCompatibleWithWebsite } from "@/lib/url-inspections/property-compatibility";

export type InspectionFormWebsite = {
  id: string;
  name: string;
  domain: string;
  normalizedDomain: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  organizationId?: string | null;
};

export type InspectionFormProperty = {
  id: string;
  organizationId: string;
  siteUrl: string;
  normalizedSiteUrl: string;
  propertyType: string;
  verified: boolean;
  syncStatus: "ACTIVE" | "MISSING" | "ERROR";
  googleAccount: {
    email: string;
  };
};

export type InspectionFormUrlRecord = {
  id: string;
  websiteId: string;
  url: string;
};

export type UrlInspectionFormRepository = {
  getWebsite: (input: {
    websiteId: string;
    organizationId: string;
  }) => Promise<InspectionFormWebsite | null>;
  countGoogleAccounts: (input: { organizationId: string }) => Promise<number>;
  listSearchConsoleProperties: (input: {
    organizationId: string;
  }) => Promise<InspectionFormProperty[]>;
  getUrlRecord: (input: {
    websiteId: string;
    urlRecordId: string;
  }) => Promise<InspectionFormUrlRecord | null>;
};

export type UrlInspectionFormPageData =
  | {
      ok: true;
      website: InspectionFormWebsite;
      compatibleProperties: InspectionFormProperty[];
      defaultPropertyId: string;
      prefillUrl: string;
      invalidUrlRecordId: boolean;
      hasGoogleAccounts: boolean;
    }
  | {
      ok: false;
      reason: "NOT_FOUND" | "UNAUTHORIZED";
    };

export async function getUrlInspectionFormPageData({
  websiteId,
  urlRecordId,
  repository,
  getOrganizationContext = getCurrentOrganizationContext,
}: {
  websiteId: string;
  urlRecordId?: string;
  repository: UrlInspectionFormRepository;
  getOrganizationContext?: typeof getCurrentOrganizationContext;
}): Promise<UrlInspectionFormPageData> {
  let organizationId: string;

  try {
    ({ organizationId } = await getOrganizationContext());
  } catch {
    return { ok: false, reason: "UNAUTHORIZED" };
  }

  const website = await repository.getWebsite({ websiteId, organizationId });

  if (!website) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  if (website.organizationId && website.organizationId !== organizationId) {
    return { ok: false, reason: "UNAUTHORIZED" };
  }

  const [googleAccountCount, properties] = await Promise.all([
    repository.countGoogleAccounts({ organizationId }),
    repository.listSearchConsoleProperties({ organizationId }),
  ]);
  const compatibleProperties = properties.filter(
    (property) =>
      property.organizationId === organizationId &&
      property.syncStatus === "ACTIVE" &&
      property.verified &&
      isSearchConsolePropertyCompatibleWithWebsite({
        propertySiteUrl: property.siteUrl,
        website,
      })
  );
  let prefillUrl = "";
  let invalidUrlRecordId = false;

  if (urlRecordId) {
    const urlRecord = await repository.getUrlRecord({ websiteId, urlRecordId });

    if (urlRecord?.websiteId === websiteId) {
      prefillUrl = urlRecord.url;
    } else {
      invalidUrlRecordId = true;
    }
  }

  return {
    ok: true,
    website,
    compatibleProperties,
    defaultPropertyId:
      compatibleProperties.length === 1 ? compatibleProperties[0]?.id ?? "" : "",
    prefillUrl,
    invalidUrlRecordId,
    hasGoogleAccounts: googleAccountCount > 0,
  };
}
