import type { Metadata } from "next";
import Link from "next/link";

import { loginAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = {
  title: "Log in | IndexPilot",
  description: "Log in to your IndexPilot account.",
};

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    signup?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  configuration:
    "IndexPilot could not reach the authentication service. Please try again shortly.",
  invalid_credentials: "We could not sign you in with that email and password.",
  missing_fields: "Enter your email and password to continue.",
};

export default async function LoginPage({ searchParams }: LoginPageProps = {}) {
  const params = await searchParams;
  const errorMessage = params?.error ? errorMessages[params.error] : null;
  const signupMessage =
    params?.signup === "check-email"
      ? "Account created. Check your email if confirmation is required, then log in."
      : null;

  return (
    <section className="grid w-full gap-6 rounded-lg border border-border bg-background p-6 shadow-sm">
      <div className="grid gap-2 text-center">
        <h1 className="text-3xl font-semibold text-foreground">
          Log in to IndexPilot
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Access your indexing visibility workspace and connected website data.
        </p>
      </div>

      {signupMessage ? (
        <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm leading-6 text-foreground">
          {signupMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm leading-6 text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <form action={loginAction} className="grid gap-4">
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
            autoComplete="current-password"
            required
          />
        </div>
        <Button type="submit" className="w-full">
          Log in
        </Button>
      </form>

      <div className="grid gap-3 text-center text-sm">
        <p className="text-muted-foreground">
          Need an account?{" "}
          <Link href="/signup" className="font-medium text-foreground underline">
            Create one
          </Link>
        </p>
        <Button asChild variant="outline">
          <Link href="/">Back to homepage</Link>
        </Button>
      </div>
    </section>
  );
}
