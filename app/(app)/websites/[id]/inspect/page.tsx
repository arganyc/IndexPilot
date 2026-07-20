import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ArrowLeft, LinkIcon } from "lucide-react";

import { submitSingleUrlInspectionForm } from "@/app/(app)/websites/[id]/inspect/actions";
import { InspectionForm } from "@/components/url-inspections/inspection-form";
import { ActiveProjectIndicator } from "@/components/websites/active-project-indicator";
import { WebsiteStatusBadge } from "@/components/websites/website-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getUrlInspectionFormPageData } from "@/lib/url-inspections/form-page";
import { createPrismaUrlInspectionFormRepository } from "@/lib/url-inspections/prisma-form-page-repository";

type WebsiteInspectPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ urlRecordId?: string | string[] }>;
};

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function PageErrorState({
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

function NoCompatiblePropertiesState({
  hasGoogleAccounts,
}: {
  hasGoogleAccounts: boolean;
}) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="grid gap-3">
        <div className="flex items-start gap-2 text-amber-950">
          <AlertCircle className="mt-0.5 size-4" aria-hidden="true" />
          <div className="grid gap-1">
            <h3 className="text-sm font-semibold">
              {hasGoogleAccounts
                ? "No compatible Search Console properties"
                : "No connected Google accounts"}
            </h3>
            <p className="text-sm">
              {hasGoogleAccounts
                ? "Connect or sync a verified active property that matches this website before running URL inspections."
                : "Connect a Google account and sync Search Console properties before running URL inspections."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/search-console/properties">Search Console properties</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/settings/google">Google settings</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function InspectionRequirementsCallout() {
  return (
    <section
      aria-labelledby="inspection-requirements-title"
      className="rounded-lg border border-border bg-muted/40 p-4"
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <div className="grid gap-3">
          <div className="grid gap-1">
            <h3
              id="inspection-requirements-title"
              className="text-sm font-semibold text-foreground"
            >
              Before you inspect
            </h3>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              URL inspections require a connected Google account, an active
              verified Search Console property, and a URL that belongs to this
              website and matches the selected property.
            </p>
          </div>
          <ul className="grid max-w-3xl gap-1 text-sm leading-6 text-muted-foreground sm:grid-cols-2">
            <li>Use an HTTP or HTTPS URL from this website.</li>
            <li>
              Google controls indexing. IndexPilot saves the inspection result
              for review.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export default async function WebsiteInspectPage({
  params,
  searchParams,
}: WebsiteInspectPageProps) {
  const { id } = await params;
  const rawSearchParams = await searchParams;
  const requestedUrlRecordId = firstParam(rawSearchParams.urlRecordId);
  const repository = createPrismaUrlInspectionFormRepository(prisma);
  let data;

  try {
    data = await getUrlInspectionFormPageData({
      websiteId: id,
      urlRecordId: requestedUrlRecordId,
      repository,
    });
  } catch {
    return (
      <PageErrorState
        title="Inspection form unavailable"
        message="The inspection form data could not be loaded from the database."
      />
    );
  }

  if (!data.ok) {
    notFound();
  }

  const website = data.website;
  const hasCompatibleProperties = data.compatibleProperties.length > 0;
  const validatedUrlRecordId =
    requestedUrlRecordId && data.prefillUrl ? requestedUrlRecordId : undefined;
  const submitAction = submitSingleUrlInspectionForm.bind(null, {
    websiteId: website.id,
    ...(validatedUrlRecordId ? { urlRecordId: validatedUrlRecordId } : {}),
  });

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">URL Inspection</p>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold text-slate-950">
              {website.name}
            </h2>
            <ActiveProjectIndicator />
            <WebsiteStatusBadge status={website.status} />
          </div>
          <p className="break-all text-sm text-slate-500">{website.domain}</p>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={`/websites/${website.id}`}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to website
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={`/websites/${website.id}/urls`}>
              <LinkIcon className="size-4" aria-hidden="true" />
              Back to URL inventory
            </Link>
          </Button>
        </div>
      </div>

      {website.status === "ARCHIVED" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          This website is archived. URL inspection setup is visible for reference,
          but inspections cannot be submitted for archived websites.
        </div>
      ) : null}

      {data.invalidUrlRecordId ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          The requested URL record could not be used for this website, so the URL
          field was left blank.
        </div>
      ) : null}

      {!hasCompatibleProperties ? (
        <NoCompatiblePropertiesState hasGoogleAccounts={data.hasGoogleAccounts} />
      ) : null}

      <InspectionRequirementsCallout />

      <Card>
        <CardHeader>
          <CardTitle>Inspect URL</CardTitle>
        </CardHeader>
        <CardContent>
          <InspectionForm
            action={submitAction}
            defaultInspectedUrl={data.prefillUrl}
            defaultPropertyId={data.defaultPropertyId}
            disabled={!hasCompatibleProperties || website.status === "ARCHIVED"}
            placeholder={`https://${website.normalizedDomain}/page`}
            properties={data.compatibleProperties.map((property) => ({
              id: property.id,
              siteUrl: property.siteUrl,
              propertyType: property.propertyType,
              googleAccount: property.googleAccount,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
