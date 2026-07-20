import "server-only";

import { getCurrentOrganizationContext } from "@/lib/auth/organization";
import type { UrlInspectionStatus } from "@/lib/url-inspections/validation";

export type UrlInspectionDetailsWebsite = {
  id: string;
  organizationId?: string | null;
};

export type UrlInspectionDetailsRecord = {
  inspectedUrl: string;
  status: UrlInspectionStatus;
  verdict: string | null;
  coverageState: string | null;
  indexingState: string | null;
  robotsTxtState: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  completedAt: Date | null;
  pageFetchState: string | null;
  crawledAs: string | null;
  userCanonical: string | null;
  googleCanonical: string | null;
  lastCrawlTime: Date | null;
};

export type UrlInspectionDetailsRepository = {
  getWebsiteById: (
    websiteId: string
  ) => Promise<UrlInspectionDetailsWebsite | null>;
  getInspectionDetails: (input: {
    websiteId: string;
    inspectionId: string;
    organizationId: string;
  }) => Promise<UrlInspectionDetailsRecord | null>;
};

export type UrlInspectionDetailsPageAccess =
  | {
      ok: true;
      organizationId: string;
      inspection: UrlInspectionDetailsRecord;
    }
  | {
      ok: false;
      reason: "NOT_FOUND" | "UNAUTHORIZED";
    };

export async function verifyUrlInspectionDetailsPageAccess({
  websiteId,
  inspectionId,
  repository,
  getOrganizationContext = getCurrentOrganizationContext,
}: {
  websiteId: string;
  inspectionId: string;
  repository: UrlInspectionDetailsRepository;
  getOrganizationContext?: typeof getCurrentOrganizationContext;
}): Promise<UrlInspectionDetailsPageAccess> {
  let organizationId: string;

  try {
    ({ organizationId } = await getOrganizationContext());
  } catch {
    return { ok: false, reason: "UNAUTHORIZED" };
  }

  const website = await repository.getWebsiteById(websiteId);

  if (!website) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  if (website.organizationId && website.organizationId !== organizationId) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  const inspection = await repository.getInspectionDetails({
    websiteId,
    inspectionId,
    organizationId,
  });

  if (!inspection) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  return { ok: true, organizationId, inspection };
}
