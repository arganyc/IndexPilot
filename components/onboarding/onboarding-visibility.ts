export function shouldRenderOnboardingCompletedState({
  onboardingCompleted,
  dismissed,
}: {
  onboardingCompleted: boolean;
  dismissed: boolean;
}) {
  return onboardingCompleted && !dismissed;
}
