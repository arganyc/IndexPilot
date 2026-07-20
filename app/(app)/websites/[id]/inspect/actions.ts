"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  createPrismaSingleUrlInspectionGoogleClient,
  createPrismaSingleUrlInspectionRepository,
} from "@/lib/url-inspections/prisma-service-repository";
import {
  runSingleUrlInspection,
  sanitizeInspectionErrorMessage,
} from "@/lib/url-inspections/service";

export type InspectUrlFormValues = {
  inspectedUrl: string;
  searchConsolePropertyId: string;
};

export type InspectUrlFormState = {
  values: InspectUrlFormValues;
  fieldErrors: Partial<Record<keyof InspectUrlFormValues, string>>;
  formError: string;
};

export type InspectUrlFormActionContext = {
  websiteId: string;
  urlRecordId?: string;
};

const inspectUrlFormSchema = z.object({
  inspectedUrl: z
    .string()
    .trim()
    .min(1, "Enter a URL.")
    .refine((value) => isValidUrl(value), "Enter a valid URL.")
    .refine((value) => hasSupportedProtocol(value), "URL must use HTTP or HTTPS."),
  searchConsolePropertyId: z
    .string()
    .trim()
    .min(1, "Select a Search Console property."),
});

function getFormValue(formData: FormData, key: keyof InspectUrlFormValues) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getSubmittedValues(formData: FormData): InspectUrlFormValues {
  return {
    inspectedUrl: getFormValue(formData, "inspectedUrl"),
    searchConsolePropertyId: getFormValue(formData, "searchConsolePropertyId"),
  };
}

function toFieldErrors(
  error: z.ZodError<InspectUrlFormValues>
): InspectUrlFormState["fieldErrors"] {
  const fieldErrors = error.flatten().fieldErrors;

  return {
    inspectedUrl: fieldErrors.inspectedUrl?.[0],
    searchConsolePropertyId: fieldErrors.searchConsolePropertyId?.[0],
  };
}

function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function hasSupportedProtocol(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function formError(values: InspectUrlFormValues, message: string): InspectUrlFormState {
  return {
    values,
    fieldErrors: {},
    formError: sanitizeInspectionErrorMessage(message),
  };
}

function genericFailure(values: InspectUrlFormValues): InspectUrlFormState {
  return {
    values,
    fieldErrors: {},
    formError: "URL inspection could not be started. Try again shortly.",
  };
}

function safeLogInspectionFormError(error: unknown, websiteId: string) {
  const message = error instanceof Error ? error.message : "Unknown error";

  console.error("url_inspection_form_submission_failed", {
    websiteId,
    message: sanitizeInspectionErrorMessage(message),
  });
}

export async function submitSingleUrlInspectionForm(
  context: InspectUrlFormActionContext,
  _previousState: InspectUrlFormState,
  formData: FormData
): Promise<InspectUrlFormState> {
  const values = getSubmittedValues(formData);
  const parsed = inspectUrlFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      values,
      fieldErrors: toFieldErrors(parsed.error),
      formError: "",
    };
  }

  const repository = createPrismaSingleUrlInspectionRepository(prisma);
  const googleClient = createPrismaSingleUrlInspectionGoogleClient(prisma);
  let redirectTo = "";

  try {
    const result = await runSingleUrlInspection({
      input: {
        websiteId: context.websiteId,
        inspectedUrl: parsed.data.inspectedUrl,
        searchConsolePropertyId: parsed.data.searchConsolePropertyId,
        ...(context.urlRecordId ? { urlRecordId: context.urlRecordId } : {}),
      },
      repository,
      googleClient,
    });

    switch (result.outcome) {
      case "completed":
      case "failed":
      case "alreadyInProgress":
        redirectTo = `/websites/${context.websiteId}/inspections/${result.inspectionId}`;
        break;
      case "validationError":
        return formError(values, result.errorMessage);
      case "unauthorized":
        return formError(
          values,
          "You are not authorized to inspect URLs for this website."
        );
      case "notFound":
        return formError(
          values,
          "The website or Search Console property could not be found."
        );
    }
  } catch (error) {
    safeLogInspectionFormError(error, context.websiteId);
    return genericFailure(values);
  }

  redirect(redirectTo);
}
