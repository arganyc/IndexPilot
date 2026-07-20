import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | IndexPilot",
  description: "Placeholder terms of service information for IndexPilot.",
};

export default function TermsPage() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto grid max-w-3xl gap-3">
        <h1 className="text-4xl font-semibold text-foreground">
          Terms of Service
        </h1>
        <p className="text-lg leading-8 text-muted-foreground">
          The IndexPilot terms of service are under development. Full terms will
          be added before launch.
        </p>
      </div>
    </section>
  );
}
