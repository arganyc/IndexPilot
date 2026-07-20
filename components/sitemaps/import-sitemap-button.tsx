"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  importSitemap,
  type ImportSitemapActionResult,
} from "@/app/(app)/websites/[id]/sitemaps/actions";
import { ImportSummary } from "@/components/sitemaps/import-summary";
import { Button } from "@/components/ui/button";

type ImportSitemapButtonProps = {
  websiteId: string;
  sitemapId: string;
};

export function ImportSitemapButton({
  websiteId,
  sitemapId,
}: ImportSitemapButtonProps) {
  const router = useRouter();
  const [result, setResult] = useState<ImportSitemapActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function onImport() {
    startTransition(async () => {
      const nextResult = await importSitemap({ websiteId, sitemapId });
      setResult(nextResult);

      if (nextResult.ok) {
        toast.success(nextResult.message);
      } else {
        toast.error(nextResult.errors[0] ?? nextResult.message);
      }

      router.refresh();
    });
  }

  return (
    <div className="grid gap-3">
      <Button type="button" onClick={onImport} disabled={isPending}>
        <Download className="size-4" aria-hidden="true" />
        {isPending ? "Importing..." : "Import Sitemap"}
      </Button>

      {result ? <ImportSummary result={{ ...result, success: result.ok }} /> : null}
    </div>
  );
}
