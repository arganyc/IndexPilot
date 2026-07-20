import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing | IndexPilot",
  description: "Placeholder pricing information for IndexPilot.",
};

export default function PricingPage() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto grid max-w-3xl gap-3">
        <h1 className="text-4xl font-semibold text-foreground">Pricing</h1>
        <p className="text-lg leading-8 text-muted-foreground">
          The IndexPilot pricing page is under development and will share plan
          details when they are ready.
        </p>
      </div>
    </section>
  );
}
