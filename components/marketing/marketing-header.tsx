"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { BrandMark } from "@/components/marketing/brand-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const marketingNavigation = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Roadmap", href: "/roadmap" },
  { label: "Contact", href: "/contact" },
] as const;

export function getNextMobileMenuOpenState(current: boolean) {
  return !current;
}

export function MarketingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <BrandMark />

        <nav
          className="hidden items-center gap-6 md:flex"
          aria-label="Marketing navigation"
        >
          {marketingNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Start Free</Link>
          </Button>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="md:hidden"
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileMenuOpen}
          aria-controls="marketing-mobile-navigation"
          onClick={() => setMobileMenuOpen(getNextMobileMenuOpenState)}
        >
          {mobileMenuOpen ? (
            <X className="size-4" aria-hidden="true" />
          ) : (
            <Menu className="size-4" aria-hidden="true" />
          )}
        </Button>
      </div>

      {mobileMenuOpen ? (
        <div
          id="marketing-mobile-navigation"
          className="border-t border-border bg-background px-4 py-4 md:hidden"
        >
          <nav className="grid gap-1" aria-label="Mobile marketing navigation">
            {marketingNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 grid gap-2 border-t border-border pt-4">
            <Button asChild variant="outline" className={cn("w-full")}>
              <Link href="/login" onClick={closeMobileMenu}>
                Log in
              </Link>
            </Button>
            <Button asChild className="w-full">
              <Link href="/signup" onClick={closeMobileMenu}>
                Start Free
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
