import Link from "next/link";
import { Compass } from "lucide-react";

import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <Link
      href="/"
      aria-label="IndexPilot home"
      className={cn(
        "inline-flex items-center gap-2 rounded-lg text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
    >
      <span className="grid size-9 place-items-center rounded-lg border border-border bg-background text-foreground">
        <Compass className="size-5" aria-hidden="true" />
      </span>
      <span className="text-base font-semibold tracking-normal">IndexPilot</span>
    </Link>
  );
}
