import type React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ArrowLeft, ExternalLink, Settings } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentOrganizationContext } from "@/lib/auth/organization";
import { prisma } from "@/lib/prisma";
import {
  buildSearchConsolePropertyDetailsViewModel,
  getSearchConsolePropertyDetails,
  type PropertyBadgeView,
} from "@/lib/search-console/property-details";
import { createPrismaSearchConsolePropertyDetailsRepository } from "@/lib/search-console/prisma-property-details";

type SearchConsolePropertyDetailsPageProps = {
  params: Promise<{ propertyId: string }>;
};

export const dynamic = "force-dynamic";

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

function PropertyBadge({ badge }: { badge: PropertyBadgeView }) {
  return (
    <Badge variant={badge.variant} className={badge.className}>
      {badge.label}
    </Badge>
  );
}

function Notice({
  title,
  message,
  variant,
}: {
  title: string;
  message: string;
  variant: "warning" | "error";
}) {
  const classes =
    variant === "error"
      ? "border-red-200 bg-red-50 text-red-950"
      : "border-amber-200 bg-amber-50 text-amber-950";

  return (
    <div className={`flex items-start gap-2 rounded-lg border p-4 ${classes}`}>
      <AlertCircle className="mt-0.5 size-4" aria-hidden="true" />
      <div className="grid gap-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}

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
        <Button asChild className="mx-auto mt-2" variant="outline">
          <Link href="/search-console/properties">Back to properties</Link>
        </Button>
      </div>
    </div>
  );
}

export default async function SearchConsolePropertyDetailsPage({
  params,
}: SearchConsolePropertyDetailsPageProps) {
  const { propertyId } = await params;
  const repository = createPrismaSearchConsolePropertyDetailsRepository(prisma);
  let organizationId: string;

  try {
    ({ organizationId } = await getCurrentOrganizationContext());
  } catch {
    return (
      <PageState
        title="Sign in required"
        message="You need to be signed in to view Search Console property details."
      />
    );
  }

  let result;

  try {
    result = await getSearchConsolePropertyDetails({
      propertyId,
      organizationId,
      repository,
    });
  } catch {
    return (
      <PageState
        title="Property details unavailable"
        message="The Search Console property could not be loaded from the database."
      />
    );
  }

  if (!result.ok) {
    if (result.reason === "NOT_FOUND") {
      notFound();
    }

    if (result.reason === "MISSING_GOOGLE_ACCOUNT") {
      return (
        <PageState
          title="Google account relationship missing"
          message="This property is missing its connected Google account relationship."
        />
      );
    }

    notFound();
  }

  const property = result.property;
  const view = buildSearchConsolePropertyDetailsViewModel(property);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">Search Console property</p>
          <h2 className="break-all text-2xl font-semibold text-slate-950">
            {view.title}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <PropertyBadge badge={view.statusBadge} />
            <PropertyBadge badge={view.verificationBadge} />
            <PropertyBadge badge={view.linkBadge} />
            <PropertyBadge badge={view.propertyTypeBadge} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/search-console/properties">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to properties
            </Link>
          </Button>
          <Button asChild variant="outline">
            <a
              href={view.googleSearchConsoleUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              Open in Google Search Console
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href="/settings/google">
              <Settings className="size-4" aria-hidden="true" />
              View Google account settings
            </Link>
          </Button>
          {property.website ? (
            <Button asChild>
              <Link href={`/websites/${property.website.id}`}>
                View linked website
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {property.syncStatus === "MISSING" ? (
        <Notice
          variant="warning"
          title="Property missing in Google"
          message="This property was previously synchronized, but it was not returned by the latest Google property sync."
        />
      ) : null}

      {property.syncStatus === "ERROR" ? (
        <Notice
          variant="error"
          title="Property sync error"
          message="This property is marked with a synchronization error. Refreshing properties can be handled from Google settings."
        />
      ) : null}

      {view.isArchivedWebsite ? (
        <Notice
          variant="warning"
          title="Linked website archived"
          message="The linked IndexPilot website is archived. Property data remains available for review."
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Property Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {view.details.map((detail) => (
              <DetailRow
                key={detail.label}
                label={detail.label}
                value={detail.value}
                placeholder={detail.placeholder}
              />
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
