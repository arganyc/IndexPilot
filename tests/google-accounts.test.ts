import { beforeEach, describe, expect, it } from "vitest";

import {
  connectGoogleAccount,
  getGoogleTokenStatus,
  getValidGoogleAccessToken,
  normalizeSearchConsoleSites,
  refreshPropertiesForAccount,
  syncSearchConsoleProperties,
  type GoogleAccountRecord,
  type GoogleAccountRepository,
  type SearchConsolePropertyRecord,
} from "../lib/google/accounts";
import { buildGoogleOAuthUrl } from "../lib/google/oauth";
import { decryptSecret, encryptSecret } from "../lib/security/encryption";

const organizationId = "org-1";
const otherOrganizationId = "org-2";

class FakeGoogleRepository implements GoogleAccountRepository {
  accounts = new Map<string, GoogleAccountRecord>();
  properties = new Map<string, SearchConsolePropertyRecord>();

  async upsertAccount(input: Parameters<GoogleAccountRepository["upsertAccount"]>[0]) {
    const existing = [...this.accounts.values()].find(
      (account) =>
        account.organizationId === input.organizationId &&
        account.googleUserId === input.googleUserId
    );
    const account: GoogleAccountRecord = {
      id: existing?.id ?? `account-${this.accounts.size + 1}`,
      organizationId: input.organizationId,
      googleUserId: input.googleUserId,
      email: input.email,
      displayName: input.displayName ?? null,
      avatarUrl: input.avatarUrl ?? null,
      accessToken: input.encryptedAccessToken,
      refreshToken: input.encryptedRefreshToken ?? existing?.refreshToken ?? null,
      tokenExpiresAt: input.tokenExpiresAt,
      lastSyncedAt: existing?.lastSyncedAt ?? null,
      syncError: null,
      createdAt: existing?.createdAt ?? new Date("2026-07-18T12:00:00.000Z"),
    };

    this.accounts.set(account.id, account);
    return account;
  }

  async listAccounts(organization: string) {
    return [...this.accounts.values()]
      .filter((account) => account.organizationId === organization)
      .map((account) => ({
        ...account,
        propertyCount: [...this.properties.values()].filter(
          (property) => property.googleAccountId === account.id
        ).length,
      }));
  }

  async getAccount(input: Parameters<GoogleAccountRepository["getAccount"]>[0]) {
    const account = this.accounts.get(input.accountId);
    return account?.organizationId === input.organizationId ? account : null;
  }

  async updateTokens(input: Parameters<GoogleAccountRepository["updateTokens"]>[0]) {
    const account = await this.getAccount(input);

    if (!account) {
      throw new Error("Missing account");
    }

    account.accessToken = input.encryptedAccessToken;
    account.refreshToken = input.encryptedRefreshToken ?? account.refreshToken;
    account.tokenExpiresAt = input.tokenExpiresAt;
  }

  async updateSyncStatus(
    input: Parameters<GoogleAccountRepository["updateSyncStatus"]>[0]
  ) {
    const account = await this.getAccount(input);

    if (!account) {
      throw new Error("Missing account");
    }

    if (input.lastSyncedAt) {
      account.lastSyncedAt = input.lastSyncedAt;
    }

    account.syncError = input.syncError ?? null;
  }

  async reconcileProperties(
    input: Parameters<GoogleAccountRepository["reconcileProperties"]>[0]
  ) {
    const existing = [...this.properties.values()].filter(
      (property) =>
        property.organizationId === input.organizationId &&
        property.googleAccountId === input.accountId
    );
    const incomingUrls = new Set(
      input.properties.map((property) => property.normalizedSiteUrl)
    );
    let created = 0;
    let updated = 0;
    let unchanged = 0;
    let restored = 0;

    for (const property of input.properties) {
      const existingProperty = existing.find(
        (candidate) => candidate.normalizedSiteUrl === property.normalizedSiteUrl
      );

      if (!existingProperty) {
        const id = `property-${this.properties.size + 1}`;
        this.properties.set(id, {
          id,
          googleAccountId: input.accountId,
          organizationId: input.organizationId,
          websiteId: null,
          syncStatus: "ACTIVE",
          lastSyncedAt: input.syncedAt,
          lastSeenAt: input.syncedAt,
          removedFromGoogleAt: null,
          ...property,
        });
        created += 1;
        continue;
      }

      const wasMissing = existingProperty.syncStatus === "MISSING";
      const changed =
        existingProperty.permissionLevel !== property.permissionLevel ||
        existingProperty.propertyType !== property.propertyType ||
        existingProperty.verified !== property.verified ||
        existingProperty.siteUrl !== property.siteUrl ||
        existingProperty.syncStatus !== "ACTIVE" ||
        existingProperty.removedFromGoogleAt !== null;

      if (changed) {
        Object.assign(existingProperty, property, {
          syncStatus: "ACTIVE",
          lastSyncedAt: input.syncedAt,
          lastSeenAt: input.syncedAt,
          removedFromGoogleAt: null,
        });

        if (wasMissing) {
          restored += 1;
        } else {
          updated += 1;
        }
      } else {
        existingProperty.lastSyncedAt = input.syncedAt;
        existingProperty.lastSeenAt = input.syncedAt;
        unchanged += 1;
      }
    }

    let markedMissing = 0;

    for (const property of existing) {
      if (!incomingUrls.has(property.normalizedSiteUrl)) {
        if (property.syncStatus !== "MISSING") {
          markedMissing += 1;
        }

        property.syncStatus = "MISSING";
        property.lastSyncedAt = input.syncedAt;
        property.removedFromGoogleAt =
          property.removedFromGoogleAt ?? input.syncedAt;
      }
    }

    return {
      discovered: input.properties.length,
      created,
      updated,
      unchanged,
      markedMissing,
      restored,
      errors: [],
      durationMs: 0,
    };
  }

  async disconnectAccount(
    input: Parameters<GoogleAccountRepository["disconnectAccount"]>[0]
  ) {
    const account = await this.getAccount(input);

    if (!account) {
      return false;
    }

    this.accounts.delete(account.id);

    for (const property of [...this.properties.values()]) {
      if (property.googleAccountId === account.id) {
        this.properties.delete(property.id);
      }
    }

    return true;
  }

  addAccount(input: Partial<GoogleAccountRecord> = {}) {
    const account: GoogleAccountRecord = {
      id: input.id ?? `account-${this.accounts.size + 1}`,
      organizationId: input.organizationId ?? organizationId,
      googleUserId: input.googleUserId ?? "google-1",
      email: input.email ?? "owner@example.com",
      displayName: input.displayName ?? "Owner",
      avatarUrl: input.avatarUrl ?? null,
      accessToken: input.accessToken ?? encryptSecret("access-token"),
      refreshToken: input.refreshToken ?? encryptSecret("refresh-token"),
      tokenExpiresAt:
        input.tokenExpiresAt ?? new Date("2026-07-18T13:00:00.000Z"),
      lastSyncedAt: input.lastSyncedAt ?? null,
      syncError: input.syncError ?? null,
      createdAt: input.createdAt ?? new Date("2026-07-18T12:00:00.000Z"),
    };

    this.accounts.set(account.id, account);
    return account;
  }

  addProperty(
    input: Partial<SearchConsolePropertyRecord> & {
      googleAccountId: string;
      siteUrl: string;
      normalizedSiteUrl: string;
    }
  ) {
    const property: SearchConsolePropertyRecord = {
      id: input.id ?? `property-${this.properties.size + 1}`,
      organizationId: input.organizationId ?? organizationId,
      googleAccountId: input.googleAccountId,
      websiteId: input.websiteId ?? null,
      siteUrl: input.siteUrl,
      normalizedSiteUrl: input.normalizedSiteUrl,
      propertyType: input.propertyType ?? "URL_PREFIX",
      permissionLevel: input.permissionLevel ?? "siteOwner",
      verified: input.verified ?? true,
      syncStatus: input.syncStatus ?? "ACTIVE",
      lastSyncedAt:
        input.lastSyncedAt ?? new Date("2026-07-18T11:00:00.000Z"),
      lastSeenAt: input.lastSeenAt ?? new Date("2026-07-18T11:00:00.000Z"),
      removedFromGoogleAt: input.removedFromGoogleAt ?? null,
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

beforeEach(() => {
  process.env.TOKEN_ENCRYPTION_KEY = "test-token-encryption-key-32-chars";
  process.env.GOOGLE_OAUTH_CLIENT_ID = "client-id";
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = "client-secret";
  process.env.GOOGLE_OAUTH_REDIRECT_URI =
    "http://localhost:3000/api/google/oauth/callback";
});

describe("Google Search Console account management", () => {
  it("builds an offline incremental OAuth URL", () => {
    const url = new URL(buildGoogleOAuthUrl({ state: "state-1" }));

    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("include_granted_scopes")).toBe("true");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("scope")).toContain(
      "https://www.googleapis.com/auth/webmasters.readonly"
    );
  });

  it("stores an OAuth callback account and properties", async () => {
    const repository = new FakeGoogleRepository();
    const result = await connectGoogleAccount({
      organizationId,
      tokens: {
        access_token: "access-token",
        refresh_token: "refresh-token",
        expires_in: 3600,
      },
      userInfo: {
        id: "google-1",
        email: "owner@example.com",
        name: "Owner",
        picture: "https://example.com/avatar.jpg",
      },
      sites: [
        { siteUrl: "sc-domain:example.com", permissionLevel: "siteOwner" },
        { siteUrl: "https://example.com/", permissionLevel: "siteFullUser" },
      ],
      repository,
    });

    const account = repository.accounts.get(result.accountId);

    expect(result.propertySync.discovered).toBe(2);
    expect(result.propertySync.created).toBe(2);
    expect(account?.organizationId).toBe(organizationId);
    expect(account?.accessToken).not.toBe("access-token");
    expect(decryptSecret(account?.refreshToken ?? "")).toBe("refresh-token");
  });

  it("refreshes an expired token and persists the replacement", async () => {
    const repository = new FakeGoogleRepository();
    const account = repository.addAccount({
      tokenExpiresAt: new Date("2026-07-18T11:59:00.000Z"),
    });
    const accessToken = await getValidGoogleAccessToken({
      account,
      organizationId,
      repository,
      now: () => new Date("2026-07-18T12:00:00.000Z"),
      fetchUrl: async () =>
        jsonResponse({ access_token: "new-access-token", expires_in: 3600 }),
    });

    expect(accessToken).toBe("new-access-token");
    expect(decryptSecret(repository.accounts.get(account.id)?.accessToken ?? "")).toBe(
      "new-access-token"
    );
  });

  it("deduplicates Search Console properties", () => {
    const properties = normalizeSearchConsoleSites([
      { siteUrl: "https://example.com/", permissionLevel: "siteOwner" },
      { siteUrl: "https://example.com/", permissionLevel: "siteOwner" },
    ]);

    expect(properties).toHaveLength(1);
  });

  it("synchronizes new, removed, and permission-changed properties", async () => {
    const repository = new FakeGoogleRepository();
    const account = repository.addAccount();
    await syncSearchConsoleProperties({
      organizationId,
      accountId: account.id,
      sites: [
        { siteUrl: "https://example.com/", permissionLevel: "siteOwner" },
        { siteUrl: "sc-domain:example.com", permissionLevel: "siteFullUser" },
      ],
      repository,
    });
    const result = await syncSearchConsoleProperties({
      organizationId,
      accountId: account.id,
      sites: [
        { siteUrl: "https://example.com/", permissionLevel: "siteRestrictedUser" },
        { siteUrl: "https://example.com/blog/", permissionLevel: "siteOwner" },
      ],
      repository,
    });

    expect(result).toMatchObject({
      discovered: 2,
      created: 1,
      updated: 1,
      unchanged: 0,
      markedMissing: 1,
      restored: 0,
      errors: [],
    });
    expect([...repository.properties.values()].map((item) => item.siteUrl).sort()).toEqual([
      "https://example.com/",
      "https://example.com/blog/",
      "sc-domain:example.com",
    ]);
    expect(
      [...repository.properties.values()].find(
        (property) => property.siteUrl === "sc-domain:example.com"
      )?.syncStatus
    ).toBe("MISSING");
  });

  it("creates new properties with normalized URLs", async () => {
    const repository = new FakeGoogleRepository();
    const account = repository.addAccount();
    const result = await syncSearchConsoleProperties({
      organizationId,
      accountId: account.id,
      sites: [
        { siteUrl: "HTTPS://Example.com:443/", permissionLevel: "siteOwner" },
      ],
      repository,
      now: () => new Date("2026-07-18T12:30:00.000Z"),
    });
    const property = [...repository.properties.values()][0];

    expect(result.created).toBe(1);
    expect(property.normalizedSiteUrl).toBe("https://example.com/");
    expect(property.syncStatus).toBe("ACTIVE");
    expect(property.lastSeenAt.toISOString()).toBe("2026-07-18T12:30:00.000Z");
  });

  it("prevents duplicates by normalized property URL", async () => {
    const repository = new FakeGoogleRepository();
    const account = repository.addAccount();
    const result = await syncSearchConsoleProperties({
      organizationId,
      accountId: account.id,
      sites: [
        { siteUrl: "https://example.com/", permissionLevel: "siteOwner" },
        { siteUrl: "https://EXAMPLE.com:443/", permissionLevel: "siteOwner" },
      ],
      repository,
    });

    expect(result.discovered).toBe(1);
    expect(result.created).toBe(1);
    expect(repository.properties.size).toBe(1);
  });

  it("updates verification state", async () => {
    const repository = new FakeGoogleRepository();
    const account = repository.addAccount();
    repository.addProperty({
      googleAccountId: account.id,
      siteUrl: "https://example.com/",
      normalizedSiteUrl: "https://example.com/",
      verified: false,
      permissionLevel: "siteUnverifiedUser",
    });
    const result = await syncSearchConsoleProperties({
      organizationId,
      accountId: account.id,
      sites: [{ siteUrl: "https://example.com/", permissionLevel: "siteOwner" }],
      repository,
    });

    expect(result.updated).toBe(1);
    expect([...repository.properties.values()][0].verified).toBe(true);
  });

  it("updates property type when needed", async () => {
    const repository = new FakeGoogleRepository();
    const account = repository.addAccount();
    repository.addProperty({
      googleAccountId: account.id,
      siteUrl: "sc-domain:example.com",
      normalizedSiteUrl: "sc-domain:example.com",
      propertyType: "URL_PREFIX",
    });
    const result = await syncSearchConsoleProperties({
      organizationId,
      accountId: account.id,
      sites: [{ siteUrl: "sc-domain:example.com", permissionLevel: "siteOwner" }],
      repository,
    });

    expect(result.updated).toBe(1);
    expect([...repository.properties.values()][0].propertyType).toBe("DOMAIN");
  });

  it("preserves removedFromGoogleAt on repeated missing syncs", async () => {
    const repository = new FakeGoogleRepository();
    const account = repository.addAccount();
    const removedAt = new Date("2026-07-17T12:00:00.000Z");
    repository.addProperty({
      googleAccountId: account.id,
      siteUrl: "https://example.com/",
      normalizedSiteUrl: "https://example.com/",
      syncStatus: "MISSING",
      removedFromGoogleAt: removedAt,
    });
    const result = await syncSearchConsoleProperties({
      organizationId,
      accountId: account.id,
      sites: [],
      repository,
      now: () => new Date("2026-07-18T12:00:00.000Z"),
    });

    expect(result.markedMissing).toBe(0);
    expect([...repository.properties.values()][0].removedFromGoogleAt).toBe(
      removedAt
    );
  });

  it("restores a missing property when it reappears", async () => {
    const repository = new FakeGoogleRepository();
    const account = repository.addAccount();
    repository.addProperty({
      googleAccountId: account.id,
      siteUrl: "https://example.com/",
      normalizedSiteUrl: "https://example.com/",
      syncStatus: "MISSING",
      removedFromGoogleAt: new Date("2026-07-17T12:00:00.000Z"),
    });
    const result = await syncSearchConsoleProperties({
      organizationId,
      accountId: account.id,
      sites: [{ siteUrl: "https://example.com/", permissionLevel: "siteOwner" }],
      repository,
    });

    expect(result.restored).toBe(1);
    expect([...repository.properties.values()][0].syncStatus).toBe("ACTIVE");
    expect([...repository.properties.values()][0].removedFromGoogleAt).toBeNull();
  });

  it("preserves websiteId during synchronization", async () => {
    const repository = new FakeGoogleRepository();
    const account = repository.addAccount();
    repository.addProperty({
      googleAccountId: account.id,
      websiteId: "website-1",
      siteUrl: "https://example.com/",
      normalizedSiteUrl: "https://example.com/",
    });
    await syncSearchConsoleProperties({
      organizationId,
      accountId: account.id,
      sites: [{ siteUrl: "https://example.com/", permissionLevel: "siteFullUser" }],
      repository,
    });

    expect([...repository.properties.values()][0].websiteId).toBe("website-1");
  });

  it("is idempotent for repeated synchronization", async () => {
    const repository = new FakeGoogleRepository();
    const account = repository.addAccount();
    const sites = [
      { siteUrl: "https://example.com/", permissionLevel: "siteOwner" },
    ];
    await syncSearchConsoleProperties({
      organizationId,
      accountId: account.id,
      sites,
      repository,
      now: () => new Date("2026-07-18T12:00:00.000Z"),
    });
    const result = await syncSearchConsoleProperties({
      organizationId,
      accountId: account.id,
      sites,
      repository,
      now: () => new Date("2026-07-18T12:00:00.000Z"),
    });

    expect(result).toMatchObject({
      discovered: 1,
      created: 0,
      updated: 0,
      unchanged: 1,
      markedMissing: 0,
      restored: 0,
    });
    expect(repository.properties.size).toBe(1);
  });

  it("returns accurate summary counts for mixed reconciliation", async () => {
    const repository = new FakeGoogleRepository();
    const account = repository.addAccount();
    repository.addProperty({
      googleAccountId: account.id,
      siteUrl: "https://unchanged.example.com/",
      normalizedSiteUrl: "https://unchanged.example.com/",
    });
    repository.addProperty({
      googleAccountId: account.id,
      siteUrl: "https://updated.example.com/",
      normalizedSiteUrl: "https://updated.example.com/",
      permissionLevel: "siteRestrictedUser",
    });
    repository.addProperty({
      googleAccountId: account.id,
      siteUrl: "https://missing.example.com/",
      normalizedSiteUrl: "https://missing.example.com/",
    });
    repository.addProperty({
      googleAccountId: account.id,
      siteUrl: "https://restored.example.com/",
      normalizedSiteUrl: "https://restored.example.com/",
      syncStatus: "MISSING",
      removedFromGoogleAt: new Date("2026-07-17T12:00:00.000Z"),
    });
    const result = await syncSearchConsoleProperties({
      organizationId,
      accountId: account.id,
      sites: [
        { siteUrl: "https://unchanged.example.com/", permissionLevel: "siteOwner" },
        { siteUrl: "https://updated.example.com/", permissionLevel: "siteOwner" },
        { siteUrl: "https://restored.example.com/", permissionLevel: "siteOwner" },
        { siteUrl: "https://new.example.com/", permissionLevel: "siteOwner" },
      ],
      repository,
    });

    expect(result).toMatchObject({
      discovered: 4,
      created: 1,
      updated: 1,
      unchanged: 1,
      markedMissing: 1,
      restored: 1,
      errors: [],
    });
  });

  it("validates ownership before synchronization", async () => {
    const repository = new FakeGoogleRepository();
    const account = repository.addAccount({ organizationId: otherOrganizationId });

    await expect(
      refreshPropertiesForAccount({
        organizationId,
        accountId: account.id,
        repository,
      })
    ).rejects.toThrow("Google account was not found");
  });

  it("disconnects only organization-owned accounts", async () => {
    const repository = new FakeGoogleRepository();
    const account = repository.addAccount();
    const otherAccount = repository.addAccount({
      id: "account-other",
      organizationId: otherOrganizationId,
      googleUserId: "google-other",
    });

    await expect(
      repository.disconnectAccount({ organizationId, accountId: otherAccount.id })
    ).resolves.toBe(false);
    await expect(
      repository.disconnectAccount({ organizationId, accountId: account.id })
    ).resolves.toBe(true);
  });

  it("reports expired tokens that need refresh", () => {
    const repository = new FakeGoogleRepository();
    const account = repository.addAccount({
      tokenExpiresAt: new Date("2026-07-18T11:59:00.000Z"),
    });

    expect(getGoogleTokenStatus(account, new Date("2026-07-18T12:00:00.000Z"))).toBe(
      "Expired"
    );
  });

  it("updates sync errors after Search Console fetch failure", async () => {
    const repository = new FakeGoogleRepository();
    const account = repository.addAccount();

    await expect(
      refreshPropertiesForAccount({
        organizationId,
        accountId: account.id,
        repository,
        now: () => new Date("2026-07-18T12:00:00.000Z"),
        fetchUrl: async () => jsonResponse({ error: "nope" }, 500),
      })
    ).rejects.toThrow("Search Console properties could not be loaded");
    expect(repository.accounts.get(account.id)?.syncError).toBe(
      "Search Console properties could not be loaded."
    );
  });
});
