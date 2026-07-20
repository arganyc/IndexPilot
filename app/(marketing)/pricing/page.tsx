import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Pricing | IndexPilot",
  description:
    "IndexPilot launch pricing for Google indexing management and Search Console-powered URL inspection workflows.",
};

const included = [
  "Google Search Console connection",
  "Multi-website management",
  "URL inspection workflow",
  "Inspection history",
  "Inspection details",
  "Search and status filtering",
] as const;

const planned = [
  "Bulk URL inspection",
  "Scheduled monitoring",
  "Email alerts",
  "Client reporting",
] as const;

export default function PricingPage() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto grid max-w-7xl gap-10">
        <div className="grid max-w-3xl gap-4">
          <p className="text-sm font-medium text-muted-foreground">
            Launch pricing
          </p>
          <h1 className="text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
            Pricing for the IndexPilot launch beta.
          </h1>
          <p className="text-lg leading-8 text-muted-foreground">
            IndexPilot is in launch beta. You can create a workspace, connect
            Search Console, and start inspecting URLs while paid plans are
            finalized.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="grid gap-6 rounded-xl border border-border bg-background p-6 shadow-sm">
            <div className="grid gap-2">
              <span className="w-fit rounded-full border border-border bg-muted px-3 py-1 text-sm font-medium text-foreground">
                Available now
              </span>
              <h2 className="text-2xl font-semibold text-foreground">
                Free launch beta
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Best for founders, SEO operators, and small teams validating
                their indexing workflow.
              </p>
            </div>

            <div className="flex items-end gap-2">
              <span className="text-5xl font-semibold text-foreground">$0</span>
              <span className="pb-2 text-sm text-muted-foreground">
                during launch beta
              </span>
            </div>

            <Button asChild className="w-fit">
              <Link href="/signup">Start Free</Link>
            </Button>

            <ul className="grid gap-3">
              {included.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 text-sm leading-6 text-muted-foreground"
                >
                  <CheckCircle2
                    className="mt-1 size-4 shrink-0 text-foreground"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="grid content-start gap-5 rounded-xl border border-border bg-muted/30 p-6">
            <div className="grid gap-2">
              <span className="w-fit rounded-full border border-border bg-background px-3 py-1 text-sm font-medium text-foreground">
                Planned
              </span>
              <h2 className="text-2xl font-semibold text-foreground">
                Growth and team plans
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Future plans are expected to support larger monitoring,
                reporting, and collaboration workflows.
              </p>
            </div>
            <ul className="grid gap-3">
              {planned.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 text-sm leading-6 text-muted-foreground"
                >
                  <CheckCircle2
                    className="mt-1 size-4 shrink-0 text-foreground"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm leading-6 text-muted-foreground">
              No paid plan is required to start using the launch beta.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
