import { Cable, ListChecks, ScanSearch, type LucideIcon } from "lucide-react";

const steps: {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    number: "01",
    title: "Connect Google Search Console",
    description:
      "Authorize IndexPilot securely and choose the Search Console properties you want to manage.",
    icon: Cable,
  },
  {
    number: "02",
    title: "Inspect important URLs",
    description:
      "Run URL inspections and review Google's indexing verdict, crawl information, canonical selection, and robots status.",
    icon: ScanSearch,
  },
  {
    number: "03",
    title: "Track and take action",
    description:
      "Review inspection history, identify recurring indexing issues, and reinspect URLs after making changes.",
    icon: ListChecks,
  },
];

export function HomepageHowItWorks() {
  return (
    <section className="border-t border-border px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto grid max-w-7xl gap-10">
        <div className="grid max-w-3xl gap-4">
          <p className="text-sm font-medium text-muted-foreground">
            Simple by design
          </p>
          <h2 className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
            From Search Console connection to indexing clarity in three steps.
          </h2>
          <p className="text-lg leading-8 text-muted-foreground">
            Connect your Google account, inspect the URLs that matter, and use
            clear indexing data to decide what needs attention next.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <article
                key={step.number}
                className="relative grid gap-5 rounded-xl border border-border bg-background p-5"
                data-workflow-step
              >
                {index < steps.length - 1 ? (
                  <div
                    className="absolute left-[calc(100%-0.5rem)] top-10 hidden h-px w-4 bg-border lg:block"
                    aria-hidden="true"
                  />
                ) : null}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-muted-foreground">
                    {step.number}
                  </span>
                  <div className="grid size-10 place-items-center rounded-lg border border-border bg-muted text-foreground">
                    <Icon
                      className="size-5"
                      aria-hidden="true"
                      data-workflow-icon
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {step.description}
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
