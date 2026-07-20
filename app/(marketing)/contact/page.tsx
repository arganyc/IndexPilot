import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Contact | IndexPilot",
  description:
    "Contact IndexPilot for launch access, product questions, and Google indexing management support.",
};

export default function ContactPage() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div className="grid gap-4">
          <p className="text-sm font-medium text-muted-foreground">
            Contact IndexPilot
          </p>
          <h1 className="text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
            Questions about indexing workflows?
          </h1>
          <p className="text-lg leading-8 text-muted-foreground">
            Reach out for launch access, product questions, or help deciding
            whether IndexPilot fits your Search Console workflow.
          </p>
        </div>

        <div className="grid gap-5 rounded-xl border border-border bg-background p-6 shadow-sm">
          <Mail className="size-5 text-foreground" aria-hidden="true" />
          <div className="grid gap-2">
            <h2 className="text-2xl font-semibold text-foreground">
              Email the team
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Send a short note with your website, team size, and the indexing
              workflow you want to improve.
            </p>
          </div>
          <Button asChild className="w-fit">
            <Link href="mailto:hello@indexpilot.cloud">hello@indexpilot.cloud</Link>
          </Button>
          <p className="text-sm leading-6 text-muted-foreground">
            IndexPilot cannot force Google to index a page, but it can help you
            organize inspections and understand Google&apos;s reported status.
          </p>
        </div>
      </div>
    </section>
  );
}
