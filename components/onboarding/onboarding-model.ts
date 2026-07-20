export type OnboardingState = {
  googleConnected: boolean;
  propertySelected: boolean;
  firstInspectionCompleted: boolean;
  onboardingCompleted: boolean;
};

export type OnboardingChecklistItem = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
  actionLabel?: string;
  destination?: string;
};

export type OnboardingProgress = {
  completedSteps: number;
  totalSteps: number;
  percent: number;
};

export type OnboardingChecklistOptions = {
  connectGoogleDestination?: string;
  selectPropertyDestination?: string;
  inspectUrlDestination?: string;
};

const ONBOARDING_STEP_COUNT = 3;

export const emptyOnboardingState: OnboardingState = {
  googleConnected: false,
  propertySelected: false,
  firstInspectionCompleted: false,
  onboardingCompleted: false,
};

export function createOnboardingState(
  state: Partial<OnboardingState> = {}
): OnboardingState {
  return {
    ...emptyOnboardingState,
    ...state,
  };
}

export function calculateOnboardingProgress(
  state: OnboardingState
): OnboardingProgress {
  if (state.onboardingCompleted) {
    return {
      completedSteps: ONBOARDING_STEP_COUNT,
      totalSteps: ONBOARDING_STEP_COUNT,
      percent: 100,
    };
  }

  const completedSteps = [
    state.googleConnected,
    state.propertySelected,
    state.firstInspectionCompleted,
  ].filter(Boolean).length;

  return {
    completedSteps,
    totalSteps: ONBOARDING_STEP_COUNT,
    percent: Math.round((completedSteps / ONBOARDING_STEP_COUNT) * 100),
  };
}

export function createOnboardingChecklist(
  state: OnboardingState,
  options: OnboardingChecklistOptions = {}
): OnboardingChecklistItem[] {
  const items: OnboardingChecklistItem[] = [
    {
      id: "connect-google",
      title: "Connect Google Search Console",
      description:
        "Authorize a Google account so IndexPilot can sync verified Search Console properties.",
      completed: state.googleConnected || state.onboardingCompleted,
      current: false,
      actionLabel: "Connect Google",
      destination: options.connectGoogleDestination ?? "/settings/google",
    },
    {
      id: "select-property",
      title: "Choose a Search Console property",
      description:
        "Select the verified property that matches the website you want to inspect.",
      completed: state.propertySelected || state.onboardingCompleted,
      current: false,
      actionLabel: "View properties",
      destination:
        options.selectPropertyDestination ?? "/search-console/properties",
    },
    {
      id: "inspect-first-url",
      title: "Inspect your first URL",
      description:
        "Run one URL inspection and save the result to start building history.",
      completed: state.firstInspectionCompleted || state.onboardingCompleted,
      current: false,
      actionLabel: "Inspect a URL",
      destination: options.inspectUrlDestination,
    },
  ];

  const currentIndex = items.findIndex((item) => !item.completed);

  if (currentIndex >= 0) {
    items[currentIndex] = {
      ...items[currentIndex],
      current: true,
    };
  }

  return items;
}
