import Link from "next/link";
import { notFound } from "next/navigation";

import { ActiveProjectIndicator } from "@/components/websites/active-project-indicator";
import { WebsiteActions } from "@/components/websites/website-actions";
import { WebsiteNavigation } from "@/components/websites/website-navigation";
import { WebsiteStatusBadge } from "@/components/websites/website-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import {
  platformLabels,
  priorityLabels,
  statusLabels,
} from "@/lib/websites/validation";

type WebsiteDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
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
      </dd>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  primary,
}: {
  label: string;
  value: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <div className="grid gap-2 rounded-lg border border-border bg-muted/40 p-4">
      <dt className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </dt>
      <dd
        className={
          primary
            ? "text-xl font-semibold leading-snug text-foreground"
            : "text-lg font-semibold leading-snug text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}

export default async function WebsiteDetailsPage({
  params,
}: WebsiteDetailsPageProps) {
  const { id } = await params;
  const [website, sitemapCount, importedUrlCount] = await Promise.all([
    prisma.website.findUnique({ where: { id } }),
    prisma.sitemap.count({ where: { websiteId: id } }),
    prisma.urlRecord.count({ where: { websiteId: id } }),
  ]);

  if (!website) {
    notFound();
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="grid gap-2">
            <h2 className="break-words text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
              {website.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <ActiveProjectIndicator />
              <WebsiteStatusBadge status={website.status} />
              <p className="break-all text-sm leading-6 text-muted-foreground">
                {website.domain}
              </p>
            </div>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Website details summarize this website workspace in IndexPilot.
            These settings help organize sitemaps, URL inventory, and inspections
            but do not affect Google&apos;s indexing decisions.
          </p>
        </div>
        <div className="grid gap-3 sm:justify-items-end">
          <section aria-labelledby="project-actions-label" className="grid gap-2">
            <p
              id="project-actions-label"
              className="text-xs font-medium uppercase text-muted-foreground"
            >
              Project actions
            </p>
            <div className="flex flex-wrap items-start gap-2">
              <Button asChild variant="outline">
                <Link href="/websites">Back</Link>
              </Button>
              <Button asChild>
                <Link href={`/websites/${website.id}/edit`}>Edit</Link>
              </Button>
              <WebsiteActions
                id={website.id}
                status={website.status}
                deleteRedirectTo="/websites"
              />
            </div>
          </section>
          <section aria-labelledby="project-sections-label" className="grid gap-2">
            <p
              id="project-sections-label"
              className="text-xs font-medium uppercase text-muted-foreground"
            >
              Project sections
            </p>
            <WebsiteNavigation
              websiteId={website.id}
              active="details"
              sitemapCount={sitemapCount}
              importedUrlCount={importedUrlCount}
            />
          </section>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle>Website Overview</CardTitle>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Current setup and discovery signals for this website.
          </p>
        </CardHeader>
        <CardContent className="grid gap-6">
          <dl
            aria-label="Website health summary"
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
          >
            <SummaryRow
              label="Status"
              value={statusLabels[website.status]}
              primary
            />
            <SummaryRow
              label="Priority"
              value={priorityLabels[website.priority]}
            />
            <SummaryRow
              label="Imported URL count"
              value={importedUrlCount}
            />
            <SummaryRow label="Sitemap count" value={sitemapCount} />
          </dl>

          <dl
            aria-label="Website metadata"
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
          >
            <DetailRow label="Name" value={website.name} />
            <DetailRow label="Domain" value={website.domain} />
            <DetailRow label="Protocol" value={website.protocol} />
            <DetailRow label="Platform" value={platformLabels[website.platform]} />
            <DetailRow
              label="Notes"
              value={website.notes || "No notes."}
              placeholder={!website.notes}
            />
            <DetailRow label="Created date" value={formatDate(website.createdAt)} />
            <DetailRow label="Updated date" value={formatDate(website.updatedAt)} />
            <DetailRow label="Google connected" value="No" placeholder />
            <DetailRow label="IndexNow enabled" value="No" placeholder />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
