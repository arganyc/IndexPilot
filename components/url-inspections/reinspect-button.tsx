"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { RotateCw } from "lucide-react";

import type { ReinspectActionState } from "@/app/(app)/websites/[id]/inspections/[inspectionId]/actions";
import { Button } from "@/components/ui/button";
import { createDuplicateSubmitGuard } from "@/components/url-inspections/inspection-form";

type ReinspectButtonProps = {
  action: (state: ReinspectActionState) => Promise<ReinspectActionState>;
};

const initialState: ReinspectActionState = {
  error: "",
};

export function reinspectButtonLabel(pending: boolean) {
  return pending ? "Inspecting..." : "Reinspect URL";
}

export function isReinspectSubmitDisabled(pending: boolean) {
  return pending;
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={isReinspectSubmitDisabled(pending)}>
      <RotateCw className="size-4" aria-hidden="true" />
      {reinspectButtonLabel(pending)}
    </Button>
  );
}

export function ReinspectButton({ action }: ReinspectButtonProps) {
  const [state, formAction] = useActionState(action, initialState);
  const submitGuardRef = useRef(createDuplicateSubmitGuard());

  useEffect(() => {
    submitGuardRef.current.reset();
  }, [state]);

  return (
    <form
      action={formAction}
      className="grid gap-2"
      onSubmit={(event) => {
        if (!submitGuardRef.current.shouldSubmit()) {
          event.preventDefault();
        }
      }}
    >
      <SubmitButton />
      {state.error ? (
        <p className="max-w-sm text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
