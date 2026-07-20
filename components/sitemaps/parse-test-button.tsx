"use client";

import { useState, useTransition } from "react";
import { FileCode2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  parseTestSitemap,
  type ParseTestActionResult,
} from "@/app/(app)/websites/[id]/sitemaps/actions";
import { Button } from "@/components/ui/button";

type ParseTestButtonProps = {
  websiteId: string;
  sitemapId: string;
};

export function ParseTestButton({
  websiteId,
  sitemapId,
}: ParseTestButtonProps) {
  const router = useRouter();
  const [result, setResult] = useState<ParseTestActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function onParseTest() {
    startTransition(async () => {
      const nextResult = await parseTestSitemap({ websiteId, sitemapId });
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
      <Button
        type="button"
        variant="outline"
        onClick={onParseTest}
        disabled={isPending}
      >
        <FileCode2 className="size-4" aria-hidden="true" />
        {isPending ? "Parsing..." : "Parse Test"}
      </Button>

      {result ? (
        <div
          className={`grid gap-3 rounded-lg border p-3 text-sm ${
            result.ok
              ? "border-sky-200 bg-sky-50 text-sky-950"
              : "border-red-200 bg-red-50 text-red-950"
          }`}
        >
          <p className="font-medium">
            {result.ok ? "Parse succeeded" : "Parse failed"}: {result.message}
          </p>
          <dl className="grid gap-2 sm:grid-cols-2">
            <ResultRow label="Detected type" value={result.detectedType ?? "N/A"} />
            <ResultRow label="Item count" value={result.itemCount ?? "N/A"} />
            <ResultRow
              label="Compression"
              value={result.compressed ? "Compressed" : "Uncompressed"}
            />
            <ResultRow
              label="Response size"
              value={formatBytes(result.responseSize)}
            />
            <ResultRow label="Parsed size" value={formatBytes(result.parsedSize)} />
            <ResultRow label="Final URL" value={result.finalUrl ?? "N/A"} />
          </dl>

          {result.entries?.length ? (
            <div className="grid gap-2">
              <p className="font-medium">First 10 entries</p>
              <ol className="grid gap-1">
                {result.entries.map((entry) => (
                  <li
                    key={`${entry.loc}-${entry.lastmod ?? ""}`}
                    className="rounded-md bg-white/70 p-2"
                  >
                    <p className="truncate font-medium">{entry.loc}</p>
                    <p className="text-xs opacity-75">
                      {[
                        entry.lastmod ? `lastmod: ${entry.lastmod}` : null,
                        entry.changefreq
                          ? `changefreq: ${entry.changefreq}`
                          : null,
                        entry.priority !== undefined
                          ? `priority: ${entry.priority}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" | ") || "No optional metadata"}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          <IssueList title="Warnings" issues={result.warnings} />
          <IssueList title="Errors" issues={result.errors} />
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

function IssueList({
  title,
  issues,
}: {
  title: string;
  issues?: string[];
}) {
  if (!issues?.length) {
    return null;
  }

  return (
    <div className="grid gap-1">
      <p className="font-medium">{title}</p>
      <ul className="list-inside list-disc">
        {issues.map((issue) => (
          <li key={issue}>{issue}</li>
        ))}
      </ul>
    </div>
  );
}

function formatBytes(value: number | undefined) {
  if (typeof value !== "number") {
    return "N/A";
  }

  return `${value.toLocaleString()} bytes`;
}
