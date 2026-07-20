import type { Metadata } from "next";
import { CheckCircle2, History, LayoutDashboard, Repeat2, Search, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Features | IndexPilot",
  description:
    "Explore IndexPilot features for URL inspection, indexing history, Search Console properties, and multi-website indexing workflows.",
};

const features = [
  {
    title: "URL inspection",
    description:
      "Inspect important URLs through Google Search Console data and review the latest reported indexing verdict, crawl details, canonical selection, and robots status.",
    icon: Search,
  },
  {
    title: "Inspection history",
    description:
      "Keep previous inspection results together so you can review how a URL's reported indexing status has changed over time.",
    icon: History,
  },
  {
    title: "Multi-website workspace",
    description:
      "Organize client, company, and content websites in one focused dashboard instead of jumping between disconnected spreadsheets.",
    icon: LayoutDashboard,
  },
  {
    title: "Secure Search Console connection",
    description:
      "Connect Google securely, sync Search Console properties, and keep inspection workflows scoped to the right organization and website.",
    icon: ShieldCheck,
  },
  {
    title: "Focused reinspection",
    description:
      "Reinspect URLs from the existing workflow after meaningful page changes without duplicating Google integration logic.",
    icon: Repeat2,
  },
  {
    title: "Operational clarity",
    description:
      "Separate indexed, not indexed, unavailable, and failed inspection states with calm guidance that helps teams decide what to check next.",
    icon: CheckCircle2,
  },
] as const;

export default function FeaturesPage() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto grid max-w-7xl gap-10">
        <div className="grid max-w-3xl gap-4">
          <p className="text-sm font-medium text-muted-foreground">
            Indexing operations in one place
          </p>
          <h1 className="text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
            Features built for Search Console-powered indexing work.
          </h1>
          <p className="text-lg leading-8 text-muted-foreground">
            IndexPilot helps SEO teams connect Google Search Console, inspect
            URLs, review historical results, and manage indexing visibility
            across multiple websites.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {features.map(({ title, description, icon: Icon }) => (
            <article
              key={title}
              className="grid gap-4 rounded-xl border border-border bg-background p-5"
            >
              <Icon className="size-5 text-foreground" aria-hidden="true" />
              <div className="grid gap-2">
                <h2 className="text-xl font-semibold text-foreground">
                  {title}
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
