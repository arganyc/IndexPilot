"use client";

import { useTransition } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function CopyUrlButton({ url }: { url: string }) {
  const [isPending, startTransition] = useTransition();

  function copyUrl() {
    startTransition(async () => {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("URL copied.");
      } catch {
        toast.error("URL could not be copied.");
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={copyUrl}
      disabled={isPending}
      title="Copy URL"
    >
      <Copy className="size-4" aria-hidden="true" />
      Copy
    </Button>
  );
}
