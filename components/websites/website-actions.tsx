"use client";

import { useTransition } from "react";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  archiveWebsite,
  deleteWebsite,
  restoreWebsite,
} from "@/app/(app)/websites/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type WebsiteActionsProps = {
  id: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  deleteRedirectTo?: string;
};

export function WebsiteActions({
  id,
  status,
  deleteRedirectTo,
}: WebsiteActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function runAction(action: "archive" | "restore" | "delete") {
    startTransition(async () => {
      const result =
        action === "archive"
          ? await archiveWebsite(id)
          : action === "restore"
            ? await restoreWebsite(id)
            : await deleteWebsite(id);

      if (result.ok) {
        toast.success(result.message);

        if (action === "delete" && deleteRedirectTo) {
          router.push(deleteRedirectTo);
        } else {
          router.refresh();
        }

        return;
      }

      toast.error(result.message);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "ARCHIVED" ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => runAction("restore")}
          disabled={isPending}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Restore
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => runAction("archive")}
          disabled={isPending}
        >
          <Archive className="size-4" aria-hidden="true" />
          Archive
        </Button>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="destructive" disabled={isPending}>
            <Trash2 className="size-4" aria-hidden="true" />
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this website?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the website from IndexPilot. Archive it
              instead if you want to keep the record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={() => runAction("delete")}
            >
              Delete Website
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
