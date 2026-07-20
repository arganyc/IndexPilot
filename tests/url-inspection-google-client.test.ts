import { beforeEach, describe, expect, it } from "vitest";

import type { GoogleAccountRecord } from "../lib/google/accounts";
import { decryptSecret, encryptSecret } from "../lib/security/encryption";
import {
  inspectUrlWithGoogle,
  type UrlInspectionGoogleRepository,
  type UrlInspectionPropertyForClient,
} from "../lib/url-inspections/google-client";
import { GOOGLE_URL_INSPECTION_ENDPOINT } from "../lib/url-inspections/google-config";
import { validateUrlInspectionPropertyCompatibility } from "../lib/url-inspections/property-compatibility";

const organizationId = "org-1";
const otherOrganizationId = "org-2";
const baseDate = new Date("2026-07-18T12:00:00.000Z");

class FakeUrlInspectionGoogleRepository
  implements UrlInspectionGoogleRepository
{
  accounts = new Map<string, GoogleAccountRecord>();
  properties = new Map<string, UrlInspectionPropertyForClient>();

  async getGoogleAccount({
    organizationId: requestedOrganizationId,
    googleAccountId,
  }: {
    organizationId: string;
    googleAccountId: string;
  }) {
    const account = this.accounts.get(googleAccountId);

    return account?.organizationId === requestedOrganizationId ? account : null;
  }

  async getSearchConsoleProperty({
    organizationId: requestedOrganizationId,
    searchConsolePropertyId,
  }: {
    organizationId: string;
    searchConsolePropertyId: string;
  }) {
    const property = this.properties.get(searchConsolePropertyId);

    return property?.organizationId === requestedOrganizationId ? property : null;
  }

  async updateTokens(
    input: Parameters<UrlInspectionGoogleRepository["updateTokens"]>[0]
  ) {
    const account = await this.getGoogleAccount({
      organizationId: input.organizationId,
      googleAccountId: input.accountId,
    });

    if (!account) {
      throw new Error("Missing Google account.");
    }

    account.accessToken = input.encryptedAccessToken;
    account.refreshToken = input.encryptedRefreshToken ?? account.refreshToken;
    account.tokenExpiresAt = input.tokenExpiresAt;
  }

  addAccount(input: Partial<GoogleAccountRecord> = {}) {
    const account: GoogleAccountRecord = {
      id: input.id ?? "account-1",
      organizationId: input.organizationId ?? organizationId,
      googleUserId: input.googleUserId ?? "google-user-1",
      email: input.email ?? "owner@example.com",
      displayName: input.displayName ?? "Owner",
      avatarUrl: input.avatarUrl ?? null,
      accessToken: input.accessToken ?? encryptSecret("access-token"),
      refreshToken: "refreshToken" in input
        ? input.refreshToken ?? null
        : encryptSecret("refresh-token"),
      tokenExpiresAt:
        "tokenExpiresAt" in input
          ? input.tokenExpiresAt ?? null
          : new Date("2099-07-18T13:00:00.000Z"),
      lastSyncedAt: input.lastSyncedAt ?? null,
      syncError: input.syncError ?? null,
      createdAt: input.createdAt ?? baseDate,
    };

    this.accounts.set(account.id, account);
    return account;
  }

  addProperty(input: Partial<UrlInspectionPropertyForClient> = {}) {
    const property: UrlInspectionPropertyForClient = {
      id: input.id ?? "property-1",
      organizationId: input.organizationId ?? organizationId,
      googleAccountId: input.googleAccountId ?? "account-1",
      siteUrl: input.siteUrl ?? "https://example.com/",
      propertyType: input.propertyType ?? "URL_PREFIX",
      verified: input.verified ?? true,
      syncStatus: input.syncStatus ?? "ACTIVE",
    };

    this.properties.set(property.id, property);
    return property;
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function successPayload() {
  return {
    inspectionResult: {
      inspectionResultLink: "https://search.google.com/search-console/inspect",
      indexStatusResult: {
        verdict: "PASS",
        coverageState: "Submitted and indexed",
        indexingState: "INDEXING_ALLOWED",
        robotsTxtState: "ALLOWED",
        pageFetchState: "SUCCESSFUL",
        googleCanonical: "https://example.com/page",
        userCanonical: "https://example.com/page",
        lastCrawlTime: "2026-07-17T12:00:00Z",
        crawledAs: "MOBILE",
        referringUrls: ["https://example.com/"],
        sitemap: ["https://example.com/sitemap.xml"],
      },
    },
  };
}

function createRepository() {
  const repository = new FakeUrlInspectionGoogleRepository();
  repository.addAccount();
  repository.addProperty();

  return repository;
}

beforeEach(() => {
  process.env.TOKEN_ENCRYPTION_KEY = "test-token-encryption-key-32-chars";
  process.env.GOOGLE_OAUTH_CLIENT_ID = "client-id";
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = "client-secret";
  process.env.GOOGLE_OAUTH_REDIRECT_URI =
    "http://localhost:3000/api/google/oauth/callback";
});

describe("Google URL Inspection API client", () => {
  it("normalizes a successful API response", async () => {
    const result = await inspectUrlWithGoogle({
      googleAccountId: "account-1",
      searchConsolePropertyId: "property-1",
      inspectedUrl: "https://example.com/page#section",
      organizationId,
      repository: createRepository(),
      fetchUrl: async (url, init) => {
        expect(url).toBe(GOOGLE_URL_INSPECTION_ENDPOINT);
        expect(init?.method).toBe("POST");
        expect(init?.headers).toMatchObject({
          authorization: "Bearer access-token",
        });
        expect(JSON.parse(String(init?.body))).toMatchObject({
          inspectionUrl: "https://example.com/page",
          siteUrl: "https://example.com/",
          languageCode: "en-US",
        });

        return jsonResponse(successPayload());
      },
    });

    expect(result).toMatchObject({
      success: true,
      verdict: "PASS",
      coverageState: "Submitted and indexed",
      indexingState: "INDEXING_ALLOWED",
      robotsTxtState: "ALLOWED",
      pageFetchState: "SUCCESSFUL",
      googleCanonical: "https://example.com/page",
      userCanonical: "https://example.com/page",
      crawledAs: "MOBILE",
      referringUrls: ["https://example.com/"],
      sitemapUrls: ["https://example.com/sitemap.xml"],
    });
    expect(result.success && result.lastCrawlTime?.toISOString()).toBe(
      "2026-07-17T12:00:00.000Z"
    );
  });

  it("normalizes missing optional response fields", async () => {
    const result = await inspectUrlWithGoogle({
      googleAccountId: "account-1",
      searchConsolePropertyId: "property-1",
      inspectedUrl: "https://example.com/page",
      organizationId,
      repository: createRepository(),
      fetchUrl: async () => jsonResponse({ inspectionResult: {} }),
    });

    expect(result).toMatchObject({
      success: true,
      inspectionResultLink: null,
      verdict: null,
      coverageState: null,
      indexingState: null,
      robotsTxtState: null,
      pageFetchState: null,
      googleCanonical: null,
      userCanonical: null,
      lastCrawlTime: null,
      crawledAs: null,
      referringUrls: [],
      sitemapUrls: [],
    });
  });

  it("accepts compatible domain-property URLs", () => {
    const result = validateUrlInspectionPropertyCompatibility({
      propertySiteUrl: "sc-domain:example.com",
      inspectedUrl: "https://blog.example.com/page",
    });

    expect(result).toMatchObject({ compatible: true });
  });

  it("accepts URL-prefix compatible URLs", () => {
    const result = validateUrlInspectionPropertyCompatibility({
      propertySiteUrl: "https://example.com/blog/",
      inspectedUrl: "https://example.com/blog/post",
    });

    expect(result).toMatchObject({ compatible: true });
  });

  it("rejects URL-prefix path mismatches", () => {
    const result = validateUrlInspectionPropertyCompatibility({
      propertySiteUrl: "https://example.com/blog/",
      inspectedUrl: "https://example.com/shop/post",
    });

    expect(result).toMatchObject({
      compatible: false,
      reason: "URL_PREFIX_PATH_MISMATCH",
    });
  });

  it("rejects cross-domain URLs", () => {
    const result = validateUrlInspectionPropertyCompatibility({
      propertySiteUrl: "sc-domain:example.com",
      inspectedUrl: "https://other.example.net/page",
    });

    expect(result).toMatchObject({
      compatible: false,
      reason: "UNRELATED_DOMAIN",
    });
  });

  it("refreshes expired access tokens before inspection", async () => {
    const repository = createRepository();
    repository.accounts.get("account-1")!.tokenExpiresAt = new Date(
      "2026-07-18T11:59:00.000Z"
    );
    const result = await inspectUrlWithGoogle({
      googleAccountId: "account-1",
      searchConsolePropertyId: "property-1",
      inspectedUrl: "https://example.com/page",
      organizationId,
      repository,
      now: () => baseDate,
      fetchUrl: async (url) => {
        if (String(url).includes("oauth2.googleapis.com")) {
          return jsonResponse({
            access_token: "new-access-token",
            expires_in: 3600,
          });
        }

        return jsonResponse(successPayload());
      },
    });

    expect(result.success).toBe(true);
    expect(decryptSecret(repository.accounts.get("account-1")!.accessToken)).toBe(
      "new-access-token"
    );
  });

  it("retries once after authorization failure", async () => {
    const repository = createRepository();
    let inspectionAttempts = 0;
    const result = await inspectUrlWithGoogle({
      googleAccountId: "account-1",
      searchConsolePropertyId: "property-1",
      inspectedUrl: "https://example.com/page",
      organizationId,
      repository,
      fetchUrl: async (url) => {
        if (String(url).includes("oauth2.googleapis.com")) {
          return jsonResponse({
            access_token: "retry-access-token",
            expires_in: 3600,
          });
        }

        inspectionAttempts += 1;

        return inspectionAttempts === 1
          ? jsonResponse({ error: { status: "UNAUTHENTICATED" } }, 401)
          : jsonResponse(successPayload());
      },
    });

    expect(result.success).toBe(true);
    expect(inspectionAttempts).toBe(2);
  });

  it("returns a clear error when refresh token is missing", async () => {
    const repository = createRepository();
    repository.accounts.get("account-1")!.refreshToken = null;
    repository.accounts.get("account-1")!.tokenExpiresAt = new Date(
      "2026-07-18T11:59:00.000Z"
    );
    const result = await inspectUrlWithGoogle({
      googleAccountId: "account-1",
      searchConsolePropertyId: "property-1",
      inspectedUrl: "https://example.com/page",
      organizationId,
      repository,
      now: () => baseDate,
      fetchUrl: async () => jsonResponse(successPayload()),
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "REVOKED_AUTHORIZATION",
      retryable: false,
    });
  });

  it("maps revoked authorization during retry refresh", async () => {
    const result = await inspectUrlWithGoogle({
      googleAccountId: "account-1",
      searchConsolePropertyId: "property-1",
      inspectedUrl: "https://example.com/page",
      organizationId,
      repository: createRepository(),
      fetchUrl: async (url) =>
        String(url).includes("oauth2.googleapis.com")
          ? jsonResponse({ error: "invalid_grant" }, 400)
          : jsonResponse({ error: { status: "UNAUTHENTICATED" } }, 401),
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "REVOKED_AUTHORIZATION",
      httpStatus: 401,
    });
  });

  it("maps permission denied errors", async () => {
    const result = await inspectUrlWithGoogle({
      googleAccountId: "account-1",
      searchConsolePropertyId: "property-1",
      inspectedUrl: "https://example.com/page",
      organizationId,
      repository: createRepository(),
      fetchUrl: async () => jsonResponse({ error: { status: "PERMISSION_DENIED" } }, 403),
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "PERMISSION_DENIED",
      httpStatus: 403,
    });
  });

  it("maps quota exceeded errors", async () => {
    const result = await inspectUrlWithGoogle({
      googleAccountId: "account-1",
      searchConsolePropertyId: "property-1",
      inspectedUrl: "https://example.com/page",
      organizationId,
      repository: createRepository(),
      fetchUrl: async () => jsonResponse({ error: { status: "RESOURCE_EXHAUSTED" } }, 403),
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "QUOTA_EXCEEDED",
      retryable: true,
    });
  });

  it("maps rate limiting", async () => {
    const result = await inspectUrlWithGoogle({
      googleAccountId: "account-1",
      searchConsolePropertyId: "property-1",
      inspectedUrl: "https://example.com/page",
      organizationId,
      repository: createRepository(),
      fetchUrl: async () => jsonResponse({ error: { status: "RATE_LIMITED" } }, 429),
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "RATE_LIMITED",
      retryable: true,
    });
  });

  it("handles request timeouts", async () => {
    const result = await inspectUrlWithGoogle({
      googleAccountId: "account-1",
      searchConsolePropertyId: "property-1",
      inspectedUrl: "https://example.com/page",
      organizationId,
      repository: createRepository(),
      timeoutMs: 1,
      fetchUrl: async (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "NETWORK_TIMEOUT",
      retryable: true,
    });
  });

  it("handles malformed Google responses", async () => {
    const result = await inspectUrlWithGoogle({
      googleAccountId: "account-1",
      searchConsolePropertyId: "property-1",
      inspectedUrl: "https://example.com/page",
      organizationId,
      repository: createRepository(),
      fetchUrl: async () => jsonResponse({ unexpected: true }),
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "MALFORMED_GOOGLE_RESPONSE",
    });
  });

  it("rejects organization ownership mismatches", async () => {
    const repository = createRepository();
    repository.accounts.get("account-1")!.organizationId = otherOrganizationId;
    const result = await inspectUrlWithGoogle({
      googleAccountId: "account-1",
      searchConsolePropertyId: "property-1",
      inspectedUrl: "https://example.com/page",
      organizationId,
      repository,
      fetchUrl: async () => jsonResponse(successPayload()),
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "UNAUTHORIZED",
    });
  });

  it("rejects property and account mismatches", async () => {
    const repository = createRepository();
    repository.properties.get("property-1")!.googleAccountId = "account-2";
    const result = await inspectUrlWithGoogle({
      googleAccountId: "account-1",
      searchConsolePropertyId: "property-1",
      inspectedUrl: "https://example.com/page",
      organizationId,
      repository,
      fetchUrl: async () => jsonResponse(successPayload()),
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: "PROPERTY_MISMATCH",
    });
  });
});
