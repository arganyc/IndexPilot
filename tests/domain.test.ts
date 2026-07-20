import { describe, expect, it } from "vitest";

import {
  isValidDomain,
  normalizeDomain,
} from "../lib/websites/domain";

describe("domain normalization", () => {
  it("normalizes protocol, casing, www, and trailing slash", () => {
    expect(normalizeDomain("https://www.Example.com/")).toEqual({
      normalizedDomain: "example.com",
      protocol: "HTTPS",
    });
  });

  it("removes paths from domains", () => {
    expect(normalizeDomain("http://example.com/path")).toEqual({
      normalizedDomain: "example.com",
      protocol: "HTTP",
    });
  });

  it("normalizes domains without a protocol", () => {
    expect(normalizeDomain("www.example.com")).toEqual({
      normalizedDomain: "example.com",
      protocol: "HTTPS",
    });
  });
});

describe("domain validation", () => {
  it("accepts valid website domains", () => {
    expect(isValidDomain("example.com")).toBe(true);
    expect(isValidDomain("subdomain.example.co")).toBe(true);
  });

  it("rejects invalid website domains", () => {
    expect(isValidDomain("localhost")).toBe(false);
    expect(isValidDomain("https://example")).toBe(false);
    expect(isValidDomain("not a domain.com")).toBe(false);
    expect(isValidDomain("ftp://example.com")).toBe(false);
  });
});
