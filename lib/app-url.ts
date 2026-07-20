export function getAppOrigin(requestUrl: string) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (configuredUrl) {
    return new URL(configuredUrl).origin;
  }

  return new URL(requestUrl).origin;
}
