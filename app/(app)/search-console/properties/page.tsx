import Link from "next/link";
import { Search } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCurrentOrganizationContext } from "@/lib/auth/organization";
import { prisma } from "@/lib/prisma";
import {
  formatSearchConsoleDate,
  formatSearchConsolePropertyType,
  formatSearchConsoleSyncStatus,
  getSyncStatusBadge,
  type SearchConsolePropertySyncStatus,
} from "@/lib/search-console/property-details";

export const dynamic = "force-dynamic";

const syncStatusValues = ["ACTIVE", "MISSING", "ERROR"] as const;
const propertyTypeValues = ["DOMAIN", "URL_PREFIX"] as const;
const linkedValues = ["linked", "unlinked"] as const;
const sortValues = ["propertyUrl", "lastSyncedAt"] as const;
const directionValues = ["asc", "desc"] as const;
const pageSizeValues = [10, 25, 50] as const;

type SearchConsolePropertiesPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    syncStatus?: string | string[];
    propertyType?: string | string[];
    linked?: string | string[];
    sort?: string | string[];
    dir?: string | string[];
    page?: string | string[];
    pageSize?: string | string[];
  }>;
};

type PropertyListQuery = {
  search: string;
  syncStatus: SearchConsolePropertySyncStatus | "";
  propertyType: string;
  linked: string;
  sort: (typeof sortValues)[number];
  direction: (typeof directionValues)[number];
  page: number;
  pageSize: (typeof pageSizeValues)[number];
};

function SummaryCard({ label, value }: { label: string; value: number }) {
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
          Properties unavailable
        </h2>
        <p className="text-sm text-red-800">
          Search Console properties could not be loaded from the database.
        </p>
      </div>
    </div>
  );
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseQuery(
  searchParams: Awaited<SearchConsolePropertiesPageProps["searchParams"]>
): PropertyListQuery {
  const page = Number.parseInt(firstParam(searchParams.page) ?? "", 10);
  const pageSize = Number.parseInt(firstParam(searchParams.pageSize) ?? "", 10);
  const syncStatus = firstParam(searchParams.syncStatus) ?? "";
  const propertyType = firstParam(searchParams.propertyType) ?? "";
  const linked = firstParam(searchParams.linked) ?? "";
  const sort = firstParam(searchParams.sort);
  const direction = firstParam(searchParams.dir);

  return {
    search: (firstParam(searchParams.q) ?? "").trim(),
    syncStatus: syncStatusValues.includes(
      syncStatus as (typeof syncStatusValues)[number]
    )
      ? (syncStatus as SearchConsolePropertySyncStatus)
      : "",
    propertyType: propertyTypeValues.includes(
      propertyType as (typeof propertyTypeValues)[number]
    )
      ? propertyType
      : "",
    linked: linkedValues.includes(linked as (typeof linkedValues)[number])
      ? linked
      : "",
    sort: sortValues.includes(sort as (typeof sortValues)[number])
      ? (sort as (typeof sortValues)[number])
      : "propertyUrl",
    direction: directionValues.includes(
      direction as (typeof directionValues)[number]
    )
      ? (direction as (typeof directionValues)[number])
      : "asc",
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: pageSizeValues.includes(pageSize as (typeof pageSizeValues)[number])
      ? (pageSize as (typeof pageSizeValues)[number])
      : 25,
  };
}

function buildPropertiesHref({
  query,
  overrides,
}: {
  query: PropertyListQuery;
  overrides: Partial<PropertyListQuery>;
}) {
  const nextQuery = { ...query, ...overrides };
  const params = new URLSearchParams();

  if (nextQuery.search) {
    params.set("q", nextQuery.search);
  }

  if (nextQuery.syncStatus) {
    params.set("syncStatus", nextQuery.syncStatus);
  }

  if (nextQuery.propertyType) {
    params.set("propertyType", nextQuery.propertyType);
  }

  if (nextQuery.linked) {
    params.set("linked", nextQuery.linked);
  }

  params.set("sort", nextQuery.sort);
  params.set("dir", nextQuery.direction);
  params.set("page", String(nextQuery.page));
  params.set("pageSize", String(nextQuery.pageSize));

  return `/search-console/properties?${params.toString()}`;
}

function FilterControls({ query }: { query: PropertyListQuery }) {
  return (
    <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:grid-cols-[1fr_170px_170px_160px_160px_140px_120px_auto]">
      <label className="relative grid gap-2">
        <span className="text-sm font-medium text-slate-700">Search</span>
        <Search
          className="pointer-events-none absolute bottom-2 left-2.5 size-4 text-slate-400"
          aria-hidden="true"
        />
        <Input
          name="q"
          defaultValue={query.search}
          placeholder="Property URL or account email"
          className="pl-8"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">Sync Status</span>
        <select
          name="syncStatus"
          defaultValue={query.syncStatus}
          className="h-8 rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">All</option>
          {syncStatusValues.map((value) => (
            <option key={value} value={value}>
              {formatSearchConsoleSyncStatus(value)}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">Property Type</span>
        <select
          name="propertyType"
          defaultValue={query.propertyType}
          className="h-8 rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">All</option>
          {propertyTypeValues.map((value) => (
            <option key={value} value={value}>
              {formatSearchConsolePropertyType(value)}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">Website Link</span>
        <select
          name="linked"
          defaultValue={query.linked}
          className="h-8 rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">All</option>
          <option value="linked">Linked</option>
          <option value="unlinked">Unlinked</option>
        </select>
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">Sort</span>
        <select
          name="sort"
          defaultValue={query.sort}
          className="h-8 rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="propertyUrl">Property URL</option>
          <option value="lastSyncedAt">Last Synced</option>
        </select>
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">Direction</span>
        <select
          name="dir"
          defaultValue={query.direction}
          className="h-8 rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">Page Size</span>
        <select
          name="pageSize"
          defaultValue={query.pageSize}
          className="h-8 rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {pageSizeValues.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <input type="hidden" name="page" value="1" />

      <div className="flex items-end gap-2">
        <Button type="submit" className="w-full xl:w-auto">
          Apply
        </Button>
        <Button asChild type="button" variant="outline">
          <Link href="/search-console/properties">Reset</Link>
        </Button>
      </div>
    </form>
  );
}

function Pagination({
  query,
  totalResults,
  totalPages,
}: {
  query: PropertyListQuery;
  totalResults: number;
  totalPages: number;
}) {
  const firstRecord =
    totalResults === 0 ? 0 : (query.page - 1) * query.pageSize + 1;
  const lastRecord = Math.min(totalResults, query.page * query.pageSize);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <p>
        Showing {firstRecord.toLocaleString()}-{lastRecord.toLocaleString()} of{" "}
        {totalResults.toLocaleString()}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          asChild
          variant="outline"
          className={query.page <= 1 ? "pointer-events-none opacity-50" : ""}
          aria-disabled={query.page <= 1}
        >
          <Link
            href={buildPropertiesHref({
              query,
              overrides: { page: query.page - 1 },
            })}
          >
            Previous
          </Link>
        </Button>
        <Badge variant="outline">
          Page {query.page} of {totalPages}
        </Badge>
        <Button
          asChild
          variant="outline"
          className={
            query.page >= totalPages ? "pointer-events-none opacity-50" : ""
          }
          aria-disabled={query.page >= totalPages}
        >
          <Link
            href={buildPropertiesHref({
              query,
              overrides: { page: query.page + 1 },
            })}
          >
            Next
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default async function SearchConsolePropertiesPage({
  searchParams,
}: SearchConsolePropertiesPageProps) {
  const rawSearchParams = await searchParams;
  const parsedQuery = parseQuery(rawSearchParams);
  let properties;
  let totalResults = 0;
  let summary = {
    total: 0,
    linked: 0,
    unlinked: 0,
    missing: 0,
  };

  try {
    const { organizationId } = await getCurrentOrganizationContext();
    const where = {
      organizationId,
      ...(parsedQuery.syncStatus
        ? { syncStatus: parsedQuery.syncStatus }
        : {}),
      ...(parsedQuery.propertyType
        ? { propertyType: parsedQuery.propertyType }
        : {}),
      ...(parsedQuery.linked === "linked" ? { websiteId: { not: null } } : {}),
      ...(parsedQuery.linked === "unlinked" ? { websiteId: null } : {}),
      ...(parsedQuery.search
        ? {
            OR: [
              {
                siteUrl: {
                  contains: parsedQuery.search,
                  mode: "insensitive" as const,
                },
              },
              {
                normalizedSiteUrl: {
                  contains: parsedQuery.search,
                  mode: "insensitive" as const,
                },
              },
              {
                googleAccount: {
                  email: {
                    contains: parsedQuery.search,
                    mode: "insensitive" as const,
                  },
                },
              },
            ],
          }
        : {}),
    };
    const [totalCount, linkedCount, missingCount, filteredCount] =
      await Promise.all([
        prisma.searchConsoleProperty.count({ where: { organizationId } }),
        prisma.searchConsoleProperty.count({
          where: { organizationId, websiteId: { not: null } },
        }),
        prisma.searchConsoleProperty.count({
          where: { organizationId, syncStatus: "MISSING" },
        }),
        prisma.searchConsoleProperty.count({ where }),
      ]);
    const totalPages = Math.max(1, Math.ceil(filteredCount / parsedQuery.pageSize));
    const query = {
      ...parsedQuery,
      page: Math.min(parsedQuery.page, totalPages),
    };

    properties = await prisma.searchConsoleProperty.findMany({
      where,
      orderBy:
        query.sort === "lastSyncedAt"
          ? [{ lastSyncedAt: query.direction }, { siteUrl: "asc" }]
          : [{ siteUrl: query.direction }, { id: "asc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        siteUrl: true,
        propertyType: true,
        permissionLevel: true,
        verified: true,
        syncStatus: true,
        lastSyncedAt: true,
        googleAccount: {
          select: { email: true },
        },
        website: {
          select: { id: true, name: true },
        },
      },
    });
    totalResults = filteredCount;
    summary = {
      total: totalCount,
      linked: linkedCount,
      unlinked: totalCount - linkedCount,
      missing: missingCount,
    };
    parsedQuery.page = query.page;
  } catch {
    return <DatabaseErrorState />;
  }

  const totalPages = Math.max(1, Math.ceil(totalResults / parsedQuery.pageSize));
  const hasFilters = Boolean(
    parsedQuery.search ||
      parsedQuery.syncStatus ||
      parsedQuery.propertyType ||
      parsedQuery.linked
  );

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm text-slate-500">Search Console</p>
        <h2 className="text-2xl font-semibold text-slate-950">Properties</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total Properties" value={summary.total} />
        <SummaryCard label="Linked" value={summary.linked} />
        <SummaryCard label="Unlinked" value={summary.unlinked} />
        <SummaryCard label="Missing" value={summary.missing} />
      </div>

      <FilterControls query={parsedQuery} />

      {properties.length ? (
        <div className="grid gap-3">
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[1160px] w-full border-collapse text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Property URL</th>
                <th className="px-4 py-3 font-medium">Property Type</th>
                <th className="px-4 py-3 font-medium">Google Account Email</th>
                <th className="px-4 py-3 font-medium">Permission Level</th>
                <th className="px-4 py-3 font-medium">Verification Status</th>
                <th className="px-4 py-3 font-medium">Sync Status</th>
                <th className="px-4 py-3 font-medium">Last Synced</th>
                <th className="px-4 py-3 font-medium">Linked Website</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {properties.map((property) => {
                const syncBadge = getSyncStatusBadge(property.syncStatus);

                return (
                  <tr key={property.id} className="align-top hover:bg-slate-50">
                    <td className="max-w-[320px] break-all px-4 py-3 font-medium text-slate-950">
                      <Link
                        href={`/search-console/properties/${property.id}`}
                        className="hover:underline"
                      >
                        {property.siteUrl}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatSearchConsolePropertyType(property.propertyType)}
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-slate-600">
                      {property.googleAccount.email}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {property.permissionLevel}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={property.verified ? "default" : "secondary"}>
                        {property.verified ? "Verified" : "Unverified"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={syncBadge.variant}
                        className={syncBadge.className}
                      >
                        {formatSearchConsoleSyncStatus(property.syncStatus)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatSearchConsoleDate(property.lastSyncedAt)}
                    </td>
                    <td className="max-w-[220px] px-4 py-3">
                      {property.website ? (
                        <Link
                          href={`/websites/${property.website.id}`}
                          className="font-medium text-slate-700 hover:underline"
                        >
                          {property.website.name}
                        </Link>
                      ) : (
                        <span className="text-slate-500">Unlinked</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          <Pagination
            query={parsedQuery}
            totalResults={totalResults}
            totalPages={totalPages}
          />
        </div>
      ) : hasFilters ? (
        <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center sm:p-8">
          <div className="grid max-w-md justify-items-center gap-4">
            <div className="grid gap-2">
              <h3 className="text-lg font-semibold text-slate-950">
                No properties match these filters
              </h3>
              <p className="text-sm leading-6 text-slate-500">
                Adjust the search or filters to see more properties.
              </p>
            </div>
            <Button asChild className="mx-auto" variant="outline">
              <Link href="/search-console/properties">Reset filters</Link>
            </Button>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Search}
          title="No Search Console properties yet"
          description="Connect a Google account and sync properties to make them available in IndexPilot for review and URL inspection setup."
          primaryAction={
            <Button asChild>
              <Link href="/settings/google">Google settings</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
