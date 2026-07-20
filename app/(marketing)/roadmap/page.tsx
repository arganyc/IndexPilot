import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Roadmap | IndexPilot",
  description: "A placeholder roadmap for upcoming IndexPilot capabilities.",
};

export default function RoadmapPage() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto grid max-w-3xl gap-3">
        <h1 className="text-4xl font-semibold text-foreground">Roadmap</h1>
        <p className="text-lg leading-8 text-muted-foreground">
          The IndexPilot roadmap page is under development and will summarize
          upcoming product milestones.
        </p>
      </div>
    </section>
  );
}
