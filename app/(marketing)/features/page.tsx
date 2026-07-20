import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features | IndexPilot",
  description: "A preview of IndexPilot features for indexing visibility.",
};

export default function FeaturesPage() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto grid max-w-3xl gap-3">
        <h1 className="text-4xl font-semibold text-foreground">Features</h1>
        <p className="text-lg leading-8 text-muted-foreground">
          The IndexPilot features page is under development and will outline the
          tools for indexing visibility, sitemaps, and URL inspections.
        </p>
      </div>
    </section>
  );
}
