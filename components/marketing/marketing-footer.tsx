import Link from "next/link";

import { BrandMark } from "@/components/marketing/brand-mark";

const productLinks = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Roadmap", href: "/roadmap" },
] as const;

const companyLinks = [{ label: "Contact", href: "/contact" }] as const;

const legalLinks = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
] as const;

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {label}
    </Link>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: readonly { label: string; href: string }[];
}) {
  return (
    <div className="grid gap-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <nav className="grid gap-2" aria-label={title}>
        {links.map((link) => (
          <FooterLink key={link.href} href={link.href} label={link.label} />
        ))}
      </nav>
    </div>
  );
}

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="grid max-w-sm gap-3">
            <BrandMark />
            <p className="text-sm leading-6 text-muted-foreground">
              Google indexing visibility for modern websites and SEO teams.
            </p>
          </div>
          <FooterColumn title="Product" links={productLinks} />
          <FooterColumn title="Company" links={companyLinks} />
          <FooterColumn title="Legal" links={legalLinks} />
        </div>
        <div className="border-t border-border pt-6 text-sm text-muted-foreground">
          © {year} IndexPilot. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
