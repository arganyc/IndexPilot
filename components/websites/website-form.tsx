"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  createWebsite,
  updateWebsite,
  type WebsiteActionResult,
} from "@/app/(app)/websites/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  platformLabels,
  platformValues,
  priorityLabels,
  priorityValues,
  statusLabels,
  statusValues,
  type WebsiteFormInput,
  websiteFormSchema,
} from "@/lib/websites/validation";

type WebsiteFormProps = {
  mode: "create" | "edit";
  websiteId?: string;
  defaultValues?: WebsiteFormInput;
};

const emptyValues: WebsiteFormInput = {
  name: "",
  domain: "",
  platform: "OTHER",
  priority: "MEDIUM",
  status: "ACTIVE",
  notes: "",
};

function applyActionResult(
  result: WebsiteActionResult,
  form: ReturnType<typeof useForm<WebsiteFormInput>>,
  router: ReturnType<typeof useRouter>
) {
  if (result.fieldErrors) {
    Object.entries(result.fieldErrors).forEach(([field, message]) => {
      if (message) {
        form.setError(field as keyof WebsiteFormInput, { message });
      }
    });
  }

  if (result.ok) {
    toast.success(result.message);

    if (result.redirectTo) {
      router.push(result.redirectTo);
    } else {
      router.refresh();
    }

    return;
  }

  toast.error(result.message);
}

export function WebsiteForm({
  mode,
  websiteId,
  defaultValues,
}: WebsiteFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<WebsiteFormInput>({
    resolver: zodResolver(websiteFormSchema),
    defaultValues: defaultValues ?? emptyValues,
  });

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = form;

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createWebsite(values)
          : await updateWebsite(websiteId as string, values);

      applyActionResult(result, form, router);
    });
  });

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto grid max-w-3xl gap-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="grid gap-1">
        <h2 className="text-lg font-semibold text-slate-950">
          {mode === "create" ? "Add Website" : "Edit Website"}
        </h2>
        <p className="text-sm text-slate-500">
          Domains are normalized before saving.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="name">Website name</Label>
          <Input
            id="name"
            aria-invalid={Boolean(errors.name)}
            placeholder="Washingtonista"
            {...register("name")}
          />
          {errors.name ? (
            <p className="text-sm text-red-600">{errors.name.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="domain">Domain</Label>
          <Input
            id="domain"
            aria-invalid={Boolean(errors.domain)}
            placeholder="https://www.example.com"
            {...register("domain")}
          />
          {errors.domain ? (
            <p className="text-sm text-red-600">{errors.domain.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="platform">Platform</Label>
          <Controller
            control={form.control}
            name="platform"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="platform" className="w-full">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {platformValues.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      {platformLabels[platform]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.platform ? (
            <p className="text-sm text-red-600">{errors.platform.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="priority">Priority</Label>
          <Controller
            control={form.control}
            name="priority"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="priority" className="w-full">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityValues.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priorityLabels[priority]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.priority ? (
            <p className="text-sm text-red-600">{errors.priority.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusValues.map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusLabels[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.status ? (
            <p className="text-sm text-red-600">{errors.status.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            aria-invalid={Boolean(errors.notes)}
            placeholder="Internal notes"
            rows={5}
            {...register("notes")}
          />
          {errors.notes ? (
            <p className="text-sm text-red-600">{errors.notes.message}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Saving..."
            : mode === "create"
              ? "Create Website"
              : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
