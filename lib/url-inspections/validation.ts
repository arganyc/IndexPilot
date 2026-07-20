import { z } from "zod";

import { isValidInspectionUrl, normalizeInspectionUrl } from "@/lib/url-inspections/url";

export const urlInspectionStatusValues = [
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
] as const;

export type UrlInspectionStatus = (typeof urlInspectionStatusValues)[number];

export const activeUrlInspectionStatuses = ["PENDING", "RUNNING"] as const;

const requiredId = (label: string) =>
  z.string().trim().min(1, `${label} is required.`);

const nullableUrl = z
  .string()
  .trim()
  .url("Enter a valid URL.")
  .nullable()
  .optional();

export const createUrlInspectionSchema = z.object({
  organizationId: requiredId("Organization"),
  websiteId: requiredId("Website"),
  searchConsolePropertyId: requiredId("Search Console property"),
  urlRecordId: requiredId("URL record").nullable().optional(),
  inspectedUrl: z
    .string()
    .trim()
    .min(1, "Inspected URL is required.")
    .refine(isValidInspectionUrl, "Enter a valid HTTP or HTTPS URL."),
});

export const updateUrlInspectionStatusSchema = z.object({
  id: requiredId("Inspection"),
  organizationId: requiredId("Organization"),
  status: z.enum(urlInspectionStatusValues),
});

export const completedUrlInspectionResultSchema = z.object({
  id: requiredId("Inspection"),
  organizationId: requiredId("Organization"),
  completedAt: z.date(),
  status: z.literal("COMPLETED"),
  inspectionResultLink: nullableUrl,
  verdict: z.string().trim().min(1).nullable().optional(),
  coverageState: z.string().trim().min(1).nullable().optional(),
  indexingState: z.string().trim().min(1).nullable().optional(),
  robotsTxtState: z.string().trim().min(1).nullable().optional(),
  pageFetchState: z.string().trim().min(1).nullable().optional(),
  googleCanonical: nullableUrl,
  userCanonical: nullableUrl,
  lastCrawlTime: z.date().nullable().optional(),
  crawledAs: z.string().trim().min(1).nullable().optional(),
  referringUrls: z.array(z.string().trim().url()).nullable().optional(),
  sitemapUrls: z.array(z.string().trim().url()).nullable().optional(),
  rawResponse: z.unknown().nullable().optional(),
});

export const failedUrlInspectionResultSchema = z.object({
  id: requiredId("Inspection"),
  organizationId: requiredId("Organization"),
  completedAt: z.date(),
  status: z.literal("FAILED"),
  errorCode: z.string().trim().min(1, "Error code is required."),
  errorMessage: z
    .string()
    .trim()
    .min(1, "Error message is required.")
    .max(500, "Error message must be 500 characters or fewer."),
  rawResponse: z.unknown().nullable().optional(),
});

export type CreateUrlInspectionInput = z.infer<typeof createUrlInspectionSchema>;
export type UpdateUrlInspectionStatusInput = z.infer<
  typeof updateUrlInspectionStatusSchema
>;
export type CompletedUrlInspectionResultInput = z.infer<
  typeof completedUrlInspectionResultSchema
>;
export type FailedUrlInspectionResultInput = z.infer<
  typeof failedUrlInspectionResultSchema
>;

export type UrlInspectionCreateData = CreateUrlInspectionInput & {
  normalizedUrl: string;
  status: "PENDING";
};

export type ActiveInspectionCandidate = {
  organizationId: string;
  searchConsolePropertyId: string;
  normalizedUrl: string;
  status: UrlInspectionStatus;
};

export function prepareUrlInspectionCreateData(
  input: CreateUrlInspectionInput
): UrlInspectionCreateData {
  const parsed = createUrlInspectionSchema.parse(input);
  const { normalizedUrl } = normalizeInspectionUrl(parsed.inspectedUrl);

  return {
    ...parsed,
    normalizedUrl,
    status: "PENDING",
  };
}

export function isActiveUrlInspectionStatus(status: UrlInspectionStatus) {
  return activeUrlInspectionStatuses.includes(
    status as (typeof activeUrlInspectionStatuses)[number]
  );
}

export function hasDuplicateActiveInspection({
  inspections,
  organizationId,
  searchConsolePropertyId,
  normalizedUrl,
}: {
  inspections: ActiveInspectionCandidate[];
  organizationId: string;
  searchConsolePropertyId: string;
  normalizedUrl: string;
}) {
  return inspections.some(
    (inspection) =>
      inspection.organizationId === organizationId &&
      inspection.searchConsolePropertyId === searchConsolePropertyId &&
      inspection.normalizedUrl === normalizedUrl &&
      isActiveUrlInspectionStatus(inspection.status)
  );
}
