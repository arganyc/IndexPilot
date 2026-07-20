import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

const availableCapabilities = [
  "Google Search Console connection",
  "Multi-website management",
  "URL inspection",
  "Inspection details",
  "Inspection history",
  "Search and status filtering",
  "Secure URL reinspection",
] as const;

const plannedCapabilities = [
  "Bulk URL inspection",
  "Scheduled monitoring",
  "Email alerts",
  "Team collaboration",
  "Client reporting",
  "API access",
] as const;

export function HomepageRoadmap() {
  return (
    <section className="border-t border-border px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto grid max-w-7xl gap-10">
        <div className="grid max-w-3xl gap-4">
          <p className="text-sm font-medium text-muted-foreground">
            Built for today, expanding for tomorrow
          </p>
          <h2 className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
            Everything you need to start managing indexing with confidence.
          </h2>
          <p className="text-lg leading-8 text-muted-foreground">
            Use IndexPilot&apos;s core inspection workflow today, with more
            automation, reporting, and collaboration capabilities planned as the
            platform grows.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <article
            className="grid gap-5 rounded-xl border border-border bg-background p-5"
            data-roadmap-panel="available"
          >
            <div className="grid gap-3">
              <span className="w-fit rounded-full border border-border bg-muted px-3 py-1 text-sm font-medium text-foreground">
                Available
              </span>
              <div className="grid gap-1">
                <h3 className="text-xl font-semibold text-foreground">
                  Available now
                </h3>
                <p className="text-sm font-medium text-muted-foreground">
                  Core indexing workflow
                </p>
              </div>
            </div>
            <ul className="grid gap-3">
              {availableCapabilities.map((capability) => (
                <li
                  key={capability}
                  className="flex gap-3 text-sm leading-6 text-muted-foreground"
                >
                  <CheckCircle2
                    className="mt-1 size-4 shrink-0 text-foreground"
                    aria-hidden="true"
                    data-roadmap-available-icon
                  />
                  <span>{capability}</span>
                </li>
              ))}
            </ul>
          </article>
          <article
            className="grid gap-5 rounded-xl border border-border bg-muted/30 p-5"
            data-roadmap-panel="planned"
          >
            <div className="grid gap-3">
              <span className="w-fit rounded-full border border-border bg-background px-3 py-1 text-sm font-medium text-foreground">
                Planned
              </span>
              <div className="grid gap-1">
                <h3 className="text-xl font-semibold text-foreground">
                  Coming soon
                </h3>
                <p className="text-sm font-medium text-muted-foreground">
                  Planned platform expansion
                </p>
              </div>
            </div>
            <ul className="grid gap-3">
              {plannedCapabilities.map((capability) => (
                <li
                  key={capability}
                  className="flex gap-3 text-sm leading-6 text-muted-foreground"
                >
                  <CheckCircle2
                    className="mt-1 size-4 shrink-0 text-foreground"
                    aria-hidden="true"
                    data-roadmap-planned-icon
                  />
                  <span>{capability}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>

        <div>
          <Link
            href="/roadmap"
            className="inline-flex rounded-md text-sm font-medium text-foreground underline underline-offset-4 outline-none hover:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            View the full roadmap
          </Link>
        </div>
      </div>
    </section>
  );
}
