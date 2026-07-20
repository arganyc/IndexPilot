import { Badge } from "@/components/ui/badge";
import { getImportSummaryState } from "@/lib/sitemaps/import-summary";
import type { ReactNode } from "react";

export type ImportSummaryViewModel = {
  success: boolean;
  processedSitemaps: number;
  importedSitemaps: number;
  failedSitemaps: number;
  addedUrls: number;
  updatedUrls: number;
  skippedUrls: number;
  warnings: string[];
  errors: string[];
  limitReached: boolean;
  limitsReached: string[];
  durationMs: number;
};

export function ImportSummary({ result }: { result: ImportSummaryViewModel }) {
  const state = getImportSummaryState(result);

  return (
    <div
      className={`grid gap-3 rounded-lg border p-3 text-sm ${
        state.tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-950"
          : state.tone === "warning"
            ? "border-amber-200 bg-amber-50 text-amber-950"
            : "border-red-200 bg-red-50 text-red-950"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">{state.title}</p>
        <Badge variant={state.tone === "error" ? "destructive" : "outline"}>
          {state.tone === "success" ? "Success" : "Warning"}
        </Badge>
      </div>

      <dl className="grid gap-2 sm:grid-cols-2">
        <ResultRow label="Sitemaps processed" value={result.processedSitemaps} />
        <ResultRow label="Sitemaps imported" value={result.importedSitemaps} />
        <ResultRow label="Sitemaps failed" value={result.failedSitemaps} />
        <ResultRow label="New URLs" value={result.addedUrls} />
        <ResultRow label="Updated URLs" value={result.updatedUrls} />
        <ResultRow label="Skipped URLs" value={result.skippedUrls} />
        <ResultRow label="Duration" value={`${result.durationMs} ms`} />
        <ResultRow label="Safety limits" value={state.limitLabel} />
      </dl>

      {result.limitsReached.length ? (
        <IssueList title="Limits reached" items={result.limitsReached} />
      ) : null}
      {result.warnings.length ? (
        <IssueList title="Warnings" items={result.warnings} />
      ) : null}
      {result.errors.length ? <IssueList title="Errors" items={result.errors} /> : null}
    </div>
  );
}

function ResultRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
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

function IssueList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="grid gap-1">
      <p className="font-medium">{title}</p>
      <ul className="list-inside list-disc">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
