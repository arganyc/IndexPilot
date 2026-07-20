export type NormalizedUrlResult = {
  normalizedUrl: string;
  path: string;
};

export function normalizeAbsoluteUrl(input: string): NormalizedUrlResult {
  const rawUrl = input.trim();

  if (!rawUrl) {
    throw new Error("Enter a URL.");
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error("Enter a valid absolute URL.");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("URL must use HTTP or HTTPS.");
  }

  parsedUrl.hash = "";
  parsedUrl.protocol = parsedUrl.protocol.toLowerCase();
  parsedUrl.hostname = parsedUrl.hostname.toLowerCase();

  if (parsedUrl.hostname.startsWith("www.")) {
    parsedUrl.hostname = parsedUrl.hostname.slice(4);
  }

  if (
    (parsedUrl.protocol === "https:" && parsedUrl.port === "443") ||
    (parsedUrl.protocol === "http:" && parsedUrl.port === "80")
  ) {
    parsedUrl.port = "";
  }

  parsedUrl.searchParams.sort();

  const pathname =
    parsedUrl.pathname.length > 1
      ? parsedUrl.pathname.replace(/\/+$/, "")
      : parsedUrl.pathname;

  parsedUrl.pathname = pathname || "/";

  return {
    normalizedUrl: parsedUrl.toString(),
    path: parsedUrl.pathname,
  };
}

export function isValidAbsoluteUrl(input: string) {
  try {
    normalizeAbsoluteUrl(input);
    return true;
  } catch {
    return false;
  }
}
