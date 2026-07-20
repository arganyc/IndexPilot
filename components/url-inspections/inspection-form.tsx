"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { SearchCheck } from "lucide-react";

import type { InspectUrlFormState } from "@/app/(app)/websites/[id]/inspect/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InspectionFormProperty } from "@/lib/url-inspections/form-page";

export type InspectionFormPropertyOption = Pick<
  InspectionFormProperty,
  "id" | "siteUrl" | "propertyType" | "googleAccount"
>;

type InspectionFormProps = {
  action: (
    state: InspectUrlFormState,
    formData: FormData
  ) => Promise<InspectUrlFormState>;
  defaultInspectedUrl: string;
  defaultPropertyId: string;
  disabled: boolean;
  placeholder: string;
  properties: InspectionFormPropertyOption[];
};

export function propertyLabel(property: InspectionFormPropertyOption) {
  const type =
    property.propertyType === "DOMAIN" ? "Domain property" : "URL-prefix property";

  return `${property.siteUrl} (${type}, ${property.googleAccount.email})`;
}

export function inspectButtonLabel(pending: boolean) {
  return pending ? "Inspecting..." : "Inspect URL";
}

export function isInspectSubmitDisabled({
  disabled,
  pending,
}: {
  disabled: boolean;
  pending: boolean;
}) {
  return disabled || pending;
}

export function createDuplicateSubmitGuard() {
  let submitted = false;

  return {
    shouldSubmit() {
      if (submitted) {
        return false;
      }

      submitted = true;
      return true;
    },
    reset() {
      submitted = false;
    },
  };
}

const emptyInspectUrlFormState: InspectUrlFormState = {
  values: {
    inspectedUrl: "",
    searchConsolePropertyId: "",
  },
  fieldErrors: {},
  formError: "",
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = isInspectSubmitDisabled({ disabled, pending });

  return (
    <Button
      className="justify-self-start"
      type="submit"
      disabled={isDisabled}
      aria-disabled={isDisabled}
    >
      <SearchCheck className="size-4" aria-hidden="true" />
      {inspectButtonLabel(pending)}
    </Button>
  );
}

export function InspectionForm({
  action,
  defaultInspectedUrl,
  defaultPropertyId,
  disabled,
  placeholder,
  properties,
}: InspectionFormProps) {
  const initialState: InspectUrlFormState = {
    ...emptyInspectUrlFormState,
    values: {
      inspectedUrl: defaultInspectedUrl,
      searchConsolePropertyId: defaultPropertyId,
    },
  };
  const [state, formAction] = useActionState(action, initialState);
  const submitGuardRef = useRef(createDuplicateSubmitGuard());

  useEffect(() => {
    submitGuardRef.current.reset();
  }, [state]);

  return (
    <form
      action={formAction}
      className="grid gap-5"
      onSubmit={(event) => {
        if (!submitGuardRef.current.shouldSubmit()) {
          event.preventDefault();
        }
      }}
    >
      {state.formError ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          {state.formError}
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="inspectedUrl">URL</Label>
        <Input
          id="inspectedUrl"
          name="inspectedUrl"
          type="url"
          defaultValue={state.values.inspectedUrl}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={Boolean(state.fieldErrors.inspectedUrl)}
          aria-describedby={
            state.fieldErrors.inspectedUrl
              ? "inspectedUrl-help inspectedUrl-error"
              : "inspectedUrl-help"
          }
        />
        <p
          id="inspectedUrl-help"
          className="max-w-3xl text-sm leading-6 text-muted-foreground"
        >
          Use an HTTP or HTTPS URL from this website, such as {placeholder}.
          Inspect a URL when you want to check Google&apos;s latest reported
          indexing status for that page.
        </p>
        {state.fieldErrors.inspectedUrl ? (
          <p id="inspectedUrl-error" className="text-sm text-red-600">
            {state.fieldErrors.inspectedUrl}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="searchConsolePropertyId">Search Console property</Label>
        <select
          id="searchConsolePropertyId"
          name="searchConsolePropertyId"
          defaultValue={state.values.searchConsolePropertyId}
          disabled={disabled}
          aria-invalid={Boolean(state.fieldErrors.searchConsolePropertyId)}
          aria-describedby={
            state.fieldErrors.searchConsolePropertyId
              ? "searchConsolePropertyId-help searchConsolePropertyId-error"
              : "searchConsolePropertyId-help"
          }
          className="h-9 rounded-lg border border-input bg-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {properties.length === 1 ? null : (
            <option value="">Choose a property</option>
          )}
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {propertyLabel(property)}
            </option>
          ))}
        </select>
        <p
          id="searchConsolePropertyId-help"
          className="max-w-3xl text-sm leading-6 text-muted-foreground"
        >
          Domain properties can cover matching hostnames. URL-prefix properties
          only cover URLs under that prefix.
        </p>
        {state.fieldErrors.searchConsolePropertyId ? (
          <p id="searchConsolePropertyId-error" className="text-sm text-red-600">
            {state.fieldErrors.searchConsolePropertyId}
          </p>
        ) : null}
      </div>

      <SubmitButton disabled={disabled} />
    </form>
  );
}
