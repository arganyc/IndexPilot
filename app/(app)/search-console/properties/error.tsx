"use client";

import { Button } from "@/components/ui/button";

export default function SearchConsolePropertiesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="grid min-h-72 place-items-center rounded-lg border border-red-200 bg-red-50 p-8 text-center">
      <div className="grid max-w-md gap-3">
        <h2 className="text-lg font-semibold text-red-950">
          Properties unavailable
        </h2>
        <p className="text-sm text-red-800">
          Search Console properties could not be loaded.
        </p>
        <Button type="button" onClick={reset} className="mx-auto">
          Try again
        </Button>
      </div>
    </div>
  );
}
