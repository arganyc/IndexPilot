import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Eye, ListTree, Search } from "lucide-react";

import { CopyUrlButton } from "@/components/urls/copy-url-button";
import { ActiveProjectIndicator } from "@/components/websites/active-project-indicator";
import { WebsiteStatusBadge } from "@/components/websites/website-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import {
  getUrlInventoryPageData,
  type SourceSitemapOption,
  type UrlInventoryDirection,
  type UrlInventoryPageData,
  type UrlInventoryPageSize,
  type UrlInventoryQuery,
  type UrlInventorySort,
  urlInventoryPageSizeValues,
} from "@/lib/urls/inventory";
import { createPrismaUrlInventoryRepository } from "@/lib/urls/prisma-repository";

type UrlInventoryPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    q?: string | string[];
    sitemapId?: string | string[];
    sort?: string | string[];
    dir?: string | string[];
    page?: string | string[];
    pageSize?: string | string[];
  }>;
};

const sortLabels: Record<UrlInventorySort, string> = {
  url: "URL",
  firstDiscoveredAt: "First discovered",
  lastDiscoveredAt: "Last discovered",
  sitemapLastModifiedAt: "Sitemap lastmod",
};

export const dynamic = "force-dynamic";

function formatDate(date: Date | null) {
  if (!date) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function buildInventoryHref({
  websiteId,
  query,
  overrides,
}: {
  websiteId: string;
  query: UrlInventoryQuery;
  overrides: Partial<UrlInventoryQuery>;
}) {
  const nextQuery = { ...query, ...overrides };
  const params = new URLSearchParams();

  if (nextQuery.search) {
    params.set("q", nextQuery.search);
  }

  if (nextQuery.sitemapId) {
    params.set("sitemapId", nextQuery.sitemapId);
  }

  params.set("sort", nextQuery.sort);
  params.set("dir", nextQuery.direction);
  params.set("page", String(nextQuery.page));
  params.set("pageSize", String(nextQuery.pageSize));

  return `/websites/${websiteId}/urls?${params.toString()}`;
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-slate-950">
          {value.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}

function DatabaseErrorState() {
  return (
    <div className="grid min-h-72 place-items-center rounded-lg border border-red-200 bg-red-50 p-8 text-center">
      <div className="grid max-w-md gap-2">
        <h2 className="text-lg font-semibold text-red-950">
          URL inventory unavailable
        </h2>
        <p className="text-sm text-red-800">
          The URL inventory could not be loaded from the database.
        </p>
      </div>
    </div>
  );
}

function EmptyState({
  hasFilters,
  websiteId,
}: {
  hasFilters: boolean;
  websiteId: string;
}) {
  return (
    <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center sm:p-8">
      <div className="grid max-w-md justify-items-center gap-4">
        <div className="grid gap-2">
          <h3 className="text-lg font-semibold text-slate-950">
            {hasFilters ? "No URLs match these filters" : "No imported URLs yet"}
          </h3>
          <p className="text-sm leading-6 text-slate-500">
            {hasFilters
              ? "Adjust the search, source sitemap, or sorting controls."
              : "Import a URL-set sitemap to populate the inventory with real URL records."}
          </p>
        </div>
        {hasFilters ? (
          <Button asChild className="mx-auto" variant="outline">
            <Link href={`/websites/${websiteId}/urls`}>Reset filters</Link>
          </Button>
        ) : (
          <Button asChild className="mx-auto">
            <Link href={`/websites/${websiteId}/sitemaps`}>
              <ListTree className="size-4" aria-hidden="true" />
              Go to Sitemaps
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function FilterControls({
  websiteId,
  query,
  sourceSitemaps,
}: {
  websiteId: string;
  query: UrlInventoryQuery;
  sourceSitemaps: SourceSitemapOption[];
}) {
  return (
    <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_220px_200px_160px_150px_auto]">
      <label className="relative grid gap-2">
        <span className="text-sm font-medium text-slate-700">Search</span>
        <Search
          className="pointer-events-none absolute bottom-2 left-2.5 size-4 text-slate-400"
          aria-hidden="true"
        />
        <Input
          name="q"
          defaultValue={query.search}
          placeholder="URL or path"
          className="pl-8"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">
          Source sitemap
        </span>
        <select
          name="sitemapId"
          defaultValue={query.sitemapId}
          className="h-8 min-w-0 rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">All sources</option>
          {sourceSitemaps.map((sitemap) => (
            <option key={sitemap.id} value={sitemap.id}>
              {sitemap.url}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">Sort by</span>
        <select
          name="sort"
          defaultValue={query.sort}
          className="h-8 rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {Object.entries(sortLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">Direction</span>
        <select
          name="dir"
          defaultValue={query.direction}
          className="h-8 rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">Page size</span>
        <select
          name="pageSize"
          defaultValue={query.pageSize}
          className="h-8 rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {urlInventoryPageSizeValues.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <input type="hidden" name="page" value="1" />

      <div className="flex items-end gap-2">
        <Button type="submit" className="w-full lg:w-auto">
          Apply
        </Button>
        <Button asChild type="button" variant="outline">
          <Link href={`/websites/${websiteId}/urls`}>Reset</Link>
        </Button>
      </div>
    </form>
  );
}

function Pagination({
  websiteId,
  data,
}: {
  websiteId: string;
  data: UrlInventoryPageData;
}) {
  const firstRecord =
    data.totalResults === 0
      ? 0
      : (data.query.page - 1) * data.query.pageSize + 1;
  const lastRecord = Math.min(
    data.totalResults,
    data.query.page * data.query.pageSize
  );

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <p>
        Showing {firstRecord.toLocaleString()}-{lastRecord.toLocaleString()} of{" "}
        {data.totalResults.toLocaleString()}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          asChild
          variant="outline"
          aria-disabled={data.query.page <= 1}
          className={data.query.page <= 1 ? "pointer-events-none opacity-50" : ""}
        >
          <Link
            href={buildInventoryHref({
              websiteId,
              query: data.query,
              overrides: { page: data.query.page - 1 },
            })}
          >
            Previous
          </Link>
        </Button>
        <Badge variant="outline">
          Page {data.query.page} of {data.totalPages}
        </Badge>
        <Button
          asChild
          variant="outline"
          aria-disabled={data.query.page >= data.totalPages}
          className={
            data.query.page >= data.totalPages
              ? "pointer-events-none opacity-50"
              : ""
          }
        >
          <Link
            href={buildInventoryHref({
              websiteId,
              query: data.query,
              overrides: { page: data.query.page + 1 },
            })}
          >
            Next
          </Link>
        </Button>
      </div>
    </div>
  );
}

function asPageSize(value: number): UrlInventoryPageSize {
  return urlInventoryPageSizeValues.includes(value as UrlInventoryPageSize)
    ? (value as UrlInventoryPageSize)
    : 25;
}

function asDirection(value: string): UrlInventoryDirection {
  return value === "asc" ? "asc" : "desc";
}

export default async function UrlInventoryPage({
  params,
  searchParams,
}: UrlInventoryPageProps) {
  const { id } = await params;
  const rawSearchParams = await searchParams;
  const repository = createPrismaUrlInventoryRepository(prisma);
  let data: UrlInventoryPageData | null;

  try {
    data = await getUrlInventoryPageData({
      websiteId: id,
      searchParams: rawSearchParams,
      repository,
    });
  } catch {
    return <DatabaseErrorState />;
  }

  if (!data) {
    notFound();
  }

  const hasFilters = Boolean(data.query.search || data.query.sitemapId);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground">{data.website.name}</p>
            <ActiveProjectIndicator />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold text-slate-950">
              URL Inventory
            </h2>
            {data.website.status === "ARCHIVED" ? (
              <WebsiteStatusBadge status={data.website.status} />
            ) : null}
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            URL inventory shows the pages IndexPilot has discovered for this
            website. A discovered URL is not necessarily indexed by Google.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <Button asChild variant="outline">
            <Link href={`/websites/${data.website.id}`}>Website Details</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/websites/${data.website.id}/sitemaps`}>
              <ListTree className="size-4" aria-hidden="true" />
              Sitemaps
            </Link>
          </Button>
        </div>
      </div>

      {data.website.status === "ARCHIVED" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          This website is archived. Imported URLs remain available for reference,
          but no new import workflow should be started until the website is
          restored.
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total imported URLs" value={data.summary.totalUrls} />
        <SummaryCard
          label="Discovered in last 7 days"
          value={data.summary.discoveredLast7Days}
        />
        <SummaryCard
          label="Updated in last 7 days"
          value={data.summary.updatedLast7Days}
        />
        <SummaryCard
          label="Source sitemaps"
          value={data.summary.sourceSitemaps}
        />
      </div>

      <FilterControls
        websiteId={data.website.id}
        query={{
          ...data.query,
          pageSize: asPageSize(data.query.pageSize),
          direction: asDirection(data.query.direction),
        }}
        sourceSitemaps={data.sourceSitemaps}
      />

      {data.urls.length ? (
        <div className="grid gap-3">
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-[1120px] w-full border-collapse text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">URL</th>
                  <th className="px-4 py-3 font-medium">Path</th>
                  <th className="px-4 py-3 font-medium">Source sitemap</th>
                  <th className="px-4 py-3 font-medium">Sitemap lastmod</th>
                  <th className="px-4 py-3 font-medium">First discovered</th>
                  <th className="px-4 py-3 font-medium">Last discovered</th>
                  <th className="px-4 py-3 font-medium">HTTP status</th>
                  <th className="px-4 py-3 font-medium">Indexing status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.urls.map((record) => (
                  <tr key={record.id} className="align-top hover:bg-slate-50">
                    <td className="max-w-[320px] px-4 py-3">
                      <Link
                        href={`/websites/${data.website.id}/urls/${record.id}`}
                        className="break-all font-medium text-slate-950 hover:underline"
                      >
                        {record.url}
                      </Link>
                    </td>
                    <td className="max-w-[220px] break-all px-4 py-3 text-slate-600">
                      {record.path}
                    </td>
                    <td className="max-w-[240px] px-4 py-3">
                      {record.sitemap ? (
                        <Link
                          href={`/websites/${data.website.id}/sitemaps/${record.sitemap.id}`}
                          className="break-all text-slate-700 hover:underline"
                        >
                          {record.sitemap.url}
                        </Link>
                      ) : (
                        <span className="text-slate-500">Not available</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(record.sitemapLastModifiedAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(record.firstDiscoveredAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(record.lastDiscoveredAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">Not checked</td>
                    <td className="px-4 py-3 text-slate-500">Not checked</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline">
                          <a
                            href={record.url}
                            target="_blank"
                            rel="noreferrer"
                            title="Open live URL"
                          >
                            <ExternalLink className="size-4" aria-hidden="true" />
                            Open
                          </a>
                        </Button>
                        {record.sitemap ? (
                          <Button asChild size="sm" variant="outline">
                            <Link
                              href={`/websites/${data.website.id}/sitemaps/${record.sitemap.id}`}
                              title="View source sitemap"
                            >
                              <ListTree className="size-4" aria-hidden="true" />
                              Source
                            </Link>
                          </Button>
                        ) : null}
                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={`/websites/${data.website.id}/urls/${record.id}`}
                            title="View URL details"
                          >
                            <Eye className="size-4" aria-hidden="true" />
                            Details
                          </Link>
                        </Button>
                        <CopyUrlButton url={record.url} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination websiteId={data.website.id} data={data} />
        </div>
      ) : (
        <EmptyState hasFilters={hasFilters} websiteId={data.website.id} />
      )}
    </div>
  );
}
