"use client";

import { useState, useSyncExternalStore } from "react";

import {
  OnboardingCompletedState,
  type OnboardingCompletedStateProps,
} from "@/components/onboarding/onboarding-checklist";
import {
  dismissOnboardingCompletedState,
  readOnboardingDismissal,
} from "@/components/onboarding/onboarding-storage";
import { shouldRenderOnboardingCompletedState } from "@/components/onboarding/onboarding-visibility";

type OnboardingCompletedGateProps = OnboardingCompletedStateProps & {
  onboardingCompleted: boolean;
};

function subscribeToOnboardingDismissal() {
  return () => undefined;
}

function getOnboardingDismissalServerSnapshot() {
  return false;
}

export function OnboardingCompletedGate({
  onboardingCompleted,
  ...props
}: OnboardingCompletedGateProps) {
  const storedDismissed = useSyncExternalStore(
    subscribeToOnboardingDismissal,
    readOnboardingDismissal,
    getOnboardingDismissalServerSnapshot
  );
  const [dismissedForSession, setDismissedForSession] = useState(false);
  const dismissed = storedDismissed || dismissedForSession;

  if (
    !shouldRenderOnboardingCompletedState({
      onboardingCompleted,
      dismissed,
    })
  ) {
    return null;
  }

  return (
    <OnboardingCompletedState
      {...props}
      onDismiss={() => {
        dismissOnboardingCompletedState(() => setDismissedForSession(true));
      }}
    />
  );
}
