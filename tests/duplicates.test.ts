import { describe, expect, it } from "vitest";

import { getDuplicateDomainMessage } from "../lib/websites/duplicates";

describe("duplicate domain prevention", () => {
  it("returns a clear message when another website uses the domain", async () => {
    await expect(
      getDuplicateDomainMessage({
        normalizedDomain: "example.com",
        findWebsiteByNormalizedDomain: async () => ({ id: "existing-id" }),
      })
    ).resolves.toBe("A website with this domain already exists.");
  });

  it("allows the current website to keep its domain", async () => {
    await expect(
      getDuplicateDomainMessage({
        normalizedDomain: "example.com",
        currentWebsiteId: "existing-id",
        findWebsiteByNormalizedDomain: async () => ({ id: "existing-id" }),
      })
    ).resolves.toBeNull();
  });

  it("allows unused domains", async () => {
    await expect(
      getDuplicateDomainMessage({
        normalizedDomain: "example.com",
        findWebsiteByNormalizedDomain: async () => null,
      })
    ).resolves.toBeNull();
  });
});
