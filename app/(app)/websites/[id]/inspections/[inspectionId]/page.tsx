import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import {
  createPrismaFirstCompletedInspectionRepository,
  isFirstCompletedInspection,
} from "@/lib/url-inspections/first-completed-inspection";
import {
  formatInspectionDate,
  formatInspectionLabel,
} from "@/lib/url-inspections/result-page";
import { createPrismaUrlInspectionDetailsRepository } from "@/lib/url-inspections/prisma-details-page-repository";
import {
  type UrlInspectionDetailsRecord,
  verifyUrlInspectionDetailsPageAccess,
} from "@/lib/url-inspections/details-page";
import { submitReinspectSavedUrlInspection } from "./actions";

type InspectionDetailsPageProps = {
  params: Promise<{ id: string; inspectionId: string }>;
};

export const dynamic = "force-dynamic";

const UNAVAILABLE_INSPECTION_VALUE = "Not available";

function inspectionValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  const normalized = trimmed?.toLowerCase();

  if (
    !trimmed ||
    normalized === "null" ||
    normalized === "undefined" ||
    normalized === "invalid date"
  ) {
    return UNAVAILABLE_INSPECTION_VALUE;
  }

  return trimmed;
}

function inspectionDateValue(value: Date | null | undefined) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return UNAVAILABLE_INSPECTION_VALUE;
  }

  try {
    return formatInspectionDate(value) || UNAVAILABLE_INSPECTION_VALUE;
  } catch {
    return UNAVAILABLE_INSPECTION_VALUE;
  }
}

function getIndexingStatusSummary(coverageState: string | null): {
  label: string;
  detail: string;
  explanation: string;
  showNextChecks: boolean;
  variant: "default" | "secondary" | "outline";
  className?: string;
} {
  const coverage = coverageState?.trim();

  if (!coverage) {
    return {
      label: "Indexing status unknown",
      detail: "Google did not return a coverage state for this inspection.",
      explanation:
        "Google did not provide a confirmed indexing status for this inspection. Review the available details or inspect the URL again later.",
      showNextChecks: false,
      variant: "outline",
    };
  }

  const normalizedCoverage = coverage.toLowerCase();
  const readableCoverage = formatInspectionLabel(coverage) || coverage;

  if (normalizedCoverage.includes("not indexed")) {
    return {
      label: "URL not indexed",
      detail: `Coverage state: ${readableCoverage}`,
      explanation:
        "Google currently reports that this URL is not indexed. Review the inspection details for possible reasons and next steps.",
      showNextChecks: true,
      variant: "secondary",
      className: "border-amber-200 bg-amber-50 text-amber-900",
    };
  }

  if (normalizedCoverage.includes("indexed")) {
    return {
      label: "URL indexed",
      detail: `Coverage state: ${readableCoverage}`,
      explanation:
        "Google currently reports that this URL is indexed. Its visibility in search results can still vary.",
      showNextChecks: false,
      variant: "default",
    };
  }

  return {
    label: "Indexing status unknown",
    detail: `Coverage state: ${readableCoverage}`,
    explanation:
      "Google did not provide a confirmed indexing status for this inspection. Review the available details or inspect the URL again later.",
    showNextChecks: false,
    variant: "outline",
  };
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid gap-1 rounded-lg border border-slate-100 bg-slate-50 p-3">
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className="break-words text-sm text-slate-700">
        {inspectionValue(value)}
      </dd>
    </div>
  );
}

function DateDetailRow({ label, value }: { label: string; value: Date | null }) {
  return (
    <div className="grid gap-1 rounded-lg border border-slate-100 bg-slate-50 p-3">
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className="break-words text-sm text-slate-700">
        {inspectionDateValue(value)}
      </dd>
    </div>
  );
}

function SummaryDateRow({ value }: { value: Date | null }) {
  return (
    <dl className="grid gap-1">
      <dt className="text-xs font-medium uppercase text-muted-foreground">
        Last inspected
      </dt>
      <dd className="break-words text-sm text-foreground">
        {inspectionDateValue(value)}
      </dd>
    </dl>
  );
}

function VerdictDetailRow({ value }: { value: string | null }) {
  const verdict = value?.trim();

  return (
    <div className="grid gap-1 rounded-lg border border-slate-100 bg-slate-50 p-3">
      <dt className="text-xs font-medium uppercase text-slate-500">
        Indexing verdict
      </dt>
      <dd className="break-words text-sm text-slate-700">
        {verdict ? (
          <Badge
            variant="outline"
            className="h-auto whitespace-normal break-words py-1 text-left"
          >
            {value}
          </Badge>
        ) : (
          "Not available"
        )}
      </dd>
    </div>
  );
}

function CompletedInspectionSummary({
  inspection,
  websiteId,
  isFirstCompletedInspection,
}: {
  inspection: UrlInspectionDetailsRecord;
  websiteId: string;
  isFirstCompletedInspection: boolean;
}) {
  const indexingStatus = getIndexingStatusSummary(inspection.coverageState);
  const isIndexedStatus = indexingStatus.label === "URL indexed";
  const isNotIndexedStatus = indexingStatus.label === "URL not indexed";
  const isUnknownStatus = indexingStatus.label === "Indexing status unknown";
  const copy = isFirstCompletedInspection
    ? {
        eyebrow: "First inspection complete",
        heading: "You completed your first Google URL inspection.",
        supportingText:
          "IndexPilot is now ready to help you monitor and understand this website's indexing status.",
      }
    : {
        eyebrow: "Inspection complete",
        heading: "Google inspection completed successfully.",
        supportingText: "Review the result below and decide what to do next.",
      };

  return (
    <Card aria-labelledby="inspection-complete-heading">
      <CardContent className="grid gap-5 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CheckCircle2 className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">
                {copy.eyebrow}
              </p>
              <h3
                id="inspection-complete-heading"
                className="mt-1 text-xl font-semibold text-foreground"
              >
                {copy.heading}
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {copy.supportingText}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild className="w-full sm:w-auto">
              <Link href={`/websites/${websiteId}/inspect`}>
                Inspect another URL
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href={`/websites/${websiteId}/inspections`}>
                View inspection history
              </Link>
            </Button>
          </div>
        </div>
        <div className="grid gap-3 rounded-lg border border-border bg-muted/40 p-4 sm:grid-cols-2">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Inspection status
            </p>
            <Badge className="mt-2">Completed</Badge>
          </div>
          <div className="min-w-0" aria-describedby="indexing-status-explanation">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              URL indexing status
            </p>
            {isIndexedStatus ? (
              <div className="mt-2 grid gap-3">
                <h4 className="text-lg font-semibold text-foreground">
                  Indexed
                </h4>
                <p
                  id="indexing-status-explanation"
                  className="max-w-3xl break-words text-sm leading-6 text-muted-foreground"
                >
                  Google currently reports that this page is indexed.
                </p>
                <SummaryDateRow value={inspection.completedAt} />
              </div>
            ) : isNotIndexedStatus ? (
              <div className="mt-2 grid gap-3">
                <h4 className="text-lg font-semibold text-foreground">
                  Not Indexed
                </h4>
                <p
                  id="indexing-status-explanation"
                  className="max-w-3xl break-words text-sm leading-6 text-muted-foreground"
                >
                  Google currently reports that this page is not indexed.
                </p>
                <section
                  aria-labelledby="not-indexed-next-steps-heading"
                  className="grid gap-2"
                >
                  <h5
                    id="not-indexed-next-steps-heading"
                    className="text-sm font-semibold text-foreground"
                  >
                    What to check next
                  </h5>
                  <ul className="max-w-3xl list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
                    <li>Review Google&apos;s inspection details.</li>
                    <li>Make any necessary improvements to the page.</li>
                    <li>Inspect this URL again after meaningful changes.</li>
                  </ul>
                </section>
                <SummaryDateRow value={inspection.completedAt} />
              </div>
            ) : isUnknownStatus ? (
              <div className="mt-2 grid gap-3">
                <h4 className="text-lg font-semibold text-foreground">
                  Unknown
                </h4>
                <p
                  id="indexing-status-explanation"
                  className="max-w-3xl break-words text-sm leading-6 text-muted-foreground"
                >
                  Google did not return a clear indexing status for this page.
                </p>
                <p className="max-w-3xl break-words text-sm leading-6 text-muted-foreground">
                  This result does not confirm whether the page is indexed.
                </p>
                <SummaryDateRow value={inspection.completedAt} />
              </div>
            ) : (
              <>
                <Badge
                  variant={indexingStatus.variant}
                  className={`mt-2 h-auto whitespace-normal break-words py-1 text-left ${indexingStatus.className ?? ""}`}
                >
                  {indexingStatus.label}
                </Badge>
                <p className="mt-2 break-words text-sm text-muted-foreground">
                  {indexingStatus.detail}
                </p>
                <p
                  id="indexing-status-explanation"
                  className="mt-2 max-w-3xl break-words text-sm leading-6 text-muted-foreground"
                >
                  {indexingStatus.explanation}
                </p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InspectionUnavailableSummary() {
  return (
    <Card aria-labelledby="inspection-unavailable-heading">
      <CardContent className="grid gap-2 p-6">
        <h3
          id="inspection-unavailable-heading"
          className="text-lg font-semibold text-foreground"
        >
          Inspection unavailable
        </h3>
        <p className="max-w-3xl break-words text-sm leading-6 text-muted-foreground">
          Google could not complete this inspection.
        </p>
        <p className="max-w-3xl break-words text-sm leading-6 text-muted-foreground">
          Try again later. If the issue continues, confirm that your Google
          connection and Search Console property are still available.
        </p>
      </CardContent>
    </Card>
  );
}

export default async function InspectionDetailsPage({
  params,
}: InspectionDetailsPageProps) {
  const { id, inspectionId } = await params;
  const repository = createPrismaUrlInspectionDetailsRepository(prisma);
  const access = await verifyUrlInspectionDetailsPageAccess({
    websiteId: id,
    inspectionId,
    repository,
  });

  if (!access.ok) {
    notFound();
  }

  const inspection = access.inspection;
  const firstCompletedInspection = await isFirstCompletedInspection({
    inspection: {
      id: inspectionId,
      organizationId: access.organizationId,
      status: inspection.status,
      completedAt: inspection.completedAt,
    },
    repository: createPrismaFirstCompletedInspectionRepository(prisma),
  });

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">URL Inspection</p>
          <h2 className="text-2xl font-semibold text-slate-950">
            Inspection Details
          </h2>
          <p className="mt-2 break-all text-sm text-slate-600">
            {inspection.inspectedUrl}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <Badge variant="outline">{inspection.status}</Badge>
            <span>Created {inspectionDateValue(inspection.createdAt)}</span>
          </div>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          <form
            className="w-full sm:w-auto"
            action={async () => {
              "use server";

              await submitReinspectSavedUrlInspection({
                websiteId: id,
                inspectionId,
              });
            }}
          >
            <Button type="submit" className="w-full sm:w-auto">
              Reinspect URL
            </Button>
          </form>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={`/websites/${id}/inspections`}>
              Back to inspection history
            </Link>
          </Button>
        </div>
      </div>
      {inspection.status === "COMPLETED" ? (
        <CompletedInspectionSummary
          inspection={inspection}
          websiteId={id}
          isFirstCompletedInspection={firstCompletedInspection}
        />
      ) : null}
      {inspection.status === "FAILED" ? <InspectionUnavailableSummary /> : null}
      <Card>
        <CardHeader>
          <CardTitle>
            <h3>Indexing Signals</h3>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 md:grid-cols-2">
            <DetailRow label="Coverage status" value={inspection.coverageState} />
            <VerdictDetailRow value={inspection.verdict} />
            <DetailRow
              label="Indexing state"
              value={inspection.indexingState}
            />
            <DetailRow
              label="Robots.txt status"
              value={inspection.robotsTxtState}
            />
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h3>Crawl Information</h3>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 md:grid-cols-2">
            <DetailRow
              label="Page fetch status"
              value={inspection.pageFetchState}
            />
            <DetailRow label="Crawled as" value={inspection.crawledAs} />
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h3>Canonical Information</h3>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 md:grid-cols-2">
            <DetailRow
              label="User-declared canonical URL"
              value={inspection.userCanonical}
            />
            <DetailRow
              label="Google-selected canonical URL"
              value={inspection.googleCanonical}
            />
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h3>Last Crawl</h3>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3">
            <DateDetailRow
              label="Last crawled"
              value={inspection.lastCrawlTime}
            />
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h3>Inspection Timestamps</h3>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 md:grid-cols-3">
            <DateDetailRow label="Created" value={inspection.createdAt} />
            <DateDetailRow label="Updated" value={inspection.updatedAt} />
            <DateDetailRow label="Completed" value={inspection.completedAt} />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
