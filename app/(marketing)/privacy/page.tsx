import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | IndexPilot",
  description: "Placeholder privacy policy information for IndexPilot.",
};

export default function PrivacyPage() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto grid max-w-3xl gap-3">
        <h1 className="text-4xl font-semibold text-foreground">
          Privacy Policy
        </h1>
        <p className="text-lg leading-8 text-muted-foreground">
          The IndexPilot privacy policy is under development. Full privacy
          details will be added before launch.
        </p>
      </div>
    </section>
  );
}
