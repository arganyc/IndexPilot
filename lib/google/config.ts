import "server-only";

export const GOOGLE_SEARCH_CONSOLE_SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly",
] as const;

export type GoogleScope = (typeof GOOGLE_SEARCH_CONSOLE_SCOPES)[number] | string;

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: GoogleScope[];
};

export function getGoogleOAuthConfig(
  additionalScopes: GoogleScope[] = []
): GoogleOAuthConfig {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth environment variables are required.");
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: [...new Set([...GOOGLE_SEARCH_CONSOLE_SCOPES, ...additionalScopes])],
  };
}
