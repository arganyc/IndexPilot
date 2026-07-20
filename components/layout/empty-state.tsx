import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <section
      aria-labelledby="empty-state-title"
      className={cn(
        "grid min-h-72 place-items-center rounded-xl border border-dashed border-border bg-card p-6 text-center sm:p-8",
        className
      )}
    >
      <div className="grid max-w-md justify-items-center gap-4">
        {Icon ? (
          <div className="grid size-11 place-items-center rounded-lg border border-border bg-muted text-muted-foreground">
            <Icon className="size-5" aria-hidden="true" />
          </div>
        ) : null}
        <div className="grid gap-2">
          <h2
            id="empty-state-title"
            className="text-lg font-semibold text-foreground"
          >
            {title}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        {primaryAction || secondaryAction ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            {primaryAction}
            {secondaryAction}
          </div>
        ) : null}
      </div>
    </section>
  );
}
