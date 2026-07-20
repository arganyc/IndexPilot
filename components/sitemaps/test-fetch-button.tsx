"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  testFetchSitemap,
  type TestFetchActionResult,
} from "@/app/(app)/websites/[id]/sitemaps/actions";
import { Button } from "@/components/ui/button";

type TestFetchButtonProps = {
  websiteId: string;
  sitemapId: string;
};

export function TestFetchButton({
  websiteId,
  sitemapId,
}: TestFetchButtonProps) {
  const router = useRouter();
  const [result, setResult] = useState<TestFetchActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function onTestFetch() {
    startTransition(async () => {
      const nextResult = await testFetchSitemap({ websiteId, sitemapId });
      setResult(nextResult);

      if (nextResult.ok) {
        toast.success(nextResult.message);
      } else {
        toast.error(nextResult.message);
      }

      router.refresh();
    });
  }

  return (
    <div className="grid gap-3">
      <Button type="button" onClick={onTestFetch} disabled={isPending}>
        <RefreshCw className="size-4" aria-hidden="true" />
        {isPending ? "Testing..." : "Test Fetch"}
      </Button>

      {result ? (
        <div
          className={`grid gap-2 rounded-lg border p-3 text-sm ${
            result.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-950"
              : "border-red-200 bg-red-50 text-red-950"
          }`}
        >
          <p className="font-medium">
            {result.ok ? "Fetch succeeded" : "Fetch failed"}: {result.message}
          </p>
          <dl className="grid gap-2 sm:grid-cols-2">
            <ResultRow label="Status code" value={result.statusCode ?? "N/A"} />
            <ResultRow label="Final URL" value={result.finalUrl ?? "N/A"} />
            <ResultRow
              label="Content type"
              value={result.contentType ?? "N/A"}
            />
            <ResultRow
              label="Response size"
              value={
                typeof result.responseSize === "number"
                  ? `${result.responseSize.toLocaleString()} bytes`
                  : "N/A"
              }
            />
            <ResultRow
              label="Redirect count"
              value={result.redirectCount ?? "N/A"}
            />
            <ResultRow
              label="Fetch duration"
              value={
                typeof result.durationMs === "number"
                  ? `${result.durationMs} ms`
                  : "N/A"
              }
            />
          </dl>
        </div>
      ) : null}
    </div>
  );
}

function ResultRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide opacity-70">
        {label}
      </dt>
      <dd className="truncate">{value}</dd>
    </div>
  );
}
