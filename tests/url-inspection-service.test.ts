import { describe, expect, it } from "vitest";

import type {
  UrlInspectionClientFailure,
  UrlInspectionClientResult,
  UrlInspectionClientSuccess,
} from "../lib/url-inspections/google-client";
import {
  DuplicateActiveInspectionError,
  runSingleUrlInspection,
  type CreatePendingInspectionData,
  type RunGoogleSingleUrlInspection,
  type SaveCompletedInspectionData,
  type SaveFailedInspectionData,
  type SearchConsolePropertyForSingleInspection,
  type SingleUrlInspectionRepository,
  type UrlRecordForSingleInspection,
  type WebsiteForSingleInspection,
} from "../lib/url-inspections/service";
import type { UrlInspectionStatus } from "../lib/url-inspections/validation";

type StoredInspection = CreatePendingInspectionData & {
  id: string;
  status: UrlInspectionStatus;
  completedAt: Date | null;
  inspectionResultLink: string | null;
  verdict: string | null;
  coverageState: string | null;
  indexingState: string | null;
  robotsTxtState: string | null;
  pageFetchState: string | null;
  googleCanonical: string | null;
  userCanonical: string | null;
  lastCrawlTime: Date | null;
  crawledAs: string | null;
  referringUrls: string[];
  sitemapUrls: string[];
  errorCode: string | null;
  errorMessage: string | null;
  rawResponse: unknown;
  history: UrlInspectionStatus[];
};

const organizationId = "org-1";
const baseDate = new Date("2026-07-18T12:00:00.000Z");

class FakeSingleUrlInspectionRepository
  implements SingleUrlInspectionRepository
{
  websites = new Map<string, WebsiteForSingleInspection>();
  properties = new Map<string, SearchConsolePropertyForSingleInspection>();
  urlRecords = new Map<string, UrlRecordForSingleInspection>();
  inspections: StoredInspection[] = [];

  async getWebsite({ websiteId }: { websiteId: string; organizationId: string }) {
    return this.websites.get(websiteId) ?? null;
  }

  async getSearchConsoleProperty({
    searchConsolePropertyId,
    organizationId: requestedOrganizationId,
  }: {
    searchConsolePropertyId: string;
    organizationId: string;
  }) {
    const property = this.properties.get(searchConsolePropertyId);

    return property?.organizationId === requestedOrganizationId ? property : null;
  }

  async getUrlRecord({
    urlRecordId,
    websiteId,
  }: {
    urlRecordId: string;
    websiteId: string;
  }) {
    const record = this.urlRecords.get(urlRecordId);

    return record?.websiteId === websiteId ? record : null;
  }

  async findActiveInspection({
    organizationId: requestedOrganizationId,
    searchConsolePropertyId,
    normalizedUrl,
  }: {
    organizationId: string;
    searchConsolePropertyId: string;
    normalizedUrl: string;
  }) {
    return (
      this.inspections.find(
        (inspection) =>
          inspection.organizationId === requestedOrganizationId &&
          inspection.searchConsolePropertyId === searchConsolePropertyId &&
          inspection.normalizedUrl === normalizedUrl &&
          (inspection.status === "PENDING" || inspection.status === "RUNNING")
      ) ?? null
    );
  }

  async createPendingInspection(data: CreatePendingInspectionData) {
    const existing = await this.findActiveInspection(data);

    if (existing) {
      throw new DuplicateActiveInspectionError(existing.id);
    }

    const inspection: StoredInspection = {
      ...data,
      id: `inspection-${this.inspections.length + 1}`,
      status: "PENDING",
      completedAt: null,
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
      errorCode: null,
      errorMessage: null,
      rawResponse: null,
      history: ["PENDING"],
    };

    this.inspections.push(inspection);
    return inspection;
  }

  async markInspectionRunning({
    inspectionId,
  }: {
    inspectionId: string;
    organizationId: string;
  }) {
    const inspection = this.getStoredInspection(inspectionId);
    inspection.status = "RUNNING";
    inspection.history.push("RUNNING");
  }

  async saveCompletedInspection(data: SaveCompletedInspectionData) {
    const inspection = this.getStoredInspection(data.inspectionId);
    inspection.status = "COMPLETED";
    inspection.completedAt = data.completedAt;
    inspection.inspectionResultLink = data.result.inspectionResultLink;
    inspection.verdict = data.result.verdict;
    inspection.coverageState = data.result.coverageState;
    inspection.indexingState = data.result.indexingState;
    inspection.robotsTxtState = data.result.robotsTxtState;
    inspection.pageFetchState = data.result.pageFetchState;
    inspection.googleCanonical = data.result.googleCanonical;
    inspection.userCanonical = data.result.userCanonical;
    inspection.lastCrawlTime = data.result.lastCrawlTime;
    inspection.crawledAs = data.result.crawledAs;
    inspection.referringUrls = data.result.referringUrls;
    inspection.sitemapUrls = data.result.sitemapUrls;
    inspection.rawResponse = data.result.rawResponse;
    inspection.errorCode = null;
    inspection.errorMessage = null;
    inspection.history.push("COMPLETED");
  }

  async saveFailedInspection(data: SaveFailedInspectionData) {
    const inspection = this.getStoredInspection(data.inspectionId);
    inspection.status = "FAILED";
    inspection.completedAt = data.completedAt;
    inspection.errorCode = data.result.errorCode;
    inspection.errorMessage = data.result.errorMessage;
    inspection.history.push("FAILED");
  }

  addWebsite(input: Partial<WebsiteForSingleInspection> = {}) {
    const website: WebsiteForSingleInspection = {
      id: input.id ?? "website-1",
      domain: input.domain ?? "example.com",
      normalizedDomain: input.normalizedDomain ?? "example.com",
      organizationId: input.organizationId ?? organizationId,
    };

    this.websites.set(website.id, website);
    return website;
  }

  addProperty(input: Partial<SearchConsolePropertyForSingleInspection> = {}) {
    const property: SearchConsolePropertyForSingleInspection = {
      id: input.id ?? "property-1",
      organizationId: input.organizationId ?? organizationId,
      googleAccountId: input.googleAccountId ?? "account-1",
      websiteId: "websiteId" in input ? input.websiteId ?? null : "website-1",
      siteUrl: input.siteUrl ?? "https://example.com/",
      propertyType: input.propertyType ?? "URL_PREFIX",
      verified: input.verified ?? true,
      syncStatus: input.syncStatus ?? "ACTIVE",
    };

    this.properties.set(property.id, property);
    return property;
  }

  addUrlRecord(input: Partial<UrlRecordForSingleInspection> = {}) {
    const record: UrlRecordForSingleInspection = {
      id: input.id ?? "url-record-1",
      websiteId: input.websiteId ?? "website-1",
      normalizedUrl: input.normalizedUrl ?? "https://example.com/page",
    };

    this.urlRecords.set(record.id, record);
    return record;
  }

  addInspection(input: {
    status: UrlInspectionStatus;
    normalizedUrl?: string;
    searchConsolePropertyId?: string;
  }) {
    const inspection: StoredInspection = {
      organizationId,
      websiteId: "website-1",
      searchConsolePropertyId: input.searchConsolePropertyId ?? "property-1",
      urlRecordId: null,
      inspectedUrl: input.normalizedUrl ?? "https://example.com/page",
      normalizedUrl: input.normalizedUrl ?? "https://example.com/page",
      requestedAt: baseDate,
      id: `inspection-${this.inspections.length + 1}`,
      status: input.status,
      completedAt: null,
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
      errorCode: null,
      errorMessage: null,
      rawResponse: null,
      history: [input.status],
    };

    this.inspections.push(inspection);
    return inspection;
  }

  private getStoredInspection(inspectionId: string) {
    const inspection = this.inspections.find((item) => item.id === inspectionId);

    if (!inspection) {
      throw new Error("Missing inspection.");
    }

    return inspection;
  }
}

function createRepository() {
  const repository = new FakeSingleUrlInspectionRepository();
  repository.addWebsite();
  repository.addProperty();

  return repository;
}

function successResult(input: Partial<UrlInspectionClientSuccess> = {}) {
  return {
    success: true,
    rawResponse: input.rawResponse ?? {
      inspectionResult: { indexStatusResult: { verdict: "PASS" } },
    },
    inspectionResultLink:
      input.inspectionResultLink ??
      "https://search.google.com/search-console/inspect",
    verdict: input.verdict ?? "PASS",
    coverageState: input.coverageState ?? "Submitted and indexed",
    indexingState: input.indexingState ?? "INDEXING_ALLOWED",
    robotsTxtState: input.robotsTxtState ?? "ALLOWED",
    pageFetchState: input.pageFetchState ?? "SUCCESSFUL",
    googleCanonical: input.googleCanonical ?? "https://example.com/page",
    userCanonical: input.userCanonical ?? "https://example.com/page",
    lastCrawlTime:
      "lastCrawlTime" in input
        ? input.lastCrawlTime ?? null
        : new Date("2026-07-17T12:00:00.000Z"),
    crawledAs: input.crawledAs ?? "MOBILE",
    referringUrls: input.referringUrls ?? ["https://example.com/"],
    sitemapUrls: input.sitemapUrls ?? ["https://example.com/sitemap.xml"],
  } satisfies UrlInspectionClientSuccess;
}

function failureResult(input: Partial<UrlInspectionClientFailure> = {}) {
  return {
    success: false,
    errorCode: input.errorCode ?? "PERMISSION_DENIED",
    errorMessage: input.errorMessage ?? "Google denied access.",
    retryable: input.retryable ?? false,
    httpStatus: input.httpStatus,
  } satisfies UrlInspectionClientFailure;
}

function googleClient(result: UrlInspectionClientResult): RunGoogleSingleUrlInspection {
  return async () => result;
}

async function runWithRepository({
  repository = createRepository(),
  result = successResult(),
  inspectedUrl = "https://example.com/page",
  urlRecordId,
}: {
  repository?: FakeSingleUrlInspectionRepository;
  result?: UrlInspectionClientResult;
  inspectedUrl?: string;
  urlRecordId?: string;
} = {}) {
  return runSingleUrlInspection({
    input: {
      websiteId: "website-1",
      searchConsolePropertyId: "property-1",
      inspectedUrl,
      ...(urlRecordId ? { urlRecordId } : {}),
    },
    repository,
    googleClient: googleClient(result),
    getOrganizationContext: async () => ({
      userId: "user-1",
      organizationId,
    }),
    now: () => baseDate,
  });
}

describe("single URL inspection service", () => {
  it("runs a successful inspection lifecycle", async () => {
    const repository = createRepository();
    const result = await runWithRepository({ repository });
    const inspection = repository.inspections[0];

    expect(result).toEqual({
      outcome: "completed",
      inspectionId: "inspection-1",
    });
    expect(inspection?.history).toEqual(["PENDING", "RUNNING", "COMPLETED"]);
  });

  it("persists PENDING to RUNNING to COMPLETED", async () => {
    const repository = createRepository();
    await runWithRepository({ repository });

    expect(repository.inspections[0]?.status).toBe("COMPLETED");
    expect(repository.inspections[0]?.requestedAt).toBe(baseDate);
    expect(repository.inspections[0]?.completedAt).toBe(baseDate);
  });

  it("runs a failed inspection lifecycle", async () => {
    const repository = createRepository();
    const result = await runWithRepository({
      repository,
      result: failureResult({
        errorCode: "RATE_LIMITED",
        errorMessage: "Google rate limited the request.",
        retryable: true,
      }),
    });

    expect(result).toMatchObject({
      outcome: "failed",
      inspectionId: "inspection-1",
      errorCode: "RATE_LIMITED",
      retryable: true,
    });
    expect(repository.inspections[0]?.history).toEqual([
      "PENDING",
      "RUNNING",
      "FAILED",
    ]);
  });

  it("prevents duplicate active inspections", async () => {
    const repository = createRepository();
    repository.addInspection({ status: "RUNNING" });
    const result = await runWithRepository({ repository });

    expect(result).toEqual({
      outcome: "alreadyInProgress",
      inspectionId: "inspection-1",
    });
    expect(repository.inspections).toHaveLength(1);
  });

  it("allows reinspection after COMPLETED", async () => {
    const repository = createRepository();
    repository.addInspection({ status: "COMPLETED" });
    const result = await runWithRepository({ repository });

    expect(result).toEqual({
      outcome: "completed",
      inspectionId: "inspection-2",
    });
    expect(repository.inspections).toHaveLength(2);
  });

  it("allows reinspection after FAILED", async () => {
    const repository = createRepository();
    repository.addInspection({ status: "FAILED" });
    const result = await runWithRepository({ repository });

    expect(result).toEqual({
      outcome: "completed",
      inspectionId: "inspection-2",
    });
    expect(repository.inspections).toHaveLength(2);
  });

  it("rejects website ownership mismatches", async () => {
    const repository = createRepository();
    repository.websites.get("website-1")!.organizationId = "org-2";
    const result = await runWithRepository({ repository });

    expect(result).toMatchObject({
      outcome: "unauthorized",
    });
  });

  it("rejects property ownership mismatches", async () => {
    const repository = createRepository();
    repository.properties.get("property-1")!.organizationId = "org-2";
    const result = await runWithRepository({ repository });

    expect(result).toMatchObject({
      outcome: "notFound",
      errorMessage: "Search Console property was not found.",
    });
  });

  it("rejects inactive properties", async () => {
    const repository = createRepository();
    repository.properties.get("property-1")!.syncStatus = "MISSING";
    const result = await runWithRepository({ repository });

    expect(result).toMatchObject({
      outcome: "validationError",
      errorCode: "PROPERTY_INACTIVE",
    });
  });

  it("rejects unverified properties", async () => {
    const repository = createRepository();
    repository.properties.get("property-1")!.verified = false;
    const result = await runWithRepository({ repository });

    expect(result).toMatchObject({
      outcome: "validationError",
      errorCode: "PROPERTY_UNVERIFIED",
    });
  });

  it("rejects URLs outside the selected website", async () => {
    const result = await runWithRepository({
      inspectedUrl: "https://other.example.net/page",
    });

    expect(result).toMatchObject({
      outcome: "validationError",
      errorCode: "URL_OUTSIDE_WEBSITE",
    });
  });

  it("rejects URLs incompatible with the selected property", async () => {
    const repository = createRepository();
    repository.properties.get("property-1")!.siteUrl = "https://example.com/blog/";
    const result = await runWithRepository({
      repository,
      inspectedUrl: "https://example.com/shop/page",
    });

    expect(result).toMatchObject({
      outcome: "validationError",
      errorCode: "PROPERTY_INCOMPATIBLE_URL",
    });
  });

  it("rejects invalid UrlRecord relationships", async () => {
    const repository = createRepository();
    repository.addUrlRecord({ id: "url-record-1", websiteId: "website-2" });
    const result = await runWithRepository({
      repository,
      urlRecordId: "url-record-1",
    });

    expect(result).toMatchObject({
      outcome: "validationError",
      errorCode: "INVALID_URL_RECORD",
    });
  });

  it("persists successful inspection result fields", async () => {
    const repository = createRepository();
    await runWithRepository({
      repository,
      result: successResult({
        rawResponse: {
          inspectionResult: { indexStatusResult: { verdict: "PASS" } },
          Authorization: "Bearer secret-token",
        },
      }),
    });
    const inspection = repository.inspections[0];

    expect(inspection).toMatchObject({
      status: "COMPLETED",
      inspectionResultLink: "https://search.google.com/search-console/inspect",
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
      errorCode: null,
      errorMessage: null,
    });
    expect(JSON.stringify(inspection?.rawResponse)).not.toContain("secret-token");
  });

  it("persists failed inspection result fields", async () => {
    const repository = createRepository();
    await runWithRepository({
      repository,
      result: failureResult({
        errorCode: "UNAUTHORIZED",
        errorMessage: "Authorization failed for Bearer very-secret-token",
      }),
    });
    const inspection = repository.inspections[0];

    expect(inspection).toMatchObject({
      status: "FAILED",
      errorCode: "UNAUTHORIZED",
      errorMessage: "Authorization failed for Bearer [redacted]",
    });
    expect(inspection?.rawResponse).toBeNull();
  });

  it("does not persist sensitive request data", async () => {
    const repository = createRepository();
    await runWithRepository({
      repository,
      result: successResult({
        rawResponse: {
          access_token: "access-token-secret",
          refreshToken: "refresh-token-secret",
          nested: {
            client_secret: "client-secret-value",
            visible: "kept",
          },
        },
      }),
    });
    const serialized = JSON.stringify(repository.inspections[0]);

    expect(serialized).not.toContain("access-token-secret");
    expect(serialized).not.toContain("refresh-token-secret");
    expect(serialized).not.toContain("client-secret-value");
    expect(serialized).toContain("kept");
  });
});
