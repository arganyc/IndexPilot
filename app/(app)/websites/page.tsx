import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { WebsiteActions } from "@/components/websites/website-actions";
import { WebsiteStatusBadge } from "@/components/websites/website-status-badge";
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
  priorityLabels,
  priorityValues,
  statusLabels,
  statusValues,
} from "@/lib/websites/validation";

type PriorityFilter = (typeof priorityValues)[number];
type StatusFilter = (typeof statusValues)[number];

export const dynamic = "force-dynamic";

type WebsitesPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    priority?: string;
  }>;
};

function getPriorityClassName(priority: string) {
  if (priority === "CRITICAL") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (priority === "HIGH") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "";
}

export default async function WebsitesPage({ searchParams }: WebsitesPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = statusValues.includes(params.status as StatusFilter)
    ? (params.status as StatusFilter)
    : undefined;
  const priority = priorityValues.includes(params.priority as PriorityFilter)
    ? (params.priority as PriorityFilter)
    : undefined;
  const hasFilters = Boolean(query || status || priority);

  const websites = await prisma.website.findMany({
    where: {
      AND: [
        query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { domain: { contains: query, mode: "insensitive" } },
                { normalizedDomain: { contains: query, mode: "insensitive" } },
              ],
            }
          : {},
        status ? { status } : {},
        priority ? { priority } : {},
      ],
    },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold text-slate-950">Websites</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            A project is a website workspace for its sitemaps, URL inventory,
            and Google URL inspections.
          </p>
        </div>
        <Button asChild>
          <Link href="/websites/new">
            <Plus className="size-4" aria-hidden="true" />
            Add Website
          </Link>
        </Button>
      </div>

      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_180px_180px_auto]">
        <label className="relative grid gap-2">
          <span className="text-sm font-medium text-slate-700">Search</span>
          <Search
            className="pointer-events-none absolute bottom-2 left-2.5 size-4 text-slate-400"
            aria-hidden="true"
          />
          <Input
            name="q"
            defaultValue={query}
            placeholder="Name or domain"
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
            {statusValues.map((value) => (
              <option key={value} value={value}>
                {statusLabels[value]}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Priority</span>
          <select
            name="priority"
            defaultValue={priority ?? ""}
            className="h-8 rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">All priorities</option>
            {priorityValues.map((value) => (
              <option key={value} value={value}>
                {priorityLabels[value]}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end gap-2">
          <Button type="submit" className="w-full md:w-auto">
            Apply
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href="/websites">Reset</Link>
          </Button>
        </div>
      </form>

      {websites.length ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {websites.map((website) => (
            <Card key={website.id} className="flex flex-col">
              <CardHeader className="gap-2 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="text-lg font-semibold leading-snug text-foreground">
                      <Link
                        href={`/websites/${website.id}`}
                        className="block truncate hover:underline"
                      >
                        {website.domain}
                      </Link>
                    </CardTitle>
                    <p className="truncate text-sm leading-6 text-muted-foreground">
                      {website.name}
                    </p>
                  </div>
                  <WebsiteStatusBadge status={website.status} />
                </div>
              </CardHeader>
              <CardContent className="grid flex-1 gap-4 text-sm text-muted-foreground">
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={getPriorityClassName(website.priority)}
                  >
                    {priorityLabels[website.priority]}
                  </Badge>
                  <Badge variant="outline" className="text-muted-foreground">
                    {website.platform}
                  </Badge>
                </div>
                {website.notes ? (
                  <p className="line-clamp-3 leading-6 text-muted-foreground">
                    {website.notes}
                  </p>
                ) : (
                  <p className="leading-6 text-muted-foreground">No notes.</p>
                )}
              </CardContent>
              <CardFooter className="flex flex-col items-stretch gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <Button asChild variant="outline">
                  <Link href={`/websites/${website.id}/edit`}>Edit</Link>
                </Button>
                <WebsiteActions id={website.id} status={website.status} />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : hasFilters ? (
        <EmptyState
          icon={Search}
          title="No websites matched"
          description="Try a different name, domain, status, or priority filter."
          primaryAction={
            <Button asChild>
              <Link href="/websites">Reset filters</Link>
            </Button>
          }
          secondaryAction={
            <Button asChild variant="outline">
              <Link href="/websites/new">Add Website</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid min-h-80 place-items-center rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center sm:p-8">
          <div className="grid max-w-md justify-items-center gap-4">
            <div className="grid gap-2">
              <h3 className="text-lg font-semibold text-slate-950">
                No websites yet
              </h3>
              <p className="text-sm leading-6 text-slate-500">
                Add your first website to begin organizing inspections and
                tracking Google&apos;s view of your content.
              </p>
            </div>
            <Button asChild className="mx-auto">
              <Link href="/websites/new">
                <Plus className="size-4" aria-hidden="true" />
                Add Website
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
