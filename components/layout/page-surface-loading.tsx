import { Skeleton } from "@/components/ui/skeleton";

export function PageSurfaceLoading({ title }: { title: string }) {
  return (
    <section
      aria-label={`${title} content loading`}
      aria-busy="true"
      aria-live="polite"
      className="grid min-h-[calc(100vh-8rem)] gap-6 rounded-xl border border-dashed border-border bg-card p-6"
    >
      <p className="sr-only" role="status">
        Loading {title.toLowerCase()}...
      </p>
      <div className="grid max-w-sm gap-3">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-xl border border-border bg-background p-4"
          >
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ))}
      </div>
    </section>
  );
}
