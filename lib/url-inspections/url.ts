export type NormalizedInspectionUrl = {
  normalizedUrl: string;
  path: string;
};

export function normalizeInspectionUrl(input: string): NormalizedInspectionUrl {
  const rawUrl = input.trim();

  if (!rawUrl) {
    throw new Error("Enter a URL.");
  }

  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Enter a valid absolute URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("URL must use HTTP or HTTPS.");
  }

  url.hash = "";
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase().replace(/\.$/, "");

  if (
    (url.protocol === "https:" && url.port === "443") ||
    (url.protocol === "http:" && url.port === "80")
  ) {
    url.port = "";
  }

  url.pathname =
    url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;

  if (!url.pathname) {
    url.pathname = "/";
  }

  return {
    normalizedUrl: url.toString(),
    path: url.pathname,
  };
}

export function isValidInspectionUrl(input: string) {
  try {
    normalizeInspectionUrl(input);
    return true;
  } catch {
    return false;
  }
}
