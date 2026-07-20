"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  createSitemap,
  type SitemapActionResult,
} from "@/app/(app)/websites/[id]/sitemaps/actions";
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
import {
  sitemapFormSchema,
  sitemapTypeLabels,
  sitemapTypeValues,
  type SitemapFormInput,
} from "@/lib/sitemaps/validation";

type SitemapOption = {
  id: string;
  url: string;
};

type SitemapFormProps = {
  websiteId: string;
  parentOptions?: SitemapOption[];
};

const emptyValues: SitemapFormInput = {
  url: "",
  type: "UNKNOWN",
  parentSitemapId: "",
};

function applyActionResult(
  result: SitemapActionResult,
  form: ReturnType<typeof useForm<SitemapFormInput>>,
  router: ReturnType<typeof useRouter>
) {
  if (result.fieldErrors) {
    Object.entries(result.fieldErrors).forEach(([field, message]) => {
      if (message) {
        form.setError(field as keyof SitemapFormInput, { message });
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

export function SitemapForm({ websiteId, parentOptions = [] }: SitemapFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<SitemapFormInput>({
    resolver: zodResolver(sitemapFormSchema),
    defaultValues: emptyValues,
  });

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = form;

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await createSitemap(websiteId, values);

      applyActionResult(result, form, router);
    });
  });

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div>
        <h3 className="text-base font-semibold text-slate-950">
          Add Sitemap Manually
        </h3>
        <p className="text-sm text-slate-500">
          Save a known sitemap URL without fetching it.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_180px_220px_auto]">
        <div className="grid gap-2">
          <Label htmlFor="sitemap-url">Sitemap URL</Label>
          <Input
            id="sitemap-url"
            aria-invalid={Boolean(errors.url)}
            placeholder="https://example.com/sitemap.xml"
            {...register("url")}
          />
          {errors.url ? (
            <p className="text-sm text-red-600">{errors.url.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="sitemap-type">Type</Label>
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <Select
                value={field.value || "__none"}
                onValueChange={(value) =>
                  field.onChange(value === "__none" ? "" : value)
                }
              >
                <SelectTrigger id="sitemap-type" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {sitemapTypeValues.map((type) => (
                    <SelectItem key={type} value={type}>
                      {sitemapTypeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.type ? (
            <p className="text-sm text-red-600">{errors.type.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="parent-sitemap">Parent sitemap</Label>
          <Controller
            control={form.control}
            name="parentSitemapId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="parent-sitemap" className="w-full">
                  <SelectValue placeholder="No parent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No parent</SelectItem>
                  {parentOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.url}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.parentSitemapId ? (
            <p className="text-sm text-red-600">
              {errors.parentSitemapId.message}
            </p>
          ) : null}
        </div>

        <div className="flex items-end">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Saving..." : "Add Sitemap"}
          </Button>
        </div>
      </div>
    </form>
  );
}
