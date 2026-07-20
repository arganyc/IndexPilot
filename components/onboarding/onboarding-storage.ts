export const ONBOARDING_DISMISSAL_STORAGE_KEY =
  "indexpilot:onboarding-complete-dismissed:v1";

function getOnboardingStorage(): Storage | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  return window.localStorage;
}

export function readOnboardingDismissal(): boolean {
  try {
    return getOnboardingStorage()?.getItem(ONBOARDING_DISMISSAL_STORAGE_KEY) ===
      "true";
  } catch {
    return false;
  }
}

export function saveOnboardingDismissal(): void {
  try {
    getOnboardingStorage()?.setItem(ONBOARDING_DISMISSAL_STORAGE_KEY, "true");
  } catch {
    return;
  }
}

export function clearOnboardingDismissal(): void {
  try {
    getOnboardingStorage()?.removeItem(ONBOARDING_DISMISSAL_STORAGE_KEY);
  } catch {
    return;
  }
}

export function dismissOnboardingCompletedState(onDismissed: () => void): void {
  saveOnboardingDismissal();
  onDismissed();
}
