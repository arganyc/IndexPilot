import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type GoogleAccountFixture = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  createdAt: Date;
  lastSyncedAt: Date | null;
  syncError: string | null;
  propertyCount: number;
};

const mockState = vi.hoisted(() => ({
  accounts: [] as GoogleAccountFixture[],
}));

vi.mock("@/lib/auth/organization", () => ({
  getCurrentOrganizationContext: async () => ({
    userId: "user-1",
    organizationId: "org-1",
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/google/accounts", () => ({
  createPrismaGoogleAccountRepository: () => ({
    listAccounts: async () => mockState.accounts,
  }),
  getGoogleTokenStatus: () => "Valid",
}));

vi.mock("@/components/google/google-account-actions", () => ({
  GoogleAccountActions: ({ accountId }: { accountId: string }) => (
    <div data-account-actions={accountId}>Google account actions</div>
  ),
}));

function createAccount(
  input: Partial<GoogleAccountFixture> = {}
): GoogleAccountFixture {
  return {
    id: input.id ?? "account-1",
    email: input.email ?? "owner@example.com",
    displayName: input.displayName ?? "Owner",
    avatarUrl: input.avatarUrl ?? null,
    refreshToken: input.refreshToken ?? "refresh-token",
    tokenExpiresAt: input.tokenExpiresAt ?? new Date("2026-07-19T12:00:00.000Z"),
    createdAt: input.createdAt ?? new Date("2026-07-19T11:00:00.000Z"),
    lastSyncedAt: input.lastSyncedAt ?? null,
    syncError: input.syncError ?? null,
    propertyCount: input.propertyCount ?? 0,
  };
}

async function renderGoogleSettingsPage() {
  const { default: GoogleSettingsPage } = await import(
    "../app/(app)/settings/google/page"
  );
  const page = await GoogleSettingsPage({
    searchParams: Promise.resolve({}),
  });

  return renderToStaticMarkup(page);
}

beforeEach(() => {
  mockState.accounts = [];
});

describe("Google settings empty state", () => {
  it("renders the no-account first-use empty state", async () => {
    const markup = await renderGoogleSettingsPage();

    expect(markup).toContain("No Google accounts connected");
    expect(markup).toContain(
      "Connect a Google account to sync Search Console properties for this organization."
    );
    expect(markup).toContain('href="/api/google/oauth/start"');
    expect(markup).toContain("Connect Account");
    expect(markup).toContain('href="/search-console/properties"');
    expect(markup).toContain("Search Console properties");
  });

  it("keeps populated Google account state out of the empty state", async () => {
    mockState.accounts = [createAccount()];

    const markup = await renderGoogleSettingsPage();

    expect(markup).toContain("owner@example.com");
    expect(markup).toContain("Google account actions");
    expect(markup).not.toContain(
      "Connect a Google account to sync Search Console properties for this organization."
    );
  });
});
