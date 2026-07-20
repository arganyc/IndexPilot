import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearOnboardingDismissal,
  dismissOnboardingCompletedState,
  ONBOARDING_DISMISSAL_STORAGE_KEY,
  readOnboardingDismissal,
  saveOnboardingDismissal,
  shouldRenderOnboardingCompletedState,
} from "@/components/onboarding";

function setWindow(value: unknown) {
  vi.stubGlobal("window", value);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("onboarding local dismissal persistence", () => {
  it("returns false when localStorage is missing during server rendering", () => {
    setWindow(undefined);

    expect(readOnboardingDismissal()).toBe(false);
  });

  it("returns false for missing or invalid values", () => {
    const storage = new Map<string, string>();

    setWindow({
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
    });

    expect(readOnboardingDismissal()).toBe(false);

    storage.set(ONBOARDING_DISMISSAL_STORAGE_KEY, "yes");

    expect(readOnboardingDismissal()).toBe(false);
  });

  it("saves, reads, and clears the versioned dismissal value", () => {
    const storage = new Map<string, string>();

    setWindow({
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
    });

    saveOnboardingDismissal();

    expect(storage.get(ONBOARDING_DISMISSAL_STORAGE_KEY)).toBe("true");
    expect(readOnboardingDismissal()).toBe(true);

    clearOnboardingDismissal();

    expect(readOnboardingDismissal()).toBe(false);
  });

  it("dismisses the completed state by saving and calling the hide callback", () => {
    const storage = new Map<string, string>();
    let hidden = false;

    setWindow({
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
    });

    dismissOnboardingCompletedState(() => {
      hidden = true;
    });

    expect(storage.get(ONBOARDING_DISMISSAL_STORAGE_KEY)).toBe("true");
    expect(hidden).toBe(true);
  });

  it("uses persisted dismissal on remount to hide the completed state", () => {
    const storage = new Map<string, string>();

    setWindow({
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
    });

    saveOnboardingDismissal();

    const dismissedAfterRemount = readOnboardingDismissal();

    expect(dismissedAfterRemount).toBe(true);
    expect(
      shouldRenderOnboardingCompletedState({
        onboardingCompleted: true,
        dismissed: dismissedAfterRemount,
      })
    ).toBe(false);
  });

  it("handles localStorage failures safely", () => {
    setWindow({
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
        removeItem: () => {
          throw new Error("blocked");
        },
      },
    });

    expect(readOnboardingDismissal()).toBe(false);
    expect(() => saveOnboardingDismissal()).not.toThrow();
    expect(() => clearOnboardingDismissal()).not.toThrow();

    let hidden = false;

    expect(() =>
      dismissOnboardingCompletedState(() => {
        hidden = true;
      })
    ).not.toThrow();
    expect(hidden).toBe(true);
  });
});

describe("onboarding completed-state visibility", () => {
  it("renders completed state only when onboarding is complete and not dismissed", () => {
    expect(
      shouldRenderOnboardingCompletedState({
        onboardingCompleted: true,
        dismissed: false,
      })
    ).toBe(true);
  });

  it("hides completed state when dismissed", () => {
    expect(
      shouldRenderOnboardingCompletedState({
        onboardingCompleted: true,
        dismissed: true,
      })
    ).toBe(false);
  });

  it("does not use dismissal to complete incomplete onboarding", () => {
    expect(
      shouldRenderOnboardingCompletedState({
        onboardingCompleted: false,
        dismissed: false,
      })
    ).toBe(false);
    expect(
      shouldRenderOnboardingCompletedState({
        onboardingCompleted: false,
        dismissed: true,
      })
    ).toBe(false);
  });
});
