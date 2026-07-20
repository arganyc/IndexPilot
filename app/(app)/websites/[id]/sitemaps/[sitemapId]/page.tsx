import Link from "next/link";
import { notFound } from "next/navigation";
import { ListTree } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { ImportSitemapButton } from "@/components/sitemaps/import-sitemap-button";
import { ParseTestButton } from "@/components/sitemaps/parse-test-button";
import { SitemapActions } from "@/components/sitemaps/sitemap-actions";
import { TestFetchButton } from "@/components/sitemaps/test-fetch-button";
import { SitemapTypeForm } from "@/components/sitemaps/sitemap-type-form";
import { ActiveProjectIndicator } from "@/components/websites/active-project-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import {
  sitemapStatusLabels,
  sitemapTypeLabels,
} from "@/lib/sitemaps/validation";

type SitemapDetailsPageProps = {
  params: Promise<{ id: string; sitemapId: string }>;
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

function DetailRow({
  label,
  value,
  placeholder,
}: {
  label: string;
  value: React.ReactNode;
  placeholder?: boolean;
}) {
  return (
    <div className="grid gap-1 rounded-lg border border-slate-100 bg-slate-50 p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className={placeholder ? "text-slate-500" : "text-slate-950"}>
        {value}
        {placeholder ? (
          <span className="ml-2 text-xs text-slate-400">Placeholder</span>
        ) : null}
      </dd>
    </div>
  );
}

export default async function SitemapDetailsPage({
  params,
}: SitemapDetailsPageProps) {
  const { id, sitemapId } = await params;
  const sitemap = await prisma.sitemap.findFirst({
    where: { id: sitemapId, websiteId: id },
    include: {
      website: { select: { id: true, name: true } },
      parentSitemap: { select: { id: true, url: true } },
      childSitemaps: {
        orderBy: { url: "asc" },
        select: { id: true, url: true, status: true, type: true, urlCount: true },
      },
      _count: { select: { urlRecords: true } },
    },
  });

  if (!sitemap) {
    notFound();
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {sitemap.website.name}
            </p>
            <ActiveProjectIndicator />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="max-w-full truncate text-2xl font-semibold text-slate-950">
              {sitemap.url}
            </h2>
            <Badge>{sitemapStatusLabels[sitemap.status]}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/websites/${id}/sitemaps`}>Back to Sitemaps</Link>
          </Button>
          <SitemapActions
            websiteId={id}
            sitemapId={sitemap.id}
            status={sitemap.status}
            deleteRedirectTo={`/websites/${id}/sitemaps`}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div>
            <CardTitle>Sitemap Details</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Import URL-set sitemaps directly or recursively process sitemap
              indexes into child sitemap records.
            </p>
          </div>
          <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto_auto] xl:items-start">
            <SitemapTypeForm
              websiteId={id}
              sitemapId={sitemap.id}
              defaultType={sitemap.type}
            />
            <TestFetchButton websiteId={id} sitemapId={sitemap.id} />
            <ParseTestButton websiteId={id} sitemapId={sitemap.id} />
            <ImportSitemapButton websiteId={id} sitemapId={sitemap.id} />
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <DetailRow label="Sitemap URL" value={sitemap.url} />
            <DetailRow label="Type" value={sitemapTypeLabels[sitemap.type]} />
            <DetailRow
              label="Status"
              value={sitemapStatusLabels[sitemap.status]}
            />
            <DetailRow
              label="Parent sitemap"
              value={
                sitemap.parentSitemap ? (
                  <Link
                    href={`/websites/${id}/sitemaps/${sitemap.parentSitemap.id}`}
                    className="hover:underline"
                  >
                    {sitemap.parentSitemap.url}
                  </Link>
                ) : (
                  "No parent sitemap"
                )
              }
              placeholder={!sitemap.parentSitemap}
            />
            <DetailRow label="URL count" value={sitemap.urlCount} />
            <DetailRow
              label="Last fetch"
              value={formatDate(sitemap.lastFetchedAt)}
              placeholder={!sitemap.lastFetchedAt}
            />
            <DetailRow
              label="Last successful fetch"
              value={formatDate(sitemap.lastSuccessfulFetchAt)}
              placeholder={!sitemap.lastSuccessfulFetchAt}
            />
            <DetailRow
              label="Last error"
              value={sitemap.lastError || "No error recorded"}
              placeholder={!sitemap.lastError}
            />
            <DetailRow
              label="Imported URLs"
              value={`${sitemap._count.urlRecords} records`}
              placeholder
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Child Sitemaps</CardTitle>
        </CardHeader>
        <CardContent>
          {sitemap.childSitemaps.length ? (
            <div className="grid gap-3">
              {sitemap.childSitemaps.map((child) => (
                <Link
                  key={child.id}
                  href={`/websites/${id}/sitemaps/${child.id}`}
                  className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="truncate text-sm font-medium text-slate-950">
                    {child.url}
                  </span>
                  <span className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {sitemapTypeLabels[child.type]}
                    </Badge>
                    <Badge variant="outline">
                      {sitemapStatusLabels[child.status]}
                    </Badge>
                    <Badge variant="outline">{child.urlCount} URLs</Badge>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ListTree}
              title="No child sitemaps"
              description="Child sitemaps appear here when a sitemap index is imported."
              className="min-h-48"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Imported URLs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Imported URL inventory UI is not implemented in Phase 3E-2.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
