export type WebsiteProtocolValue = "HTTP" | "HTTPS";

export type NormalizedDomainResult = {
  normalizedDomain: string;
  protocol: WebsiteProtocolValue;
};

const DOMAIN_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function normalizeDomain(input: string): NormalizedDomainResult {
  const rawDomain = input.trim();

  if (!rawDomain) {
    throw new Error("Enter a domain.");
  }

  const withProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(rawDomain)
    ? rawDomain
    : `https://${rawDomain}`;

  let url: URL;

  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error("Enter a valid domain.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Domain must use HTTP or HTTPS.");
  }

  const protocol = url.protocol === "http:" ? "HTTP" : "HTTPS";
  let normalizedDomain = url.hostname.toLowerCase();

  if (normalizedDomain.startsWith("www.")) {
    normalizedDomain = normalizedDomain.slice(4);
  }

  normalizedDomain = normalizedDomain.replace(/\.$/, "");

  if (!isValidNormalizedDomain(normalizedDomain)) {
    throw new Error("Enter a valid domain.");
  }

  return { normalizedDomain, protocol };
}

export function isValidDomain(input: string) {
  try {
    normalizeDomain(input);
    return true;
  } catch {
    return false;
  }
}

export function isValidNormalizedDomain(domain: string) {
  const labels = domain.split(".");

  return (
    domain.length <= 253 &&
    labels.length >= 2 &&
    labels.every((label) => DOMAIN_LABEL_PATTERN.test(label))
  );
}
