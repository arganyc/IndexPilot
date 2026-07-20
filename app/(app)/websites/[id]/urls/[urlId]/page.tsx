import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, ListTree } from "lucide-react";

import { CopyUrlButton } from "@/components/urls/copy-url-button";
import { ActiveProjectIndicator } from "@/components/websites/active-project-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getUrlDetailsForWebsite } from "@/lib/urls/inventory";
import { createPrismaUrlInventoryRepository } from "@/lib/urls/prisma-repository";

type UrlDetailsPageProps = {
  params: Promise<{ id: string; urlId: string }>;
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
      <dd
        className={
          placeholder ? "break-words text-slate-500" : "break-words text-slate-950"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function DatabaseErrorState() {
  return (
    <div className="grid min-h-72 place-items-center rounded-lg border border-red-200 bg-red-50 p-8 text-center">
      <div className="grid max-w-md gap-2">
        <h2 className="text-lg font-semibold text-red-950">
          URL details unavailable
        </h2>
        <p className="text-sm text-red-800">
          The URL record could not be loaded from the database.
        </p>
      </div>
    </div>
  );
}

export default async function UrlDetailsPage({ params }: UrlDetailsPageProps) {
  const { id, urlId } = await params;
  const repository = createPrismaUrlInventoryRepository(prisma);
  let record;

  try {
    record = await getUrlDetailsForWebsite({
      websiteId: id,
      urlId,
      repository,
    });
  } catch {
    return <DatabaseErrorState />;
  }

  if (!record) {
    notFound();
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {record.website.name}
            </p>
            <ActiveProjectIndicator />
          </div>
          <h2 className="break-all text-2xl font-semibold text-slate-950">
            {record.url}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/websites/${record.website.id}/urls`}>
              URL Inventory
            </Link>
          </Button>
          <Button asChild variant="outline">
            <a href={record.url} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" aria-hidden="true" />
              Open Live URL
            </a>
          </Button>
          <CopyUrlButton url={record.url} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>URL Details</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">HTTP status: Not checked</Badge>
              <Badge variant="outline">Indexing status: Not checked</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <DetailRow label="Full URL" value={record.url} />
            <DetailRow label="Path" value={record.path} />
            <DetailRow label="Website" value={record.website.name} />
            <DetailRow
              label="Source sitemap"
              value={
                record.sitemap ? (
                  <Link
                    href={`/websites/${record.website.id}/sitemaps/${record.sitemap.id}`}
                    className="hover:underline"
                  >
                    {record.sitemap.url}
                  </Link>
                ) : (
                  "Not available"
                )
              }
              placeholder={!record.sitemap}
            />
            <DetailRow
              label="Sitemap lastmod"
              value={formatDate(record.sitemapLastModifiedAt)}
              placeholder={!record.sitemapLastModifiedAt}
            />
            <DetailRow
              label="First discovered"
              value={formatDate(record.firstDiscoveredAt)}
            />
            <DetailRow
              label="Last discovered"
              value={formatDate(record.lastDiscoveredAt)}
            />
            <DetailRow label="HTTP status" value="Not checked" placeholder />
            <DetailRow label="Indexing status" value="Not checked" placeholder />
            <DetailRow label="Record ID" value={record.id} />
            <DetailRow label="Created date" value={formatDate(record.createdAt)} />
            <DetailRow label="Updated date" value={formatDate(record.updatedAt)} />
          </dl>
        </CardContent>
      </Card>

      {record.sitemap ? (
        <Button asChild variant="outline" className="justify-self-start">
          <Link href={`/websites/${record.website.id}/sitemaps/${record.sitemap.id}`}>
            <ListTree className="size-4" aria-hidden="true" />
            View Source Sitemap
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
