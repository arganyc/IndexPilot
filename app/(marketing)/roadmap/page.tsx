import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Roadmap | IndexPilot",
  description:
    "See what IndexPilot supports today and what is planned next for Google indexing management workflows.",
};

const available = [
  "Google Search Console connection",
  "Multi-website management",
  "URL inspection",
  "Inspection details",
  "Inspection history",
  "Search and status filtering",
  "Secure URL reinspection",
] as const;

const planned = [
  "Bulk URL inspection",
  "Scheduled monitoring",
  "Email alerts",
  "Team collaboration",
  "Client reporting",
  "API access",
] as const;

export default function RoadmapPage() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto grid max-w-7xl gap-10">
        <div className="grid max-w-3xl gap-4">
          <p className="text-sm font-medium text-muted-foreground">
            Product roadmap
          </p>
          <h1 className="text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
            Roadmap for focused indexing management.
          </h1>
          <p className="text-lg leading-8 text-muted-foreground">
            Search Console remains the source of truth. IndexPilot is expanding
            around practical workflows for inspecting URLs, reviewing history,
            and coordinating indexing work across websites.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <RoadmapPanel
            status="Available"
            title="Available now"
            description="Core indexing workflow"
            items={available}
          />
          <RoadmapPanel
            status="Planned"
            title="Coming soon"
            description="Platform expansion"
            items={planned}
            muted
          />
        </div>
      </div>
    </section>
  );
}

function RoadmapPanel({
  status,
  title,
  description,
  items,
  muted = false,
}: {
  status: string;
  title: string;
  description: string;
  items: readonly string[];
  muted?: boolean;
}) {
  return (
    <article
      className={`grid gap-5 rounded-xl border border-border p-6 ${
        muted ? "bg-muted/30" : "bg-background shadow-sm"
      }`}
    >
      <div className="grid gap-3">
        <span className="w-fit rounded-full border border-border bg-background px-3 py-1 text-sm font-medium text-foreground">
          {status}
        </span>
        <div className="grid gap-1">
          <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
          <p className="text-sm font-medium text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <ul className="grid gap-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
            <CheckCircle2
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
