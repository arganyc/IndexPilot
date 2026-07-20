"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FileSearch,
  Gauge,
  Globe2,
  Link2,
  ListTree,
  Settings,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Gauge },
  { name: "Websites", href: "/websites", icon: Globe2 },
  { name: "URLs", href: "/urls", icon: Link2 },
  { name: "Sitemaps", href: "/sitemaps", icon: ListTree },
  { name: "Inspections", href: "/inspections", icon: FileSearch },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/websites")) {
    return "Websites";
  }

  return navigation.find((item) => item.href === pathname)?.name ?? "IndexPilot";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-card md:flex md:flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-border px-5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-5">IndexPilot</p>
            <p className="text-xs text-muted-foreground">Technical SEO</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Primary">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                  isActive &&
                    "bg-accent text-accent-foreground ring-1 ring-inset ring-border"
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-col md:pl-64">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div>
              <p className="text-xs font-medium text-muted-foreground md:hidden">
                IndexPilot
              </p>
              <h1 className="text-xl font-semibold leading-tight text-foreground sm:text-2xl">
                {pageTitle}
              </h1>
            </div>
            <Badge variant="outline" className="hidden sm:inline-flex">
              Phase 2
            </Badge>
          </div>
          <nav
            className="flex gap-1 overflow-x-auto border-t border-border px-3 py-2 md:hidden"
            aria-label="Mobile primary"
          >
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                    "flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                    isActive && "bg-accent text-accent-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
