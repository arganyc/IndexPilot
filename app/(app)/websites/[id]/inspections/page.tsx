import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, SearchCheck } from "lucide-react";

import { ActiveProjectIndicator } from "@/components/websites/active-project-indicator";
import { WebsiteNavigation } from "@/components/websites/website-navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCurrentOrganizationContext } from "@/lib/auth/organization";
import { prisma } from "@/lib/prisma";
import {
  getInspectionHistoryStatusQueryValue,
  getInspectionHistoryPageData,
  getInspectionHistorySummary,
  inspectionHistoryStatusFilterOptions,
  type InspectionHistoryItem,
  type InspectionHistoryPropertyOption,
  type InspectionHistorySummary,
} from "@/lib/url-inspections/history";
import { createPrismaInspectionHistoryRepository } from "@/lib/url-inspections/prisma-history-repository";
import {
  formatInspectionDate,
  formatInspectionLabel,
  getStatusBadge,
  getVerdictBadge,
  type ResultBadgeView,
} from "@/lib/url-inspections/result-page";

type InspectionHistoryPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    property?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

function PageState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="grid min-h-72 place-items-center rounded-lg border border-red-200 bg-red-50 p-8 text-center">
      <div className="grid max-w-md gap-2">
        <h2 className="text-lg font-semibold text-red-950">{title}</h2>
        <p className="text-sm text-red-800">{message}</p>
      </div>
    </div>
  );
}

function HistoryBadge({ badge }: { badge: ResultBadgeView }) {
  return (
    <Badge variant={badge.variant} className={badge.className}>
      {badge.label}
    </Badge>
  );
}

function inspectedTimestamp(inspection: InspectionHistoryItem) {
  const date = inspection.completedAt ?? inspection.createdAt;
  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }

  const formatted = formatInspectionDate(date);
  if (!formatted) {
    return null;
  }

  return {
    date,
    formatted,
  };
}

function coverageLabel(value: string | null) {
  return formatInspectionLabel(value) || "Not available";
}

function SummaryCard({
  label,
  value,
  primary,
}: {
  label: string;
  value: number;
  primary?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={
            primary
              ? "text-3xl font-semibold leading-tight text-slate-950"
              : "text-2xl font-semibold text-slate-950"
          }
        >
          {value.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}

function StatusBreakdown({ summary }: { summary: InspectionHistorySummary }) {
  return (
    <section
      aria-labelledby="inspection-status-breakdown-heading"
      className="grid gap-3"
    >
      <div className="grid gap-1">
        <h3
          id="inspection-status-breakdown-heading"
          className="text-base font-semibold text-slate-950"
        >
          Inspection status breakdown
        </h3>
        <p className="text-sm text-slate-500">
          Based on the 25 most recent inspections.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Loaded inspections"
          value={summary.loaded}
          primary
        />
        <SummaryCard label="Completed" value={summary.completed} />
        <SummaryCard label="Failed" value={summary.failed} />
        <SummaryCard label="In progress" value={summary.inProgress} />
      </div>
    </section>
  );
}

function EmptyState({
  websiteId,
  isArchived,
  hasActiveFilters,
}: {
  websiteId: string;
  isArchived: boolean;
  hasActiveFilters: boolean;
}) {
  if (hasActiveFilters) {
    return (
      <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center sm:p-8">
        <div className="grid max-w-md justify-items-center gap-4">
          <div className="grid gap-2">
            <h3 className="text-lg font-semibold text-slate-950">
              No inspections matched
            </h3>
            <p className="text-sm leading-6 text-slate-500">
              The current search or status filter returned no inspection results.
            </p>
          </div>
          <Button asChild className="mx-auto" variant="outline">
            <Link href={`/websites/${websiteId}/inspections`}>
              Clear filters
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center sm:p-8">
      <div className="grid max-w-md justify-items-center gap-4">
        <div className="grid gap-2">
          <h3 className="text-lg font-semibold text-slate-950">
            {isArchived ? "No inspections yet" : "No website insights yet"}
          </h3>
          <p className="text-sm leading-6 text-slate-500">
            {isArchived
              ? "This website is archived. Existing inspection history will appear here when available."
              : "Inspect a few URLs to begin building an overview of how Google currently sees your website."}
          </p>
        </div>
        {isArchived ? null : (
          <Button asChild className="mx-auto">
            <Link href={`/websites/${websiteId}/inspect`}>
              Inspect a URL
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function HiddenPropertyInput({
  selectedPropertyId,
}: {
  selectedPropertyId: string | null;
}) {
  return selectedPropertyId ? (
    <input type="hidden" name="property" value={selectedPropertyId} />
  ) : null;
}

function SearchForm({
  websiteId,
  search,
  statusValue,
  selectedPropertyId,
}: {
  websiteId: string;
  search: string;
  statusValue: string;
  selectedPropertyId: string | null;
}) {
  return (
    <form
      action={`/websites/${websiteId}/inspections`}
      className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto_auto]"
    >
      {statusValue === "all" ? null : (
        <input type="hidden" name="status" value={statusValue} />
      )}
      <HiddenPropertyInput selectedPropertyId={selectedPropertyId} />
      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">
          Search inspected URLs
        </span>
        <Input
          name="q"
          defaultValue={search}
          placeholder="Search inspected URLs"
          className="min-w-0"
        />
      </label>
      <div className="flex items-end">
        <Button type="submit" className="w-full sm:w-auto">
          Search
        </Button>
      </div>
      {search ? (
        <div className="flex items-end">
          <Button asChild type="button" variant="outline">
            <Link href={`/websites/${websiteId}/inspections`}>
              Clear search
            </Link>
          </Button>
        </div>
      ) : null}
    </form>
  );
}

function StatusFilterForm({
  websiteId,
  search,
  statusValue,
  selectedPropertyId,
}: {
  websiteId: string;
  search: string;
  statusValue: string;
  selectedPropertyId: string | null;
}) {
  return (
    <form
      action={`/websites/${websiteId}/inspections`}
      method="get"
      className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[minmax(12rem,1fr)_auto]"
    >
      {search ? <input type="hidden" name="q" value={search} /> : null}
      <HiddenPropertyInput selectedPropertyId={selectedPropertyId} />
      <label htmlFor="inspection-status-filter" className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">Status</span>
        <select
          id="inspection-status-filter"
          name="status"
          defaultValue={statusValue}
          className="h-10 min-w-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        >
          {inspectionHistoryStatusFilterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-end">
        <Button type="submit" variant="outline" className="w-full sm:w-auto">
          Apply status
        </Button>
      </div>
    </form>
  );
}

function PropertyFilterForm({
  websiteId,
  search,
  statusValue,
  propertyOptions,
  selectedPropertyId,
}: {
  websiteId: string;
  search: string;
  statusValue: string;
  propertyOptions: InspectionHistoryPropertyOption[];
  selectedPropertyId: string | null;
}) {
  return (
    <form
      action={`/websites/${websiteId}/inspections`}
      method="get"
      className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[minmax(12rem,1fr)_auto]"
    >
      {search ? <input type="hidden" name="q" value={search} /> : null}
      {statusValue === "all" ? null : (
        <input type="hidden" name="status" value={statusValue} />
      )}
      <label htmlFor="inspection-property-filter" className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">Property</span>
        <select
          id="inspection-property-filter"
          name="property"
          defaultValue={selectedPropertyId ?? "all"}
          className="h-10 min-w-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        >
          <option value="all">All properties</option>
          {propertyOptions.map((property) => (
            <option key={property.id} value={property.id}>
              {property.siteUrl}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-end">
        <Button type="submit" variant="outline" className="w-full sm:w-auto">
          Apply property
        </Button>
      </div>
    </form>
  );
}

function HistoryTable({
  inspections,
  websiteId,
}: {
  inspections: InspectionHistoryItem[];
  websiteId: string;
}) {
  return (
    <div className="max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-[880px] w-full border-collapse text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">URL</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Verdict</th>
            <th className="px-4 py-3 font-medium">Coverage</th>
            <th className="px-4 py-3 font-medium">Inspected</th>
            <th className="px-4 py-3 font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {inspections.map((inspection) => {
            const inspectedAt = inspectedTimestamp(inspection);

            return (
              <tr key={inspection.id} className="align-top hover:bg-muted/40">
                <td className="max-w-[360px] px-4 py-4">
                  <span
                    title={inspection.inspectedUrl}
                    className="block truncate text-sm font-semibold leading-6 text-foreground sm:text-base"
                  >
                    {inspection.inspectedUrl}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-4">
                  <HistoryBadge badge={getStatusBadge(inspection.status)} />
                </td>
                <td className="whitespace-nowrap px-4 py-4">
                  {inspection.verdict ? (
                    <HistoryBadge badge={getVerdictBadge(inspection.verdict)} />
                  ) : (
                    <span className="text-slate-500">-</span>
                  )}
                </td>
                <td className="max-w-[260px] px-4 py-4 text-muted-foreground">
                  <span className="block truncate">
                    {coverageLabel(inspection.coverageState)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-4">
                  {inspectedAt ? (
                    <time
                      dateTime={inspectedAt.date.toISOString()}
                      className="block text-xs leading-5 text-muted-foreground"
                    >
                      Inspected {inspectedAt.formatted}
                    </time>
                  ) : null}
                </td>
                <td className="px-4 py-4">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/websites/${websiteId}/inspections/${inspection.id}`}>
                      <Eye className="size-4" aria-hidden="true" />
                      View Result
                    </Link>
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function InspectionHistoryPage({
  params,
  searchParams,
}: InspectionHistoryPageProps) {
  const { id } = await params;
  const rawSearchParams = await searchParams;
  const repository = createPrismaInspectionHistoryRepository(prisma);
  let organizationId: string;

  try {
    ({ organizationId } = await getCurrentOrganizationContext());
  } catch {
    return (
      <PageState
        title="Sign in required"
        message="You need to be signed in to view URL inspection history."
      />
    );
  }

  let data;

  try {
    data = await getInspectionHistoryPageData({
      websiteId: id,
      organizationId,
      searchParams: rawSearchParams,
      repository,
    });
  } catch {
    return (
      <PageState
        title="Inspection history unavailable"
        message="The URL inspection history could not be loaded from the database."
      />
    );
  }

  if (!data.ok) {
    notFound();
  }

  const summary = getInspectionHistorySummary(data.inspections);
  const isArchived = data.website.status === "ARCHIVED";
  const statusValue = getInspectionHistoryStatusQueryValue(data.status);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <p className="break-all text-sm text-muted-foreground">
              {data.website.domain}
            </p>
            <ActiveProjectIndicator />
          </div>
          <h2 className="text-2xl font-semibold text-slate-950">
            URL Inspection History
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Inspection history shows previous Google URL inspection results so
            you can review how a URL&apos;s reported status has changed over
            time.
          </p>
          <p className="mt-1 text-sm text-slate-600">{data.website.name}</p>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-start">
          <WebsiteNavigation websiteId={data.website.id} active="inspections" />
          {isArchived ? null : (
            <Button asChild className="w-full sm:w-auto">
              <Link href={`/websites/${data.website.id}/inspect`}>
                <SearchCheck className="size-4" aria-hidden="true" />
                Inspect a URL
              </Link>
            </Button>
          )}
        </div>
      </div>

      {data.inspections.length ? (
        <StatusBreakdown summary={summary} />
      ) : null}

      <div className="grid gap-3">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)_minmax(18rem,22rem)]">
          <SearchForm
            websiteId={data.website.id}
            search={data.search}
            statusValue={statusValue}
            selectedPropertyId={data.selectedPropertyId}
          />
          <StatusFilterForm
            websiteId={data.website.id}
            search={data.search}
            statusValue={statusValue}
            selectedPropertyId={data.selectedPropertyId}
          />
          <PropertyFilterForm
            websiteId={data.website.id}
            search={data.search}
            statusValue={statusValue}
            propertyOptions={data.propertyOptions}
            selectedPropertyId={data.selectedPropertyId}
          />
        </div>
        {data.hasActiveFilters ? (
          <Link
            href={`/websites/${data.website.id}/inspections`}
            className="w-fit text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-950 hover:underline"
          >
            Clear all
          </Link>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Inspections</CardTitle>
        </CardHeader>
        <CardContent>
          {data.inspections.length ? (
            <HistoryTable
              inspections={data.inspections}
              websiteId={data.website.id}
            />
          ) : (
            <EmptyState
              websiteId={data.website.id}
              isArchived={isArchived}
              hasActiveFilters={data.hasActiveFilters}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
