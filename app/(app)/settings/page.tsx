import Link from "next/link";
import { Search } from "lucide-react";

import { PageSurface } from "@/components/layout/page-surface";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="grid gap-6">
      <PageSurface title="Settings" />
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              Google Search Console
            </h2>
            <p className="text-sm text-slate-500">
              Connect Google accounts and sync Search Console properties.
            </p>
          </div>
          <Button asChild>
            <Link href="/settings/google">
              <Search className="size-4" aria-hidden="true" />
              Manage Google
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
