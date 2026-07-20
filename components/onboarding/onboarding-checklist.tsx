import Link from "next/link";
import { CheckCircle2, Circle, CircleDot, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  OnboardingChecklistItem,
  OnboardingProgress,
} from "@/components/onboarding/onboarding-model";
import { cn } from "@/lib/utils";

type OnboardingChecklistProps = {
  heading: string;
  description: string;
  items: OnboardingChecklistItem[];
  progress: OnboardingProgress;
};

export type OnboardingCompletedStateProps = {
  eyebrow: string;
  heading: string;
  description: string;
  primaryAction: {
    label: string;
    destination: string;
  };
  secondaryAction: {
    label: string;
    destination: string;
  };
  onDismiss?: () => void;
};

function StepStatusIcon({ item }: { item: OnboardingChecklistItem }) {
  if (item.completed) {
    return (
      <CheckCircle2
        className="size-5 text-primary"
        aria-hidden="true"
      />
    );
  }

  if (item.current) {
    return <CircleDot className="size-5 text-foreground" aria-hidden="true" />;
  }

  return <Circle className="size-5 text-muted-foreground" aria-hidden="true" />;
}

function stepStatusLabel(item: OnboardingChecklistItem) {
  if (item.completed) {
    return "Completed";
  }

  if (item.current) {
    return "Current step";
  }

  return "Not started";
}

export function OnboardingChecklist({
  heading,
  description,
  items,
  progress,
}: OnboardingChecklistProps) {
  return (
    <section aria-labelledby="onboarding-heading">
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="grid gap-1">
              <CardTitle>
                <h2 id="onboarding-heading">{heading}</h2>
              </CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </div>
            <p className="text-sm font-medium text-foreground">
              {progress.percent}% complete
            </p>
          </div>
          <div
            aria-label="Onboarding progress"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progress.percent}
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3">
            {items.map((item, index) => (
              <li
                key={item.id}
                className={cn(
                  "grid gap-3 rounded-lg border border-border bg-background p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center",
                  item.current && "bg-muted/40"
                )}
              >
                <div className="flex items-start gap-3 sm:contents">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">
                      {index + 1}
                    </span>
                    <StepStatusIcon item={item} />
                  </div>
                  <div className="grid min-w-0 gap-1">
                    <h3 className="text-base font-semibold leading-snug text-foreground">
                      {item.title}
                    </h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">
                      {stepStatusLabel(item)}
                    </p>
                  </div>
                </div>
                {item.actionLabel && item.destination && !item.completed ? (
                  <Button
                    asChild
                    className="w-full sm:w-auto"
                    variant={item.current ? "default" : "outline"}
                  >
                    <Link href={item.destination}>{item.actionLabel}</Link>
                  </Button>
                ) : null}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </section>
  );
}

export function OnboardingCompletedState({
  eyebrow,
  heading,
  description,
  primaryAction,
  secondaryAction,
  onDismiss,
}: OnboardingCompletedStateProps) {
  return (
    <section aria-labelledby="onboarding-complete-heading">
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-5" aria-hidden="true" />
            </div>
            <div className="grid gap-1">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                {eyebrow}
              </p>
              <h2
                id="onboarding-complete-heading"
                className="text-lg font-semibold leading-snug text-foreground"
              >
                {heading}
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button asChild className="w-full sm:w-auto">
              <Link href={primaryAction.destination}>{primaryAction.label}</Link>
            </Button>
            <Button asChild className="w-full sm:w-auto" variant="outline">
              <Link href={secondaryAction.destination}>
                {secondaryAction.label}
              </Link>
            </Button>
            {onDismiss ? (
              <Button
                aria-label="Dismiss setup complete message"
                className="self-start sm:self-auto"
                onClick={onDismiss}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
