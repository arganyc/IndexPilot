import { Skeleton } from "@/components/ui/skeleton";

function SummarySkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-4 h-8 w-16" />
    </div>
  );
}

export default function SearchConsolePropertiesLoading() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-live="polite">
      <p className="sr-only" role="status">
        Loading Search Console properties...
      </p>

      <div className="grid gap-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-8 w-48" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <SummarySkeleton key={index} />
        ))}
      </div>

      <div className="grid min-h-24 gap-3 rounded-lg border border-border bg-card p-4 shadow-sm xl:grid-cols-[1fr_170px_170px_160px_160px_140px_120px_auto]">
        {Array.from({ length: 7 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
        <div className="flex items-end gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <div className="min-w-[1160px]">
          <div className="grid grid-cols-8 gap-4 border-b border-border bg-muted/50 px-4 py-3">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-3 w-full" />
            ))}
          </div>
          <div className="grid gap-0">
            {Array.from({ length: 8 }, (_, row) => (
              <div
                key={row}
                className="grid grid-cols-8 gap-4 border-b border-border px-4 py-3 last:border-b-0"
              >
                {Array.from({ length: 8 }, (_, column) => (
                  <Skeleton
                    key={column}
                    className={column === 0 ? "h-4 w-56" : "h-4 w-full"}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
