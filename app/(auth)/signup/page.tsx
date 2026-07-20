import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sign up | IndexPilot",
  description: "Create an IndexPilot account.",
};

export default function SignupPage() {
  return (
    <section className="grid w-full gap-6 rounded-lg border border-border bg-background p-6 shadow-sm">
      <div className="grid gap-2 text-center">
        <h1 className="text-3xl font-semibold text-foreground">
          Create your IndexPilot account
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Start preparing your workspace for indexing visibility and technical
          SEO workflows.
        </p>
      </div>
      <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
        Signup UI will be added later.
      </div>
      <div className="grid gap-3 text-center text-sm">
        <p className="text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline">
            Log in
          </Link>
        </p>
        <Button asChild variant="outline">
          <Link href="/">Back to homepage</Link>
        </Button>
      </div>
    </section>
  );
}
