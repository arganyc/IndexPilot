"use client";

import { useTransition } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  disconnectGoogleAccount,
  refreshGoogleProperties,
} from "@/app/(app)/settings/google/actions";
import { Button } from "@/components/ui/button";

export function GoogleAccountActions({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [isDisconnecting, startDisconnect] = useTransition();

  function onRefresh() {
    startRefresh(async () => {
      const result = await refreshGoogleProperties({ accountId });

      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }

      router.refresh();
    });
  }

  function onDisconnect() {
    if (!window.confirm("Disconnect this Google account?")) {
      return;
    }

    startDisconnect(async () => {
      const result = await disconnectGoogleAccount({ accountId });

      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }

      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={onRefresh}
        disabled={isRefreshing || isDisconnecting}
      >
        <RefreshCw className="size-4" aria-hidden="true" />
        {isRefreshing ? "Refreshing..." : "Refresh Properties"}
      </Button>
      <Button
        type="button"
        variant="destructive"
        onClick={onDisconnect}
        disabled={isRefreshing || isDisconnecting}
      >
        <Trash2 className="size-4" aria-hidden="true" />
        {isDisconnecting ? "Disconnecting..." : "Disconnect"}
      </Button>
    </div>
  );
}
