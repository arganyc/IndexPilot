import type { SitemapImportResult } from "@/lib/sitemaps/importer";

export type ImportSummaryState = {
  title: string;
  tone: "success" | "warning" | "error";
  hasWarnings: boolean;
  hasErrors: boolean;
  limitLabel: "Reached" | "Not reached";
};

export function getImportSummaryState(
  result: Pick<
    SitemapImportResult,
    "success" | "warnings" | "errors" | "limitReached"
  >
): ImportSummaryState {
  const hasWarnings = result.warnings.length > 0 || result.limitReached;
  const hasErrors = result.errors.length > 0;

  if (!result.success) {
    return {
      title: "Import failed",
      tone: "error",
      hasWarnings,
      hasErrors,
      limitLabel: result.limitReached ? "Reached" : "Not reached",
    };
  }

  return {
    title: "Import successful",
    tone: hasWarnings ? "warning" : "success",
    hasWarnings,
    hasErrors,
    limitLabel: result.limitReached ? "Reached" : "Not reached",
  };
}
