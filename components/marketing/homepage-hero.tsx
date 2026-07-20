import Link from "next/link";
import { CheckCircle2, History, LockKeyhole, PanelsTopLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const trustPoints = [
  {
    label: "Secure Google connection",
    icon: LockKeyhole,
  },
  {
    label: "Multi-website management",
    icon: PanelsTopLeft,
  },
  {
    label: "Inspection history",
    icon: History,
  },
] as const;

const metrics = [
  { label: "URLs monitored", value: "1,248" },
  { label: "Indexed", value: "936" },
  { label: "Crawled, not indexed", value: "184" },
  { label: "Discovered, not indexed", value: "79" },
  { label: "Blocked or canonical issues", value: "49" },
] as const;

const recentInspections = [
  {
    url: "example.com/pricing",
    status: "Indexed",
  },
  {
    url: "shop.example.com/products/running-shoes",
    status: "Crawled, not indexed",
  },
  {
    url: "docs.example.com/guides/sitemaps",
    status: "Discovered, not indexed",
  },
] as const;

export function HomepageHero() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div className="grid gap-8">
          <div className="grid gap-5">
            <p className="w-fit rounded-full border border-border bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
              Google Indexing Management
            </p>
            <div className="grid gap-5">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-normal text-foreground sm:text-5xl lg:text-6xl">
                Know exactly why Google isn&apos;t indexing your pages.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                Connect Google Search Console, inspect URLs, monitor indexing
                status, and manage multiple websites from one focused dashboard.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/signup">Start Free</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="/features">See Features</Link>
            </Button>
          </div>

          <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            {trustPoints.map((item) => {
              const Icon = item.icon;

              return (
                <li key={item.label} className="flex items-center gap-2">
                  <Icon className="size-4 text-foreground" aria-hidden="true" />
                  <span>{item.label}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-background p-4 shadow-sm sm:p-5">
          <div className="grid gap-5">
            <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Indexing overview
                </p>
                <h2 className="text-xl font-semibold text-foreground">
                  example.com
                </h2>
              </div>
              <Badge variant="outline" className="w-fit">
                Static preview
              </Badge>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-lg border border-border bg-muted/40 p-3"
                >
                  <dt className="text-sm text-muted-foreground">
                    {metric.label}
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold text-foreground">
                    {metric.value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-foreground">
                  Recent inspections
                </h2>
                <span className="text-sm text-muted-foreground">Last 24 hours</span>
              </div>
              <ul className="grid gap-2">
                {recentInspections.map((inspection) => (
                  <li
                    key={inspection.url}
                    className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <span className="break-all text-sm font-medium text-foreground">
                      {inspection.url}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      <CheckCircle2
                        className="size-3.5 text-foreground"
                        aria-hidden="true"
                      />
                      {inspection.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
