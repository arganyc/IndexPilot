import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function SectionSkeleton({
  rows = 1,
  columns = 1,
}: {
  rows?: number;
  columns?: 1 | 2 | 3;
}) {
  const columnClass =
    columns === 3
      ? "md:grid-cols-3"
      : columns === 2
        ? "md:grid-cols-2"
        : "";

  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-44" />
      </CardHeader>
      <CardContent>
        <div className={`grid gap-3 ${columnClass}`}>
          {Array.from({ length: rows }, (_, index) => (
            <div
              key={index}
              className="grid gap-2 rounded-lg border border-border bg-muted/50 p-3"
            >
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function InspectionDetailsLoading() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-live="polite">
      <p className="sr-only" role="status">
        Loading inspection details...
      </p>

      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-sm lg:flex-row lg:items-start lg:justify-between">
        <div className="grid min-w-0 flex-1 gap-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-full max-w-2xl" />
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-48" />
        </div>
      </div>

      <SectionSkeleton />
      <SectionSkeleton rows={4} columns={2} />
      <SectionSkeleton rows={2} columns={2} />
      <SectionSkeleton />
      <SectionSkeleton rows={3} columns={3} />
    </div>
  );
}
