import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Search } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { SitemapActions } from "@/components/sitemaps/sitemap-actions";
import { SitemapForm } from "@/components/sitemaps/sitemap-form";
import { ActiveProjectIndicator } from "@/components/websites/active-project-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import {
  sitemapStatusLabels,
  sitemapStatusValues,
  sitemapTypeLabels,
} from "@/lib/sitemaps/validation";

type SitemapStatusFilter = (typeof sitemapStatusValues)[number];

type SitemapsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
};

export const dynamic = "force-dynamic";

function formatDate(date: Date | null) {
  if (!date) {
    return "Not fetched yet";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatusVariant(status: string) {
  if (status === "IMPORTED") {
    return "default";
  }

  if (status === "FAILED") {
    return "destructive";
  }

  if (status === "ARCHIVED") {
    return "secondary";
  }

  return "outline";
}

export default async function SitemapsPage({
  params,
  searchParams,
}: SitemapsPageProps) {
  const { id } = await params;
  const currentSearchParams = await searchParams;
  const query = currentSearchParams.q?.trim() ?? "";
  const status = sitemapStatusValues.includes(
    currentSearchParams.status as SitemapStatusFilter
  )
    ? (currentSearchParams.status as SitemapStatusFilter)
    : undefined;
  const hasFilters = Boolean(query || status);

  const website = await prisma.website.findUnique({
    where: { id },
    select: { id: true, name: true, domain: true },
  });

  if (!website) {
    notFound();
  }

  const [sitemaps, parentOptions] = await Promise.all([
    prisma.sitemap.findMany({
      where: {
        websiteId: website.id,
        AND: [
          query
            ? {
                OR: [
                  { url: { contains: query, mode: "insensitive" } },
                  { normalizedUrl: { contains: query, mode: "insensitive" } },
                  { lastError: { contains: query, mode: "insensitive" } },
                ],
              }
            : {},
          status ? { status } : {},
        ],
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      include: {
        parentSitemap: {
          select: { id: true, url: true },
        },
      },
    }),
    prisma.sitemap.findMany({
      where: { websiteId: website.id, status: { not: "ARCHIVED" } },
      orderBy: { url: "asc" },
      select: { id: true, url: true },
    }),
  ]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground">{website.name}</p>
            <ActiveProjectIndicator />
          </div>
          <h2 className="text-2xl font-semibold text-slate-950">Sitemaps</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Sitemaps help IndexPilot discover which URLs belong to this website.
            They do not guarantee that Google will crawl or index every URL.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <Button asChild variant="outline">
            <Link href={`/websites/${website.id}`}>Website Details</Link>
          </Button>
          <Button asChild>
            <a href="#add-sitemap">
              <Plus className="size-4" aria-hidden="true" />
              Add Sitemap Manually
            </a>
          </Button>
        </div>
      </div>

      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_200px_auto]">
        <label className="relative grid gap-2">
          <span className="text-sm font-medium text-slate-700">Search</span>
          <Search
            className="pointer-events-none absolute bottom-2 left-2.5 size-4 text-slate-400"
            aria-hidden="true"
          />
          <Input
            name="q"
            defaultValue={query}
            placeholder="Sitemap URL or error"
            className="pl-8"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Status</span>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="h-8 rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">All statuses</option>
            {sitemapStatusValues.map((value) => (
              <option key={value} value={value}>
                {sitemapStatusLabels[value]}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end gap-2">
          <Button type="submit" className="w-full md:w-auto">
            Apply
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href={`/websites/${website.id}/sitemaps`}>Reset</Link>
          </Button>
        </div>
      </form>

      {sitemaps.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {sitemaps.map((sitemap) => (
            <Card key={sitemap.id} className="flex flex-col">
              <CardHeader className="gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">
                      <Link
                        href={`/websites/${website.id}/sitemaps/${sitemap.id}`}
                        className="hover:underline"
                      >
                        {sitemap.url}
                      </Link>
                    </CardTitle>
                    {sitemap.parentSitemap ? (
                      <p className="mt-1 truncate text-xs text-slate-500">
                        Parent: {sitemap.parentSitemap.url}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant={getStatusVariant(sitemap.status)}>
                    {sitemapStatusLabels[sitemap.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {sitemapTypeLabels[sitemap.type]}
                  </Badge>
                  <Badge variant="outline">{sitemap.urlCount} URLs</Badge>
                </div>
                <dl className="grid gap-2 text-slate-600 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-400">
                      Last fetched
                    </dt>
                    <dd>{formatDate(sitemap.lastFetchedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-400">
                      Last error
                    </dt>
                    <dd className="line-clamp-2">
                      {sitemap.lastError || "None"}
                    </dd>
                  </div>
                </dl>
              </CardContent>
              <CardFooter className="flex flex-col items-stretch gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <Button asChild variant="outline">
                  <Link href={`/websites/${website.id}/sitemaps/${sitemap.id}`}>
                    Details
                  </Link>
                </Button>
                <SitemapActions
                  websiteId={website.id}
                  sitemapId={sitemap.id}
                  status={sitemap.status}
                />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : hasFilters ? (
        <EmptyState
          icon={Search}
          title="No sitemaps matched"
          description="Try a different sitemap URL, error term, or status filter."
          primaryAction={
            <Button asChild>
              <Link href={`/websites/${website.id}/sitemaps`}>Reset filters</Link>
            </Button>
          }
          secondaryAction={
            <Button asChild variant="outline">
              <a href="#add-sitemap">Add Sitemap Manually</a>
            </Button>
          }
        />
      ) : (
        <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center sm:p-8">
          <div className="grid max-w-md justify-items-center gap-4">
            <div className="grid gap-2">
              <h3 className="text-lg font-semibold text-slate-950">
                No sitemaps found
              </h3>
              <p className="text-sm leading-6 text-slate-500">
                Add a sitemap manually or adjust the current search and filters.
              </p>
            </div>
            <Button asChild className="mx-auto">
              <a href="#add-sitemap">
                <Plus className="size-4" aria-hidden="true" />
                Add Sitemap Manually
              </a>
            </Button>
          </div>
        </div>
      )}

      <section id="add-sitemap">
        <SitemapForm websiteId={website.id} parentOptions={parentOptions} />
      </section>
    </div>
  );
}
