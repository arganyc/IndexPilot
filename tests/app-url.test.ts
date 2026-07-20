import { afterEach, describe, expect, it, vi } from "vitest";

import { getAppOrigin } from "../lib/app-url";

describe("getAppOrigin", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    vi.unstubAllEnvs();
  });

  it("uses the configured public app URL when present", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://indexpilot.cloud";

    expect(getAppOrigin("http://0.0.0.0:3000/api/google/oauth/start")).toBe(
      "https://indexpilot.cloud"
    );
  });

  it("uses forwarded public host headers before internal request URLs", () => {
    const headers = new Headers({
      "x-forwarded-host": "indexpilot.cloud",
      "x-forwarded-proto": "https",
    });

    expect(
      getAppOrigin("http://0.0.0.0:3000/api/google/oauth/start", headers)
    ).toBe("https://indexpilot.cloud");
  });

  it("uses the production site origin when Hostinger only exposes an internal URL", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(getAppOrigin("http://0.0.0.0:3000/api/google/oauth/start")).toBe(
      "https://indexpilot.cloud"
    );
  });

  it("falls back to the request URL origin when no app URL is configured", () => {
    expect(getAppOrigin("https://example.com/dashboard")).toBe(
      "https://example.com"
    );
  });
});
