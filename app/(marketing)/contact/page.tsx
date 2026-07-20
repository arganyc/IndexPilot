import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | IndexPilot",
  description: "Placeholder contact information for IndexPilot.",
};

export default function ContactPage() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto grid max-w-3xl gap-3">
        <h1 className="text-4xl font-semibold text-foreground">Contact</h1>
        <p className="text-lg leading-8 text-muted-foreground">
          The IndexPilot contact page is under development and will include the
          best way to reach the team.
        </p>
      </div>
    </section>
  );
}
