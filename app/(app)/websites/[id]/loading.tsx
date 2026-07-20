import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function DetailRowSkeleton() {
  return (
    <div className="grid gap-2 rounded-lg border border-border bg-muted/50 p-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

export default function WebsiteDetailsLoading() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-live="polite">
      <p className="sr-only" role="status">
        Loading website details...
      </p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 13 }, (_, index) => (
              <DetailRowSkeleton key={index} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
