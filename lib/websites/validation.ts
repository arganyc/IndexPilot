import { z } from "zod";

import { isValidDomain } from "@/lib/websites/domain";

export const platformValues = [
  "WORDPRESS",
  "NEXTJS",
  "CUSTOM",
  "SHOPIFY",
  "OTHER",
] as const;

export const priorityValues = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const statusValues = ["ACTIVE", "PAUSED", "ARCHIVED"] as const;

export const platformLabels: Record<(typeof platformValues)[number], string> = {
  WORDPRESS: "WordPress",
  NEXTJS: "Next.js",
  CUSTOM: "Custom",
  SHOPIFY: "Shopify",
  OTHER: "Other",
};

export const priorityLabels: Record<(typeof priorityValues)[number], string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const statusLabels: Record<(typeof statusValues)[number], string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  ARCHIVED: "Archived",
};

export const websiteFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Website name must be at least 2 characters.")
    .max(120, "Website name must be 120 characters or fewer."),
  domain: z
    .string()
    .trim()
    .min(1, "Domain is required.")
    .refine(isValidDomain, "Enter a valid domain, like example.com."),
  platform: z.enum(platformValues, "Select a platform."),
  priority: z.enum(priorityValues, "Select a priority."),
  status: z.enum(statusValues, "Select a status."),
  notes: z
    .string()
    .trim()
    .max(2000, "Notes must be 2,000 characters or fewer.")
    .optional()
    .or(z.literal("")),
});

export type WebsiteFormInput = z.infer<typeof websiteFormSchema>;
