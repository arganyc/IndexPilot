"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function SearchConsolePropertyDetailsError() {
  return (
    <div className="grid min-h-72 place-items-center rounded-lg border border-red-200 bg-red-50 p-8 text-center">
      <div className="grid max-w-md gap-2">
        <h2 className="text-lg font-semibold text-red-950">
          Property details unavailable
        </h2>
        <p className="text-sm text-red-800">
          The Search Console property could not be loaded.
        </p>
        <Button asChild className="mx-auto mt-2" variant="outline">
          <Link href="/search-console/properties">Back to properties</Link>
        </Button>
      </div>
    </div>
  );
}
