import "server-only";

import { performance } from "node:perf_hooks";

import type { PrismaClient } from "@/lib/generated/prisma/client";
import type { GoogleSearchConsoleSite, GoogleTokenResponse, GoogleUserInfo } from "@/lib/google/oauth";
import {
  fetchSearchConsoleSites,
  getTokenExpiresAt,
  refreshGoogleAccessToken,
} from "@/lib/google/oauth";
import { decryptSecret, encryptSecret } from "@/lib/security/encryption";

export type GoogleAccountRecord = {
  id: string;
  organizationId: string;
  googleUserId: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  lastSyncedAt: Date | null;
  syncError: string | null;
  createdAt: Date;
  propertyCount?: number;
};

export type SearchConsolePropertyRecord = {
  id: string;
  organizationId: string;
  googleAccountId: string;
  websiteId: string | null;
  siteUrl: string;
  normalizedSiteUrl: string;
  propertyType: string;
  permissionLevel: string;
  verified: boolean;
  syncStatus: "ACTIVE" | "MISSING" | "ERROR";
  lastSyncedAt: Date;
  lastSeenAt: Date;
  removedFromGoogleAt: Date | null;
};

export type SyncPropertiesResult = {
  discovered: number;
  created: number;
  updated: number;
  unchanged: number;
  markedMissing: number;
  restored: number;
  errors: string[];
  durationMs: number;
};

export type GoogleAccountRepository = {
  upsertAccount: (input: {
    organizationId: string;
    googleUserId: string;
    email: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    encryptedAccessToken: string;
    encryptedRefreshToken?: string | null;
    tokenExpiresAt: Date | null;
  }) => Promise<GoogleAccountRecord>;
  listAccounts: (organizationId: string) => Promise<GoogleAccountRecord[]>;
  getAccount: (input: {
    organizationId: string;
    accountId: string;
  }) => Promise<GoogleAccountRecord | null>;
  updateTokens: (input: {
    organizationId: string;
    accountId: string;
    encryptedAccessToken: string;
    encryptedRefreshToken?: string | null;
    tokenExpiresAt: Date | null;
  }) => Promise<void>;
  updateSyncStatus: (input: {
    organizationId: string;
    accountId: string;
    lastSyncedAt?: Date;
    syncError?: string | null;
  }) => Promise<void>;
  reconcileProperties: (input: {
    organizationId: string;
    accountId: string;
    properties: NormalizedSearchConsoleProperty[];
    syncedAt: Date;
  }) => Promise<SyncPropertiesResult>;
  disconnectAccount: (input: {
    organizationId: string;
    accountId: string;
  }) => Promise<boolean>;
};

export type NormalizedSearchConsoleProperty = {
  siteUrl: string;
  normalizedSiteUrl: string;
  permissionLevel: string;
  propertyType: "DOMAIN" | "URL_PREFIX";
  verified: boolean;
};

export type GoogleAccountConnectResult = {
  accountId: string;
  email: string;
  propertySync: SyncPropertiesResult;
};

export async function connectGoogleAccount({
  organizationId,
  tokens,
  userInfo,
  sites,
  repository,
}: {
  organizationId: string;
  tokens: GoogleTokenResponse;
  userInfo: GoogleUserInfo;
  sites: GoogleSearchConsoleSite[];
  repository: GoogleAccountRepository;
}): Promise<GoogleAccountConnectResult> {
  const account = await repository.upsertAccount({
    organizationId,
    googleUserId: userInfo.id,
    email: userInfo.email,
    displayName: userInfo.name ?? null,
    avatarUrl: userInfo.picture ?? null,
    encryptedAccessToken: encryptSecret(tokens.access_token),
    encryptedRefreshToken: tokens.refresh_token
      ? encryptSecret(tokens.refresh_token)
      : undefined,
    tokenExpiresAt: getTokenExpiresAt(tokens.expires_in),
  });
  const propertySync = await syncSearchConsoleProperties({
    organizationId,
    accountId: account.id,
    sites,
    repository,
  });

  return {
    accountId: account.id,
    email: account.email,
    propertySync,
  };
}

export async function refreshPropertiesForAccount({
  organizationId,
  accountId,
  repository,
  fetchUrl,
  now = () => new Date(),
}: {
  organizationId: string;
  accountId: string;
  repository: GoogleAccountRepository;
  fetchUrl?: typeof fetch;
  now?: () => Date;
}) {
  const account = await repository.getAccount({ organizationId, accountId });

  if (!account) {
    throw new Error("Google account was not found for this organization.");
  }

  try {
    const accessToken = await getValidGoogleAccessToken({
      account,
      organizationId,
      repository,
      fetchUrl,
      now,
    });
    const sites = await fetchSearchConsoleSites({ accessToken, fetchUrl });
    const result = await syncSearchConsoleProperties({
      organizationId,
      accountId,
      sites,
      repository,
    });

    return result;
  } catch (error) {
    await repository.updateSyncStatus({
      organizationId,
      accountId,
      syncError: safeGoogleErrorMessage(error),
    });
    throw error;
  }
}

export async function getValidGoogleAccessToken({
  account,
  organizationId,
  repository,
  fetchUrl,
  now = () => new Date(),
}: {
  account: GoogleAccountRecord;
  organizationId: string;
  repository: Pick<GoogleAccountRepository, "updateTokens">;
  fetchUrl?: typeof fetch;
  now?: () => Date;
}) {
  const refreshThreshold = new Date(now().getTime() + 60_000);

  if (account.tokenExpiresAt && account.tokenExpiresAt > refreshThreshold) {
    return decryptSecret(account.accessToken);
  }

  if (!account.refreshToken) {
    throw new Error("Google account needs to be reconnected.");
  }

  const tokens = await refreshGoogleAccessToken({
    refreshToken: decryptSecret(account.refreshToken),
    fetchUrl,
  });

  await repository.updateTokens({
    organizationId,
    accountId: account.id,
    encryptedAccessToken: encryptSecret(tokens.access_token),
    encryptedRefreshToken: tokens.refresh_token
      ? encryptSecret(tokens.refresh_token)
      : undefined,
    tokenExpiresAt: getTokenExpiresAt(tokens.expires_in),
  });

  return tokens.access_token;
}

export async function syncSearchConsoleProperties({
  organizationId,
  accountId,
  sites,
  repository,
  now = () => new Date(),
}: {
  organizationId: string;
  accountId: string;
  sites: GoogleSearchConsoleSite[];
  repository: GoogleAccountRepository;
  now?: () => Date;
}) {
  const startedAt = performance.now();
  const account = await repository.getAccount({ organizationId, accountId });

  if (!account) {
    throw new Error("Google account was not found for this organization.");
  }

  const syncedAt = now();
  const properties = normalizeSearchConsoleSites(sites);
  const result = await repository.reconcileProperties({
    organizationId,
    accountId,
    properties,
    syncedAt,
  });

  await repository.updateSyncStatus({
    organizationId,
    accountId,
    lastSyncedAt: syncedAt,
    syncError: null,
  });

  return {
    ...result,
    durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
  };
}

export function normalizeSearchConsoleSites(
  sites: GoogleSearchConsoleSite[]
): NormalizedSearchConsoleProperty[] {
  const byUrl = new Map<string, NormalizedSearchConsoleProperty>();

  for (const site of sites) {
    const siteUrl = site.siteUrl.trim();

    if (!siteUrl) {
      continue;
    }

    const normalizedSiteUrl = normalizeSearchConsoleSiteUrl(siteUrl);

    byUrl.set(normalizedSiteUrl, {
      siteUrl,
      normalizedSiteUrl,
      permissionLevel: site.permissionLevel,
      propertyType: normalizedSiteUrl.startsWith("sc-domain:")
        ? "DOMAIN"
        : "URL_PREFIX",
      verified: site.permissionLevel !== "siteUnverifiedUser",
    });
  }

  return [...byUrl.values()].sort((a, b) =>
    a.normalizedSiteUrl.localeCompare(b.normalizedSiteUrl)
  );
}

export function normalizeSearchConsoleSiteUrl(siteUrl: string) {
  const trimmed = siteUrl.trim();

  if (trimmed.toLowerCase().startsWith("sc-domain:")) {
    return `sc-domain:${trimmed
      .slice("sc-domain:".length)
      .trim()
      .toLowerCase()
      .replace(/\.$/, "")}`;
  }

  const url = new URL(trimmed);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Search Console property URL must use HTTP or HTTPS.");
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

  if (!url.pathname) {
    url.pathname = "/";
  }

  return url.toString();
}

export function getGoogleTokenStatus(account: GoogleAccountRecord, now = new Date()) {
  if (!account.refreshToken) {
    return "Reconnect required";
  }

  if (!account.tokenExpiresAt) {
    return "Unknown";
  }

  return account.tokenExpiresAt <= now ? "Expired" : "Valid";
}

export function createPrismaGoogleAccountRepository(
  prisma: PrismaClient
): GoogleAccountRepository {
  return {
    async upsertAccount(input) {
      return prisma.googleAccount.upsert({
        where: {
          organizationId_googleUserId: {
            organizationId: input.organizationId,
            googleUserId: input.googleUserId,
          },
        },
        create: {
          organizationId: input.organizationId,
          googleUserId: input.googleUserId,
          email: input.email,
          displayName: input.displayName,
          avatarUrl: input.avatarUrl,
          accessToken: input.encryptedAccessToken,
          refreshToken: input.encryptedRefreshToken,
          tokenExpiresAt: input.tokenExpiresAt,
        },
        update: {
          email: input.email,
          displayName: input.displayName,
          avatarUrl: input.avatarUrl,
          accessToken: input.encryptedAccessToken,
          ...(input.encryptedRefreshToken
            ? { refreshToken: input.encryptedRefreshToken }
            : {}),
          tokenExpiresAt: input.tokenExpiresAt,
          syncError: null,
        },
      });
    },
    listAccounts(organizationId) {
      return prisma.googleAccount.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { properties: true } } },
      }).then((accounts) =>
        accounts.map((account) => ({
          ...account,
          propertyCount: account._count.properties,
        }))
      );
    },
    getAccount({ organizationId, accountId }) {
      return prisma.googleAccount.findFirst({
        where: { id: accountId, organizationId },
      });
    },
    async updateTokens(input) {
      await prisma.googleAccount.update({
        where: { id: input.accountId, organizationId: input.organizationId },
        data: {
          accessToken: input.encryptedAccessToken,
          ...(input.encryptedRefreshToken
            ? { refreshToken: input.encryptedRefreshToken }
            : {}),
          tokenExpiresAt: input.tokenExpiresAt,
        },
        select: { id: true },
      });
    },
    async updateSyncStatus(input) {
      await prisma.googleAccount.update({
        where: { id: input.accountId, organizationId: input.organizationId },
        data: {
          ...(input.lastSyncedAt ? { lastSyncedAt: input.lastSyncedAt } : {}),
          syncError: input.syncError ?? null,
        },
        select: { id: true },
      });
    },
    async reconcileProperties({ organizationId, accountId, properties, syncedAt }) {
      const existing = await prisma.searchConsoleProperty.findMany({
        where: { googleAccountId: accountId, organizationId },
        select: {
          id: true,
          siteUrl: true,
          normalizedSiteUrl: true,
          permissionLevel: true,
          propertyType: true,
          verified: true,
          syncStatus: true,
          removedFromGoogleAt: true,
          websiteId: true,
        },
      });
      const incomingUrls = properties.map((property) => property.normalizedSiteUrl);
      const existingByUrl = new Map(
        existing.map((property) => [property.normalizedSiteUrl, property])
      );
      const createData = properties
        .filter((property) => !existingByUrl.has(property.normalizedSiteUrl))
        .map((property) => ({
          googleAccountId: accountId,
          organizationId,
          syncStatus: "ACTIVE" as const,
          lastSyncedAt: syncedAt,
          lastSeenAt: syncedAt,
          removedFromGoogleAt: null,
          ...property,
        }));
      const changed = properties.flatMap((property) => {
        const existingProperty = existingByUrl.get(property.normalizedSiteUrl);

        if (!existingProperty) {
          return [];
        }

        const wasMissing = existingProperty.syncStatus === "MISSING";
        const changedFields =
          existingProperty.siteUrl !== property.siteUrl ||
          existingProperty.permissionLevel !== property.permissionLevel ||
          existingProperty.propertyType !== property.propertyType ||
          existingProperty.verified !== property.verified ||
          existingProperty.syncStatus !== "ACTIVE" ||
          existingProperty.removedFromGoogleAt !== null;

        return changedFields ? [{ property, existingProperty, wasMissing }] : [];
      });
      const unchangedProperties = properties.flatMap((property) => {
        const existingProperty = existingByUrl.get(property.normalizedSiteUrl);

        if (
          !existingProperty ||
          changed.some(
            (changedProperty) =>
              changedProperty.property.normalizedSiteUrl === property.normalizedSiteUrl
          )
        ) {
          return [];
        }

        return [existingProperty];
      });
      const operations = [];

      if (createData.length) {
        operations.push(
          prisma.searchConsoleProperty.createMany({
            data: createData,
            skipDuplicates: true,
          })
        );
      }

      for (const { property } of changed) {
        operations.push(
          prisma.searchConsoleProperty.update({
            where: {
              googleAccountId_normalizedSiteUrl: {
                googleAccountId: accountId,
                normalizedSiteUrl: property.normalizedSiteUrl,
              },
            },
            data: {
              siteUrl: property.siteUrl,
              permissionLevel: property.permissionLevel,
              propertyType: property.propertyType,
              verified: property.verified,
              syncStatus: "ACTIVE",
              lastSyncedAt: syncedAt,
              lastSeenAt: syncedAt,
              removedFromGoogleAt: null,
            },
            select: { id: true },
          })
        );
      }

      if (unchangedProperties.length) {
        operations.push(
          prisma.searchConsoleProperty.updateMany({
            where: {
              id: { in: unchangedProperties.map((property) => property.id) },
              organizationId,
              googleAccountId: accountId,
            },
            data: {
              lastSyncedAt: syncedAt,
              lastSeenAt: syncedAt,
            },
          })
        );
      }

      const removed = existing.filter(
        (property) => !incomingUrls.includes(property.normalizedSiteUrl)
      );
      const newlyMissing = removed.filter(
        (property) => property.syncStatus !== "MISSING"
      );

      if (removed.length) {
        for (const property of removed) {
          operations.push(
            prisma.searchConsoleProperty.update({
              where: { id: property.id, organizationId, googleAccountId: accountId },
              data: {
                syncStatus: "MISSING",
                lastSyncedAt: syncedAt,
                removedFromGoogleAt: property.removedFromGoogleAt ?? syncedAt,
              },
              select: { id: true },
            })
          );
        }
      }

      if (operations.length) {
        await prisma.$transaction(operations);
      }

      const restored = changed.filter((property) => property.wasMissing).length;
      const updated = changed.length - restored;
      const unchanged = unchangedProperties.length;

      return {
        discovered: properties.length,
        created: createData.length,
        updated,
        unchanged,
        markedMissing: newlyMissing.length,
        restored,
        errors: [],
        durationMs: 0,
      };
    },
    async disconnectAccount({ organizationId, accountId }) {
      const deleted = await prisma.googleAccount.deleteMany({
        where: { id: accountId, organizationId },
      });

      return deleted.count > 0;
    },
  };
}

function safeGoogleErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.slice(0, 300);
  }

  return "Google account synchronization failed.";
}
