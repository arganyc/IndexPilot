import { describe, expect, it } from "vitest";

import {
  buildGoogleSearchConsolePropertyUrl,
  buildSearchConsolePropertyDetailsViewModel,
  getSearchConsolePropertyDetails,
  type SearchConsolePropertyDetailsRecord,
  type SearchConsolePropertyDetailsRepository,
} from "../lib/search-console/property-details";

const organizationId = "org-1";
const otherOrganizationId = "org-2";
const baseDate = new Date("2026-07-18T12:00:00.000Z");

class FakePropertyDetailsRepository
  implements SearchConsolePropertyDetailsRepository
{
  constructor(private readonly properties: SearchConsolePropertyDetailsRecord[]) {}

  async getPropertyById(propertyId: string) {
    return this.properties.find((property) => property.id === propertyId) ?? null;
  }
}

function createProperty(
  input: Partial<SearchConsolePropertyDetailsRecord> = {}
): SearchConsolePropertyDetailsRecord {
  return {
    id: input.id ?? "property-1",
    organizationId: input.organizationId ?? organizationId,
    siteUrl: input.siteUrl ?? "https://example.com/",
    normalizedSiteUrl: input.normalizedSiteUrl ?? "https://example.com/",
    propertyType: input.propertyType ?? "URL_PREFIX",
    permissionLevel: input.permissionLevel ?? "siteOwner",
    verified: input.verified ?? true,
    syncStatus: input.syncStatus ?? "ACTIVE",
    lastSyncedAt: "lastSyncedAt" in input ? input.lastSyncedAt ?? null : baseDate,
    lastSeenAt: "lastSeenAt" in input ? input.lastSeenAt ?? null : baseDate,
    removedFromGoogleAt:
      "removedFromGoogleAt" in input ? input.removedFromGoogleAt ?? null : null,
    createdAt: input.createdAt ?? baseDate,
    updatedAt: input.updatedAt ?? baseDate,
    googleAccount:
      "googleAccount" in input
        ? input.googleAccount ?? null
        : {
            id: "account-1",
            organizationId,
            email: "owner@example.com",
            displayName: "Example Owner",
          },
    website:
      "website" in input
        ? input.website ?? null
        : {
            id: "website-1",
            organizationId,
            name: "Example",
            domain: "example.com",
            status: "ACTIVE",
          },
  };
}

async function loadProperty(property: SearchConsolePropertyDetailsRecord) {
  return getSearchConsolePropertyDetails({
    propertyId: property.id,
    organizationId,
    repository: new FakePropertyDetailsRepository([property]),
  });
}

describe("Search Console property details", () => {
  it("renders property details from synchronized data", () => {
    const view = buildSearchConsolePropertyDetailsViewModel(createProperty());
    const valuesByLabel = new Map(
      view.details.map((detail) => [detail.label, detail.value])
    );

    expect(view.title).toBe("https://example.com/");
    expect(valuesByLabel.get("Full property URL")).toBe("https://example.com/");
    expect(valuesByLabel.get("Normalized property URL")).toBe(
      "https://example.com/"
    );
    expect(valuesByLabel.get("Google account email")).toBe("owner@example.com");
    expect(valuesByLabel.get("Linked website name")).toBe("Example");
  });

  it("renders optional values as Not available", () => {
    const view = buildSearchConsolePropertyDetailsViewModel(
      createProperty({
        googleAccount: {
          id: "account-1",
          organizationId,
          email: "owner@example.com",
          displayName: null,
        },
        website: null,
        lastSeenAt: null,
        removedFromGoogleAt: null,
      })
    );
    const placeholders = view.details.filter((detail) => detail.placeholder);

    expect(placeholders.map((detail) => detail.label)).toEqual(
      expect.arrayContaining([
        "Google account display name",
        "Linked website name",
        "Linked website domain",
        "Last seen in Google",
        "Removed from Google date",
      ])
    );
    expect(placeholders.every((detail) => detail.value === "Not available")).toBe(
      true
    );
  });

  it("renders active status", () => {
    const view = buildSearchConsolePropertyDetailsViewModel(
      createProperty({ syncStatus: "ACTIVE" })
    );

    expect(view.statusBadge).toMatchObject({ label: "Active", variant: "default" });
  });

  it("renders missing status as noticeable", () => {
    const view = buildSearchConsolePropertyDetailsViewModel(
      createProperty({ syncStatus: "MISSING" })
    );

    expect(view.statusBadge.label).toBe("Missing");
    expect(view.statusBadge.className).toContain("amber");
  });

  it("renders error status as destructive", () => {
    const view = buildSearchConsolePropertyDetailsViewModel(
      createProperty({ syncStatus: "ERROR" })
    );

    expect(view.statusBadge).toMatchObject({
      label: "Error",
      variant: "destructive",
    });
  });

  it("renders verified and unverified badges", () => {
    const verified = buildSearchConsolePropertyDetailsViewModel(
      createProperty({ verified: true })
    );
    const unverified = buildSearchConsolePropertyDetailsViewModel(
      createProperty({ verified: false })
    );

    expect(verified.verificationBadge.label).toBe("Verified");
    expect(unverified.verificationBadge.label).toBe("Unverified");
  });

  it("renders linked property state", () => {
    const view = buildSearchConsolePropertyDetailsViewModel(createProperty());

    expect(view.isLinked).toBe(true);
    expect(view.linkBadge.label).toBe("Linked");
  });

  it("renders unlinked property state", () => {
    const view = buildSearchConsolePropertyDetailsViewModel(
      createProperty({ website: null })
    );

    expect(view.isLinked).toBe(false);
    expect(view.linkBadge.label).toBe("Unlinked");
  });

  it("marks archived linked websites", () => {
    const view = buildSearchConsolePropertyDetailsViewModel(
      createProperty({
        website: {
          id: "website-1",
          organizationId,
          name: "Example",
          domain: "example.com",
          status: "ARCHIVED",
        },
      })
    );

    expect(view.isArchivedWebsite).toBe(true);
  });

  it("returns not found for a missing property", async () => {
    const result = await getSearchConsolePropertyDetails({
      propertyId: "missing",
      organizationId,
      repository: new FakePropertyDetailsRepository([]),
    });

    expect(result).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("rejects cross-organization property access without revealing existence", async () => {
    const result = await loadProperty(
      createProperty({ organizationId: otherOrganizationId })
    );

    expect(result).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("rejects invalid linked website organization data", async () => {
    const result = await loadProperty(
      createProperty({
        website: {
          id: "website-1",
          organizationId: otherOrganizationId,
          name: "Other",
          domain: "other.example.com",
          status: "ACTIVE",
        },
      })
    );

    expect(result).toEqual({
      ok: false,
      reason: "INVALID_LINKED_WEBSITE_ORG",
    });
  });

  it("rejects invalid Google account organization data", async () => {
    const result = await loadProperty(
      createProperty({
        googleAccount: {
          id: "account-1",
          organizationId: otherOrganizationId,
          email: "other@example.com",
          displayName: "Other",
        },
      })
    );

    expect(result).toEqual({
      ok: false,
      reason: "INVALID_GOOGLE_ACCOUNT_ORG",
    });
  });

  it("generates a safe Google Search Console link", () => {
    const link = new URL(
      buildGoogleSearchConsolePropertyUrl("https://example.com/")
    );

    expect(link.origin).toBe("https://search.google.com");
    expect(link.pathname).toBe("/search-console");
    expect(link.searchParams.get("resource_id")).toBe("https://example.com/");
  });

  it("does not render sensitive OAuth tokens in property details output", () => {
    const property = {
      ...createProperty(),
      accessToken: "sensitive-access-token",
      refreshToken: "sensitive-refresh-token",
      googleAccount: {
        id: "account-1",
        organizationId,
        email: "owner@example.com",
        displayName: "Example Owner",
        accessToken: "nested-sensitive-access-token",
        refreshToken: "nested-sensitive-refresh-token",
      },
    } as SearchConsolePropertyDetailsRecord & {
      accessToken: string;
      refreshToken: string;
    };
    const view = buildSearchConsolePropertyDetailsViewModel(property);
    const serialized = JSON.stringify(view);

    expect(serialized).not.toContain("sensitive-access-token");
    expect(serialized).not.toContain("sensitive-refresh-token");
    expect(serialized).not.toContain("nested-sensitive-access-token");
    expect(serialized).not.toContain("nested-sensitive-refresh-token");
  });
});
