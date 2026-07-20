import { describe, expect, it } from "vitest";

import { getAppOrigin } from "../lib/app-url";

describe("getAppOrigin", () => {
  it("uses the configured public app URL when present", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://indexpilot.cloud";

    expect(getAppOrigin("http://0.0.0.0:3000/api/google/oauth/start")).toBe(
      "https://indexpilot.cloud"
    );

    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it("falls back to the request URL origin when no app URL is configured", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(getAppOrigin("https://example.com/dashboard")).toBe(
      "https://example.com"
    );
  });
});
