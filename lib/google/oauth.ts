import "server-only";

import { randomBytes } from "node:crypto";

import { getGoogleOAuthConfig, type GoogleOAuthConfig } from "@/lib/google/config";

export const GOOGLE_OAUTH_STATE_COOKIE = "indexpilot_google_oauth_state";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const SEARCH_CONSOLE_SITES_URL = "https://www.googleapis.com/webmasters/v3/sites";

export type GoogleTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

export type GoogleUserInfo = {
  id: string;
  email: string;
  name?: string;
  picture?: string;
};

export type GoogleSearchConsoleSite = {
  siteUrl: string;
  permissionLevel: string;
};

export type GoogleSearchConsoleSitesResponse = {
  siteEntry?: GoogleSearchConsoleSite[];
};

export function createGoogleOAuthState() {
  return randomBytes(32).toString("base64url");
}

export function buildGoogleOAuthUrl({
  state,
  config = getGoogleOAuthConfig(),
}: {
  state: string;
  config?: GoogleOAuthConfig;
}) {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scopes.join(" "),
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleOAuthCode({
  code,
  fetchUrl = fetch,
  config = getGoogleOAuthConfig(),
}: {
  code: string;
  fetchUrl?: typeof fetch;
  config?: GoogleOAuthConfig;
}) {
  const response = await fetchUrl(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  return parseGoogleTokenResponse(response);
}

export async function refreshGoogleAccessToken({
  refreshToken,
  fetchUrl = fetch,
  config = getGoogleOAuthConfig(),
}: {
  refreshToken: string;
  fetchUrl?: typeof fetch;
  config?: GoogleOAuthConfig;
}) {
  const response = await fetchUrl(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
    }),
  });

  return parseGoogleTokenResponse(response);
}

export async function fetchGoogleUserInfo({
  accessToken,
  fetchUrl = fetch,
}: {
  accessToken: string;
  fetchUrl?: typeof fetch;
}) {
  const response = await fetchUrl(GOOGLE_USERINFO_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Google profile could not be loaded.");
  }

  return (await response.json()) as GoogleUserInfo;
}

export async function fetchSearchConsoleSites({
  accessToken,
  fetchUrl = fetch,
}: {
  accessToken: string;
  fetchUrl?: typeof fetch;
}) {
  const response = await fetchUrl(SEARCH_CONSOLE_SITES_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Search Console properties could not be loaded.");
  }

  const payload = (await response.json()) as GoogleSearchConsoleSitesResponse;

  return payload.siteEntry ?? [];
}

export function getTokenExpiresAt(expiresInSeconds: number | undefined) {
  if (!expiresInSeconds) {
    return null;
  }

  return new Date(Date.now() + expiresInSeconds * 1000);
}

function isGoogleTokenResponse(value: unknown): value is GoogleTokenResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "access_token" in value &&
    typeof (value as { access_token?: unknown }).access_token === "string"
  );
}

async function parseGoogleTokenResponse(response: Response) {
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok || !isGoogleTokenResponse(payload)) {
    throw new Error("Google OAuth token exchange failed.");
  }

  return payload;
}
