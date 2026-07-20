import type { Metadata } from "next";
import Link from "next/link";

import { signupAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = {
  title: "Sign up | IndexPilot",
  description: "Create an IndexPilot account.",
};

type SignupPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  configuration:
    "IndexPilot could not reach the authentication service. Please try again shortly.",
  invalid_fields: "Enter a valid email and a password with at least 8 characters.",
  signup_failed: "We could not create that account. Try again or log in instead.",
};

export default async function SignupPage({ searchParams }: SignupPageProps = {}) {
  const params = await searchParams;
  const errorMessage = params?.error ? errorMessages[params.error] : null;

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

      {errorMessage ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm leading-6 text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <form action={signupAction} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
          <p className="text-xs leading-5 text-muted-foreground">
            Use at least 8 characters.
          </p>
        </div>
        <Button type="submit" className="w-full">
          Create account
        </Button>
      </form>

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
