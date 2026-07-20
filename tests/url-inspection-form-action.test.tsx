import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SingleUrlInspectionResult } from "../lib/url-inspections/service";

const mockRunSingleUrlInspection = vi.hoisted(() => vi.fn());
const mockRepositoryFactory = vi.hoisted(() => vi.fn(() => ({ repository: true })));
const mockGoogleClientFactory = vi.hoisted(() => vi.fn(() => vi.fn()));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/url-inspections/prisma-service-repository", () => ({
  createPrismaSingleUrlInspectionGoogleClient: mockGoogleClientFactory,
  createPrismaSingleUrlInspectionRepository: mockRepositoryFactory,
}));

vi.mock("@/lib/url-inspections/service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/url-inspections/service")>();

  return {
    ...actual,
    runSingleUrlInspection: mockRunSingleUrlInspection,
  };
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

function formData(input: {
  inspectedUrl?: string;
  searchConsolePropertyId?: string;
  organizationId?: string;
}) {
  const data = new FormData();

  if (input.inspectedUrl !== undefined) {
    data.set("inspectedUrl", input.inspectedUrl);
  }

  if (input.searchConsolePropertyId !== undefined) {
    data.set("searchConsolePropertyId", input.searchConsolePropertyId);
  }

  if (input.organizationId !== undefined) {
    data.set("organizationId", input.organizationId);
  }

  return data;
}

async function submit(input: {
  inspectedUrl?: string;
  searchConsolePropertyId?: string;
  organizationId?: string;
}) {
  const { submitSingleUrlInspectionForm } = await import(
    "../app/(app)/websites/[id]/inspect/actions"
  );

  return submitSingleUrlInspectionForm(
    { websiteId: "website-1", urlRecordId: "url-record-1" },
    {
      values: {
        inspectedUrl: "",
        searchConsolePropertyId: "",
      },
      fieldErrors: {},
      formError: "",
    },
    formData(input)
  );
}

function mockServiceResult(result: SingleUrlInspectionResult) {
  mockRunSingleUrlInspection.mockResolvedValueOnce(result);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("single URL inspection form action", () => {
  it("returns a required URL error", async () => {
    const result = await submit({
      inspectedUrl: "  ",
      searchConsolePropertyId: "property-1",
    });

    expect(result.fieldErrors.inspectedUrl).toBe("Enter a URL.");
    expect(mockRunSingleUrlInspection).not.toHaveBeenCalled();
  });

  it("returns a malformed URL error", async () => {
    const result = await submit({
      inspectedUrl: "not a url",
      searchConsolePropertyId: "property-1",
    });

    expect(result.fieldErrors.inspectedUrl).toBe("Enter a valid URL.");
    expect(mockRunSingleUrlInspection).not.toHaveBeenCalled();
  });

  it("returns an unsupported protocol error", async () => {
    const result = await submit({
      inspectedUrl: "ftp://example.com/page",
      searchConsolePropertyId: "property-1",
    });

    expect(result.fieldErrors.inspectedUrl).toBe("URL must use HTTP or HTTPS.");
    expect(mockRunSingleUrlInspection).not.toHaveBeenCalled();
  });

  it("returns a required property error", async () => {
    const result = await submit({
      inspectedUrl: "https://example.com/page",
      searchConsolePropertyId: "",
    });

    expect(result.fieldErrors.searchConsolePropertyId).toBe(
      "Select a Search Console property."
    );
    expect(mockRunSingleUrlInspection).not.toHaveBeenCalled();
  });

  it("preserves submitted values after validation failure", async () => {
    const result = await submit({
      inspectedUrl: "notaurl",
      searchConsolePropertyId: "property-1",
    });

    expect(result.values).toEqual({
      inspectedUrl: "notaurl",
      searchConsolePropertyId: "property-1",
    });
  });

  it("redirects after a successful service result", async () => {
    mockServiceResult({ outcome: "completed", inspectionId: "inspection-1" });

    await expect(
      submit({
        inspectedUrl: " https://example.com/page ",
        searchConsolePropertyId: "property-1",
        organizationId: "org-from-browser",
      })
    ).rejects.toThrow("NEXT_REDIRECT:/websites/website-1/inspections/inspection-1");

    expect(mockRunSingleUrlInspection).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          websiteId: "website-1",
          inspectedUrl: "https://example.com/page",
          searchConsolePropertyId: "property-1",
          urlRecordId: "url-record-1",
        },
      })
    );
    expect(JSON.stringify(mockRunSingleUrlInspection.mock.calls[0])).not.toContain(
      "org-from-browser"
    );
  });

  it("redirects after a failed inspection with an ID", async () => {
    mockServiceResult({
      outcome: "failed",
      inspectionId: "inspection-failed",
      errorCode: "RATE_LIMITED",
      errorMessage: "Rate limited.",
      retryable: true,
    });

    await expect(
      submit({
        inspectedUrl: "https://example.com/page",
        searchConsolePropertyId: "property-1",
      })
    ).rejects.toThrow(
      "NEXT_REDIRECT:/websites/website-1/inspections/inspection-failed"
    );
  });

  it("redirects to an already-running inspection", async () => {
    mockServiceResult({
      outcome: "alreadyInProgress",
      inspectionId: "inspection-running",
    });

    await expect(
      submit({
        inspectedUrl: "https://example.com/page",
        searchConsolePropertyId: "property-1",
      })
    ).rejects.toThrow(
      "NEXT_REDIRECT:/websites/website-1/inspections/inspection-running"
    );
  });

  it("shows a sanitized service validation error", async () => {
    mockServiceResult({
      outcome: "validationError",
      errorCode: "PROPERTY_INCOMPATIBLE_URL",
      errorMessage:
        "URL is outside property. Bearer secret-token access_token=secret-value",
    });

    const result = await submit({
      inspectedUrl: "https://example.com/page",
      searchConsolePropertyId: "property-1",
    });

    expect(result.formError).toContain("URL is outside property.");
    expect(result.formError).not.toContain("secret-token");
    expect(result.formError).not.toContain("secret-value");
  });

  it("handles unauthorized results safely", async () => {
    mockServiceResult({
      outcome: "unauthorized",
      errorMessage: "Internal authorization failure.",
    });

    const result = await submit({
      inspectedUrl: "https://example.com/page",
      searchConsolePropertyId: "property-1",
    });

    expect(result.formError).toBe(
      "You are not authorized to inspect URLs for this website."
    );
  });

  it("handles not-found results safely", async () => {
    mockServiceResult({
      outcome: "notFound",
      errorMessage: "Property id property-secret was not found.",
    });

    const result = await submit({
      inspectedUrl: "https://example.com/page",
      searchConsolePropertyId: "property-secret",
    });

    expect(result.formError).toBe(
      "The website or Search Console property could not be found."
    );
    expect(result.formError).not.toContain("property-secret");
  });

  it("shows a generic message after unexpected service failure", async () => {
    mockRunSingleUrlInspection.mockRejectedValueOnce(
      new Error("database password and stack trace")
    );

    const result = await submit({
      inspectedUrl: "https://example.com/page",
      searchConsolePropertyId: "property-1",
    });

    expect(result.formError).toBe(
      "URL inspection could not be started. Try again shortly."
    );
    expect(result.formError).not.toContain("database password");
  });
});

describe("single URL inspection form component helpers", () => {
  it("uses a disabled pending label", async () => {
    const { inspectButtonLabel, isInspectSubmitDisabled } = await import(
      "../components/url-inspections/inspection-form"
    );

    expect(inspectButtonLabel(true)).toBe("Inspecting...");
    expect(inspectButtonLabel(false)).toBe("Inspect URL");
    expect(isInspectSubmitDisabled({ disabled: false, pending: true })).toBe(true);
    expect(isInspectSubmitDisabled({ disabled: true, pending: false })).toBe(true);
    expect(isInspectSubmitDisabled({ disabled: false, pending: false })).toBe(false);
  });

  it("prevents duplicate submissions until reset", async () => {
    const { createDuplicateSubmitGuard } = await import(
      "../components/url-inspections/inspection-form"
    );
    const guard = createDuplicateSubmitGuard();

    expect(guard.shouldSubmit()).toBe(true);
    expect(guard.shouldSubmit()).toBe(false);

    guard.reset();

    expect(guard.shouldSubmit()).toBe(true);
  });

  it("does not render sensitive service details in form errors", async () => {
    const { InspectionForm } = await import(
      "../components/url-inspections/inspection-form"
    );
    const action = async () => ({
      values: {
        inspectedUrl: "https://example.com/page",
        searchConsolePropertyId: "property-1",
      },
      fieldErrors: {},
      formError: "Generic safe error.",
    });

    const markup = renderToStaticMarkup(
      <InspectionForm
        action={action}
        defaultInspectedUrl=""
        defaultPropertyId=""
        disabled={false}
        placeholder="https://example.com/page"
        properties={[
          {
            id: "property-1",
            siteUrl: "https://example.com/",
            propertyType: "URL_PREFIX",
            googleAccount: { email: "owner@example.com" },
          },
        ]}
      />
    );

    expect(markup).toContain("Inspect URL");
    expect(markup).not.toContain("access-token");
    expect(markup).not.toContain("refresh-token");
  });
});
