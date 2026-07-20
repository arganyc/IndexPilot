import Link from "next/link";

import { EmptyState } from "@/components/layout/empty-state";
import {
  calculateOnboardingProgress,
  createOnboardingChecklist,
  createOnboardingState,
  OnboardingChecklist,
  OnboardingCompletedGate,
} from "@/components/onboarding";
import { Button } from "@/components/ui/button";
import { getCurrentOrganizationContext } from "@/lib/auth/organization";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getDashboardOnboardingState() {
  const { organizationId } = await getCurrentOrganizationContext();
  const [
    googleAccountCount,
    usablePropertyCount,
    completedInspection,
    firstActiveWebsite,
  ] = await Promise.all([
    prisma.googleAccount.count({
      where: { organizationId },
    }),
    prisma.searchConsoleProperty.count({
      where: {
        organizationId,
        verified: true,
        syncStatus: "ACTIVE",
      },
    }),
    prisma.urlInspection.findFirst({
      where: {
        organizationId,
        status: "COMPLETED",
      },
      orderBy: { completedAt: "desc" },
      select: { websiteId: true },
    }),
    prisma.website.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }),
  ]);

  const state = createOnboardingState({
    googleConnected: googleAccountCount > 0,
    propertySelected: usablePropertyCount > 0,
    firstInspectionCompleted: Boolean(completedInspection),
  });
  const onboardingWebsiteId = completedInspection?.websiteId ?? firstActiveWebsite?.id;

  return {
    state: createOnboardingState({
      ...state,
      onboardingCompleted:
        state.googleConnected &&
        state.propertySelected &&
        state.firstInspectionCompleted,
    }),
    historyDestination: onboardingWebsiteId
      ? `/websites/${onboardingWebsiteId}/inspections`
      : undefined,
    inspectDestination: onboardingWebsiteId
      ? `/websites/${onboardingWebsiteId}/inspect`
      : undefined,
  };
}

export default async function DashboardPage() {
  const { state, historyDestination, inspectDestination } =
    await getDashboardOnboardingState();
  const checklist = createOnboardingChecklist(state, {
    connectGoogleDestination: "/api/google/oauth/start",
    selectPropertyDestination: "/search-console/properties",
    inspectUrlDestination: inspectDestination,
  });
  const progress = calculateOnboardingProgress(state);

  return (
    <div className="grid gap-6">
      {state.onboardingCompleted && historyDestination && inspectDestination ? (
        <OnboardingCompletedGate
          onboardingCompleted={state.onboardingCompleted}
          eyebrow="Setup complete"
          heading="Your IndexPilot workspace is ready."
          description="You have connected Google Search Console, selected a property, and completed your first URL inspection."
          primaryAction={{
            label: "View inspection history",
            destination: historyDestination,
          }}
          secondaryAction={{
            label: "Inspect another URL",
            destination: inspectDestination,
          }}
        />
      ) : (
        <OnboardingChecklist
          heading="Welcome to IndexPilot"
          description="Complete these steps to inspect your first URL."
          items={checklist}
          progress={progress}
        />
      )}

      <EmptyState
        title="Welcome to IndexPilot"
        description="Inspect your first URL to begin building insights about how Google sees your website."
        primaryAction={
          <Button asChild>
            <Link href="/websites/new">Add Website</Link>
          </Button>
        }
        secondaryAction={
          <Button asChild variant="outline">
            <Link href="/settings/google">Connect Google</Link>
          </Button>
        }
      />
    </div>
  );
}
