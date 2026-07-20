import { Check, Compass, Search } from "lucide-react";

const searchConsoleItems = [
  "Inspect one property at a time",
  "Review the latest URL inspection result",
  "Switch between properties manually",
  "Limited inspection workflow organization",
  "Built as a broad search-performance platform",
] as const;

const indexPilotItems = [
  "Manage multiple websites from one workspace",
  "Keep inspection history over time",
  "Find indexing issues faster",
  "Reinspect important URLs from a focused workflow",
  "Built specifically for indexing operations",
] as const;

function ComparisonColumn({
  title,
  items,
  variant = "default",
}: {
  title: string;
  items: readonly string[];
  variant?: "default" | "emphasis";
}) {
  const Icon = title === "IndexPilot" ? Compass : Search;

  return (
    <article
      className={
        variant === "emphasis"
          ? "grid gap-5 rounded-xl border border-foreground/15 bg-muted/50 p-5"
          : "grid gap-5 rounded-xl border border-border bg-background p-5"
      }
      data-comparison-column
    >
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-lg border border-border bg-background text-foreground">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>
      <ul className="grid gap-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
            <Check
              className="mt-1 size-4 shrink-0 text-foreground"
              aria-hidden="true"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function HomepageComparison() {
  return (
    <section className="border-t border-border px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto grid max-w-7xl gap-10">
        <div className="grid max-w-3xl gap-4">
          <p className="text-sm font-medium text-muted-foreground">
            Built for a faster workflow
          </p>
          <h2 className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
            Google Search Console shows the data. IndexPilot helps you manage it.
          </h2>
          <p className="text-lg leading-8 text-muted-foreground">
            Search Console remains the source of truth. IndexPilot gives SEO
            teams a clearer workflow for inspecting URLs, reviewing history, and
            managing multiple websites from one place.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ComparisonColumn
            title="Google Search Console"
            items={searchConsoleItems}
          />
          <ComparisonColumn
            title="IndexPilot"
            items={indexPilotItems}
            variant="emphasis"
          />
        </div>
      </div>
    </section>
  );
}
