import Link from "next/link";
import { AlertCircle, Cable, CheckCircle2, Plus } from "lucide-react";

import { GoogleAccountActions } from "@/components/google/google-account-actions";
import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentOrganizationContext } from "@/lib/auth/organization";
import {
  createPrismaGoogleAccountRepository,
  getGoogleTokenStatus,
} from "@/lib/google/accounts";
import { prisma } from "@/lib/prisma";

type GoogleSettingsPageProps = {
  searchParams: Promise<{
    connected?: string;
    properties?: string;
    error?: string;
  }>;
};

export const dynamic = "force-dynamic";

function formatDate(date: Date | null) {
  if (!date) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getTokenBadgeVariant(status: string) {
  if (status === "Valid") {
    return "default";
  }

  if (status === "Expired") {
    return "secondary";
  }

  return "destructive";
}

function SettingsError({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
      {message}
    </div>
  );
}

export default async function GoogleSettingsPage({
  searchParams,
}: GoogleSettingsPageProps) {
  const params = await searchParams;
  let accounts;

  try {
    const { organizationId } = await getCurrentOrganizationContext();
    accounts = await createPrismaGoogleAccountRepository(prisma).listAccounts(
      organizationId
    );
  } catch {
    return (
      <div className="grid gap-6">
        <div>
          <p className="text-sm text-slate-500">Settings</p>
          <h2 className="text-2xl font-semibold text-slate-950">
            Google Search Console
          </h2>
        </div>
        <SettingsError message="Sign in and configure Supabase plus Google OAuth environment variables to manage Google accounts." />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Settings</p>
          <h2 className="text-2xl font-semibold text-slate-950">
            Google Search Console
          </h2>
        </div>
        <Button asChild>
          <Link href="/api/google/oauth/start">
            <Plus className="size-4" aria-hidden="true" />
            Connect Account
          </Link>
        </Button>
      </div>

      {params.connected ? (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          <CheckCircle2 className="mt-0.5 size-4" aria-hidden="true" />
          <p>
            Connected {params.connected}. Synced {params.properties ?? "0"}{" "}
            properties.
          </p>
        </div>
      ) : null}

      {params.error ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-950">
          <AlertCircle className="mt-0.5 size-4" aria-hidden="true" />
          <p>Google account connection failed. Check OAuth configuration.</p>
        </div>
      ) : null}

      {accounts.length ? (
        <div className="grid gap-4">
          {accounts.map((account) => {
            const tokenStatus = getGoogleTokenStatus(account);

            return (
              <Card key={account.id}>
                <CardHeader className="gap-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      {account.avatarUrl ? (
                        <div
                          aria-hidden="true"
                          className="size-11 rounded-full border border-slate-200 bg-cover bg-center"
                          style={{ backgroundImage: `url(${account.avatarUrl})` }}
                        />
                      ) : (
                        <div className="grid size-11 place-items-center rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-600">
                          {account.email.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">
                          {account.displayName || account.email}
                        </CardTitle>
                        <p className="truncate text-sm text-slate-500">
                          {account.email}
                        </p>
                      </div>
                    </div>
                    <GoogleAccountActions accountId={account.id} />
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Connected
                      </dt>
                      <dd className="text-sm text-slate-950">
                        {formatDate(account.createdAt)}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Property count
                      </dt>
                      <dd className="text-sm text-slate-950">
                        {(account.propertyCount ?? 0).toLocaleString()}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Last synced
                      </dt>
                      <dd className="text-sm text-slate-950">
                        {formatDate(account.lastSyncedAt)}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Token status
                      </dt>
                      <dd>
                        <Badge variant={getTokenBadgeVariant(tokenStatus)}>
                          {tokenStatus}
                        </Badge>
                      </dd>
                    </div>
                  </dl>

                  {account.syncError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                      {account.syncError}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Cable}
          title="No Google accounts connected"
          description="Connect a Google account to sync Search Console properties for this organization."
          primaryAction={
            <Button asChild>
              <Link href="/api/google/oauth/start">Connect Account</Link>
            </Button>
          }
          secondaryAction={
            <Button asChild variant="outline">
              <Link href="/search-console/properties">
                Search Console properties
              </Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
