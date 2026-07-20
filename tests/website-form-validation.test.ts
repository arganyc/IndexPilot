import { describe, expect, it } from "vitest";

import { websiteFormSchema } from "../lib/websites/validation";

const validWebsite = {
  name: "Example",
  domain: "https://www.example.com",
  platform: "NEXTJS",
  priority: "HIGH",
  status: "ACTIVE",
  notes: "Managed website.",
};

describe("website form validation", () => {
  it("accepts a valid website form", () => {
    expect(websiteFormSchema.safeParse(validWebsite).success).toBe(true);
  });

  it("requires a valid website name", () => {
    const result = websiteFormSchema.safeParse({
      ...validWebsite,
      name: "",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.name?.[0]).toContain(
      "Website name"
    );
  });

  it("requires a valid domain", () => {
    const result = websiteFormSchema.safeParse({
      ...validWebsite,
      domain: "bad domain",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.domain?.[0]).toBe(
      "Enter a valid domain, like example.com."
    );
  });

  it("requires enum values for select fields", () => {
    const result = websiteFormSchema.safeParse({
      ...validWebsite,
      priority: "URGENT",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.priority?.[0]).toBeTruthy();
  });
});
