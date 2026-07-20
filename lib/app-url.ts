export function getAppOrigin(requestUrl: string, headers?: Headers) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (configuredUrl) {
    return new URL(configuredUrl).origin;
  }

  const forwardedHost =
    headers?.get("x-forwarded-host") ?? headers?.get("host") ?? "";
  const publicHost = forwardedHost.split(",")[0]?.trim();

  if (
    publicHost &&
    !publicHost.startsWith("0.0.0.0") &&
    !publicHost.startsWith("localhost") &&
    !publicHost.startsWith("127.0.0.1")
  ) {
    const forwardedProto =
      headers?.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";

    return `${forwardedProto}://${publicHost}`;
  }

  const requestOrigin = new URL(requestUrl).origin;

  if (process.env.NODE_ENV === "production") {
    return "https://indexpilot.cloud";
  }

  return requestOrigin;
}
