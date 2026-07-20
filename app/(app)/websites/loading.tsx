import { Skeleton } from "@/components/ui/skeleton";

function WebsiteCardSkeleton() {
  return (
    <div className="grid min-h-64 gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="grid min-w-0 flex-1 gap-2">
          <Skeleton className="h-5 w-3/5" />
          <Skeleton className="h-4 w-2/5" />
        </div>
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="grid gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-8 w-full sm:w-20" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  );
}

export default function WebsitesLoading() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-live="polite">
      <p className="sr-only" role="status">
        Loading websites...
      </p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="grid min-h-24 gap-3 rounded-lg border border-border bg-card p-4 shadow-sm md:grid-cols-[1fr_180px_180px_auto]">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <div className="flex items-end gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <WebsiteCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
