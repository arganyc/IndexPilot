import {
  History,
  PanelsTopLeft,
  ScanSearch,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

const benefits: {
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    title: "Inspect URLs faster",
    description:
      "Check Google's latest indexing verdict, crawl details, canonical selection, and robots status without digging through multiple Search Console screens.",
    icon: ScanSearch,
  },
  {
    title: "Track changes over time",
    description:
      "Keep a clear inspection history so you can see when indexing status changes and verify whether fixes are working.",
    icon: History,
  },
  {
    title: "Manage every website",
    description:
      "Switch between client, company, and content sites from one workspace instead of managing each Search Console property separately.",
    icon: PanelsTopLeft,
  },
  {
    title: "Find issues that need attention",
    description:
      "Quickly identify crawled, discovered, blocked, and canonical-related problems before they quietly reduce organic visibility.",
    icon: TriangleAlert,
  },
];

export function HomepageBenefits() {
  return (
    <section className="border-t border-border px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto grid max-w-7xl gap-10">
        <div className="grid max-w-3xl gap-4">
          <p className="text-sm font-medium text-muted-foreground">
            Built for indexing clarity
          </p>
          <h2 className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
            Stop guessing what Google sees.
          </h2>
          <p className="text-lg leading-8 text-muted-foreground">
            IndexPilot brings URL inspection, indexing history, and multi-site
            visibility into one focused workspace so you can find problems faster
            and take action with confidence.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;

            return (
              <article
                key={benefit.title}
                className="grid gap-4 rounded-xl border border-border bg-background p-5 transition-colors hover:bg-muted/30"
                data-benefit-card
              >
                <div className="grid size-10 place-items-center rounded-lg border border-border bg-muted text-foreground">
                  <Icon
                    className="size-5"
                    aria-hidden="true"
                    data-benefit-icon
                  />
                </div>
                <div className="grid gap-2">
                  <h3 className="text-base font-semibold text-foreground">
                    {benefit.title}
                  </h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {benefit.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
