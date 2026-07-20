import "server-only";

import { normalizeSearchConsoleSiteUrl } from "@/lib/google/accounts";
import { normalizeInspectionUrl } from "@/lib/url-inspections/url";

export type PropertyCompatibilityResult =
  | {
      compatible: true;
      normalizedInspectionUrl: string;
    }
  | {
      compatible: false;
      reason:
        | "INVALID_INSPECTION_URL"
        | "MALFORMED_PROPERTY_URL"
        | "UNSUPPORTED_PROPERTY_TYPE"
        | "UNRELATED_DOMAIN"
        | "URL_PREFIX_PATH_MISMATCH";
      message: string;
    };

export type WebsiteForPropertyCompatibility = {
  normalizedDomain: string;
};

export function validateUrlInspectionPropertyCompatibility({
  propertySiteUrl,
  inspectedUrl,
}: {
  propertySiteUrl: string;
  inspectedUrl: string;
}): PropertyCompatibilityResult {
  let normalizedInspectionUrl: string;
  let inspectionUrl: URL;

  try {
    normalizedInspectionUrl = normalizeInspectionUrl(inspectedUrl).normalizedUrl;
    inspectionUrl = new URL(normalizedInspectionUrl);
  } catch {
    return {
      compatible: false,
      reason: "INVALID_INSPECTION_URL",
      message: "Enter a valid HTTP or HTTPS URL to inspect.",
    };
  }

  let normalizedPropertyUrl: string;

  try {
    normalizedPropertyUrl = normalizeSearchConsoleSiteUrl(propertySiteUrl);
  } catch {
    return {
      compatible: false,
      reason: "MALFORMED_PROPERTY_URL",
      message: "The selected Search Console property URL is malformed.",
    };
  }

  if (normalizedPropertyUrl.startsWith("sc-domain:")) {
    return validateDomainProperty({
      domain: normalizedPropertyUrl.slice("sc-domain:".length),
      inspectionUrl,
      normalizedInspectionUrl,
    });
  }

  return validateUrlPrefixProperty({
    propertyUrl: normalizedPropertyUrl,
    inspectionUrl,
    normalizedInspectionUrl,
  });
}

export function isSearchConsolePropertyCompatibleWithWebsite({
  propertySiteUrl,
  website,
}: {
  propertySiteUrl: string;
  website: WebsiteForPropertyCompatibility;
}) {
  const websiteDomain = website.normalizedDomain.toLowerCase().replace(/\.$/, "");
  let normalizedPropertyUrl: string;

  try {
    normalizedPropertyUrl = normalizeSearchConsoleSiteUrl(propertySiteUrl);
  } catch {
    return false;
  }

  if (normalizedPropertyUrl.startsWith("sc-domain:")) {
    const propertyDomain = normalizedPropertyUrl.slice("sc-domain:".length);

    return (
      websiteDomain === propertyDomain ||
      websiteDomain.endsWith(`.${propertyDomain}`)
    );
  }

  try {
    const propertyUrl = new URL(normalizedPropertyUrl);
    const propertyHost = propertyUrl.hostname.toLowerCase().replace(/\.$/, "");

    return (
      propertyHost === websiteDomain ||
      propertyHost === `www.${websiteDomain}` ||
      propertyHost.endsWith(`.${websiteDomain}`)
    );
  } catch {
    return false;
  }
}

function validateDomainProperty({
  domain,
  inspectionUrl,
  normalizedInspectionUrl,
}: {
  domain: string;
  inspectionUrl: URL;
  normalizedInspectionUrl: string;
}): PropertyCompatibilityResult {
  const hostname = inspectionUrl.hostname.toLowerCase().replace(/\.$/, "");

  if (hostname === domain || hostname.endsWith(`.${domain}`)) {
    return { compatible: true, normalizedInspectionUrl };
  }

  return {
    compatible: false,
    reason: "UNRELATED_DOMAIN",
    message: "The inspected URL is outside the selected domain property.",
  };
}

function validateUrlPrefixProperty({
  propertyUrl,
  inspectionUrl,
  normalizedInspectionUrl,
}: {
  propertyUrl: string;
  inspectionUrl: URL;
  normalizedInspectionUrl: string;
}): PropertyCompatibilityResult {
  let prefixUrl: URL;

  try {
    prefixUrl = new URL(propertyUrl);
  } catch {
    return {
      compatible: false,
      reason: "MALFORMED_PROPERTY_URL",
      message: "The selected URL-prefix property is malformed.",
    };
  }

  if (prefixUrl.protocol !== "http:" && prefixUrl.protocol !== "https:") {
    return {
      compatible: false,
      reason: "UNSUPPORTED_PROPERTY_TYPE",
      message: "Only domain and HTTP/HTTPS URL-prefix properties are supported.",
    };
  }

  if (
    prefixUrl.protocol !== inspectionUrl.protocol ||
    prefixUrl.hostname !== inspectionUrl.hostname ||
    prefixUrl.port !== inspectionUrl.port
  ) {
    return {
      compatible: false,
      reason: "UNRELATED_DOMAIN",
      message: "The inspected URL is outside the selected URL-prefix property.",
    };
  }

  const prefixPath = normalizePrefixPath(prefixUrl.pathname);
  const inspectionPath = normalizePrefixPath(inspectionUrl.pathname);

  if (
    prefixPath === "/" ||
    inspectionPath === prefixPath ||
    inspectionPath.startsWith(`${prefixPath}/`)
  ) {
    return { compatible: true, normalizedInspectionUrl };
  }

  return {
    compatible: false,
    reason: "URL_PREFIX_PATH_MISMATCH",
    message: "The inspected URL path is outside the selected URL-prefix property.",
  };
}

function normalizePrefixPath(pathname: string) {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.replace(/\/+$/, "");
}
