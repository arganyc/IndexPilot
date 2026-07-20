"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateSitemapType } from "@/app/(app)/websites/[id]/sitemaps/actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  sitemapTypeLabels,
  sitemapTypeValues,
  type SitemapTypeFormInput,
} from "@/lib/sitemaps/validation";

type SitemapTypeFormProps = {
  websiteId: string;
  sitemapId: string;
  defaultType: SitemapTypeFormInput["type"];
};

export function SitemapTypeForm({
  websiteId,
  sitemapId,
  defaultType,
}: SitemapTypeFormProps) {
  const router = useRouter();
  const [type, setType] = useState(defaultType);
  const [isPending, startTransition] = useTransition();

  function onSubmit() {
    startTransition(async () => {
      const result = await updateSitemapType(websiteId, sitemapId, { type });

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Select value={type} onValueChange={(value) => setType(value as typeof type)}>
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Select type" />
        </SelectTrigger>
        <SelectContent>
          {sitemapTypeValues.map((value) => (
            <SelectItem key={value} value={value}>
              {sitemapTypeLabels[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" onClick={onSubmit} disabled={isPending}>
        {isPending ? "Saving..." : "Save Type"}
      </Button>
    </div>
  );
}
