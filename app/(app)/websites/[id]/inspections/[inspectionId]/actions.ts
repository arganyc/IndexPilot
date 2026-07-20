"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getCurrentOrganizationContext } from "@/lib/auth/organization";
import { createPrismaUrlInspectionDetailsRepository } from "@/lib/url-inspections/prisma-details-page-repository";
import {
  createPrismaSingleUrlInspectionGoogleClient,
  createPrismaSingleUrlInspectionRepository,
} from "@/lib/url-inspections/prisma-service-repository";
import { verifyUrlInspectionDetailsPageAccess } from "@/lib/url-inspections/details-page";
import {
  runSingleUrlInspection,
  type SingleUrlInspectionResult,
} from "@/lib/url-inspections/service";

export type ReinspectActionInput = {
  websiteId: string;
  inspectionId: string;
};

export type ReinspectActionState = {
  error: string;
};

export type ReinspectActionResult =
  | {
      ok: true;
      inspectedUrl: string;
      searchConsolePropertyId: string;
      result: SingleUrlInspectionResult;
    }
  | {
      ok: false;
      reason: "NOT_FOUND" | "UNAUTHORIZED";
    };

export async function reinspectSavedUrlInspection(
  input: ReinspectActionInput
): Promise<ReinspectActionResult> {
  let organizationContext: Awaited<ReturnType<typeof getCurrentOrganizationContext>>;

  try {
    organizationContext = await getCurrentOrganizationContext();
  } catch {
    return {
      ok: false,
      reason: "UNAUTHORIZED",
    };
  }

  const repository = createPrismaUrlInspectionDetailsRepository(prisma);
  const access = await verifyUrlInspectionDetailsPageAccess({
    websiteId: input.websiteId,
    inspectionId: input.inspectionId,
    repository,
    getOrganizationContext: async () => organizationContext,
  });

  if (!access.ok) {
    return {
      ok: false,
      reason: access.reason,
    };
  }

  const trustedInspection = await prisma.urlInspection.findFirst({
    where: {
      id: input.inspectionId,
      websiteId: input.websiteId,
      organizationId: organizationContext.organizationId,
    },
    select: {
      inspectedUrl: true,
      searchConsolePropertyId: true,
    },
  });

  if (!trustedInspection) {
    return {
      ok: false,
      reason: "NOT_FOUND",
    };
  }

  const result = await runSingleUrlInspection({
    input: {
      websiteId: input.websiteId,
      inspectedUrl: trustedInspection.inspectedUrl,
      searchConsolePropertyId: trustedInspection.searchConsolePropertyId,
    },
    repository: createPrismaSingleUrlInspectionRepository(prisma),
    googleClient: createPrismaSingleUrlInspectionGoogleClient(prisma),
    getOrganizationContext: async () => organizationContext,
  });

  return {
    ok: true,
    inspectedUrl: trustedInspection.inspectedUrl,
    searchConsolePropertyId: trustedInspection.searchConsolePropertyId,
    result,
  };
}

export async function submitReinspectSavedUrlInspection(
  input: ReinspectActionInput
) {
  const actionResult = await reinspectSavedUrlInspection(input);

  if (!actionResult.ok) {
    return;
  }

  const nextInspectionId = getNavigableInspectionId(actionResult.result);

  if (!nextInspectionId) {
    return;
  }

  redirect(`/websites/${input.websiteId}/inspections/${nextInspectionId}`);
}

function getNavigableInspectionId(result: SingleUrlInspectionResult) {
  switch (result.outcome) {
    case "completed":
    case "failed":
    case "alreadyInProgress":
      return result.inspectionId;
    case "validationError":
    case "unauthorized":
    case "notFound":
      return null;
  }
}
