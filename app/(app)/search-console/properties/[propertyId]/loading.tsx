import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function DetailRowSkeleton() {
  return (
    <div className="grid gap-2 rounded-lg border border-border bg-muted/50 p-3">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

export default function SearchConsolePropertyDetailsLoading() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-live="polite">
      <p className="sr-only" role="status">
        Loading property details...
      </p>

      <div className="grid gap-3">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-8 w-full max-w-xl" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 12 }, (_, index) => (
              <DetailRowSkeleton key={index} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
