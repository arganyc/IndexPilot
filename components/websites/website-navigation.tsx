import Link from "next/link";

import { Button } from "@/components/ui/button";

type WebsiteNavigationItem = "details" | "sitemaps" | "urls" | "inspections";

type WebsiteNavigationProps = {
  websiteId: string;
  active: WebsiteNavigationItem;
  sitemapCount?: number;
  importedUrlCount?: number;
};

function navigationItems({
  websiteId,
  sitemapCount,
  importedUrlCount,
}: Omit<WebsiteNavigationProps, "active">) {
  return [
    {
      id: "details" as const,
      href: `/websites/${websiteId}`,
      label: "Website Details",
    },
    {
      id: "sitemaps" as const,
      href: `/websites/${websiteId}/sitemaps`,
      label:
        sitemapCount === undefined ? "Sitemaps" : `Sitemaps (${sitemapCount})`,
    },
    {
      id: "urls" as const,
      href: `/websites/${websiteId}/urls`,
      label:
        importedUrlCount === undefined
          ? "URL Inventory"
          : `URL Inventory (${importedUrlCount})`,
    },
    {
      id: "inspections" as const,
      href: `/websites/${websiteId}/inspections`,
      label: "Inspection History",
    },
  ];
}

export function WebsiteNavigation({
  websiteId,
  active,
  sitemapCount,
  importedUrlCount,
}: WebsiteNavigationProps) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Website navigation">
      {navigationItems({ websiteId, sitemapCount, importedUrlCount }).map((item) => (
        <Button
          key={item.id}
          asChild
          variant={item.id === active ? "default" : "outline"}
        >
          <Link
            href={item.href}
            aria-current={item.id === active ? "page" : undefined}
          >
            {item.label}
          </Link>
        </Button>
      ))}
    </nav>
  );
}
