import { z } from "zod";

import { isValidAbsoluteUrl } from "@/lib/sitemaps/url";

export const sitemapTypeValues = ["INDEX", "URL_SET", "UNKNOWN"] as const;

export const sitemapStatusValues = [
  "PENDING",
  "FETCHING",
  "IMPORTED",
  "FAILED",
  "ARCHIVED",
] as const;

export const sitemapTypeLabels: Record<
  (typeof sitemapTypeValues)[number],
  string
> = {
  INDEX: "Index",
  URL_SET: "URL set",
  UNKNOWN: "Unknown",
};

export const sitemapStatusLabels: Record<
  (typeof sitemapStatusValues)[number],
  string
> = {
  PENDING: "Pending",
  FETCHING: "Fetching",
  IMPORTED: "Imported",
  FAILED: "Failed",
  ARCHIVED: "Archived",
};

export const sitemapFormSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "Sitemap URL is required.")
    .refine(isValidAbsoluteUrl, "Enter a valid absolute sitemap URL."),
  type: z.enum(sitemapTypeValues, "Select a sitemap type."),
  parentSitemapId: z.string().optional(),
});

export const sitemapTypeFormSchema = z.object({
  type: z.enum(sitemapTypeValues, "Select a sitemap type."),
});

export type SitemapFormInput = z.infer<typeof sitemapFormSchema>;
export type SitemapTypeFormInput = z.infer<typeof sitemapTypeFormSchema>;
