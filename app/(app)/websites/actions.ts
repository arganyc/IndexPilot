"use server";

import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { getDuplicateDomainMessage } from "@/lib/websites/duplicates";
import { normalizeDomain } from "@/lib/websites/domain";
import {
  type WebsiteFormInput,
  websiteFormSchema,
} from "@/lib/websites/validation";

export type WebsiteActionResult = {
  ok: boolean;
  message: string;
  websiteId?: string;
  redirectTo?: string;
  fieldErrors?: Partial<Record<keyof WebsiteFormInput, string>>;
};

function toFieldErrors(error: ZodError<WebsiteFormInput>) {
  const flattened = error.flatten().fieldErrors;

  return Object.fromEntries(
    Object.entries(flattened)
      .filter(([, messages]) => messages?.[0])
      .map(([field, messages]) => [field, messages?.[0]])
  ) as WebsiteActionResult["fieldErrors"];
}

async function findWebsiteByNormalizedDomain(normalizedDomain: string) {
  return prisma.website.findUnique({
    where: { normalizedDomain },
    select: { id: true },
  });
}

function revalidateWebsitePaths(id?: string) {
  revalidatePath("/websites");

  if (id) {
    revalidatePath(`/websites/${id}`);
    revalidatePath(`/websites/${id}/edit`);
  }
}

export async function createWebsite(
  input: WebsiteFormInput
): Promise<WebsiteActionResult> {
  const parsed = websiteFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  try {
    const { normalizedDomain, protocol } = normalizeDomain(parsed.data.domain);
    const duplicateMessage = await getDuplicateDomainMessage({
      normalizedDomain,
      findWebsiteByNormalizedDomain,
    });

    if (duplicateMessage) {
      return {
        ok: false,
        message: duplicateMessage,
        fieldErrors: { domain: duplicateMessage },
      };
    }

    const website = await prisma.website.create({
      data: {
        name: parsed.data.name,
        domain: normalizedDomain,
        normalizedDomain,
        protocol,
        platform: parsed.data.platform,
        priority: parsed.data.priority,
        status: parsed.data.status,
        notes: parsed.data.notes || null,
      },
      select: { id: true },
    });

    revalidateWebsitePaths(website.id);

    return {
      ok: true,
      message: "Website created.",
      websiteId: website.id,
      redirectTo: `/websites/${website.id}`,
    };
  } catch {
    return {
      ok: false,
      message: "Website could not be created.",
    };
  }
}

export async function updateWebsite(
  id: string,
  input: WebsiteFormInput
): Promise<WebsiteActionResult> {
  const parsed = websiteFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  try {
    const { normalizedDomain, protocol } = normalizeDomain(parsed.data.domain);
    const duplicateMessage = await getDuplicateDomainMessage({
      normalizedDomain,
      currentWebsiteId: id,
      findWebsiteByNormalizedDomain,
    });

    if (duplicateMessage) {
      return {
        ok: false,
        message: duplicateMessage,
        fieldErrors: { domain: duplicateMessage },
      };
    }

    const website = await prisma.website.update({
      where: { id },
      data: {
        name: parsed.data.name,
        domain: normalizedDomain,
        normalizedDomain,
        protocol,
        platform: parsed.data.platform,
        priority: parsed.data.priority,
        status: parsed.data.status,
        notes: parsed.data.notes || null,
      },
      select: { id: true },
    });

    revalidateWebsitePaths(website.id);

    return {
      ok: true,
      message: "Website updated.",
      websiteId: website.id,
      redirectTo: `/websites/${website.id}`,
    };
  } catch {
    return {
      ok: false,
      message: "Website could not be updated.",
    };
  }
}

export async function archiveWebsite(id: string): Promise<WebsiteActionResult> {
  try {
    const website = await prisma.website.update({
      where: { id },
      data: { status: "ARCHIVED" },
      select: { id: true },
    });

    revalidateWebsitePaths(website.id);

    return {
      ok: true,
      message: "Website archived.",
      websiteId: website.id,
    };
  } catch {
    return {
      ok: false,
      message: "Website could not be archived.",
    };
  }
}

export async function restoreWebsite(id: string): Promise<WebsiteActionResult> {
  try {
    const website = await prisma.website.update({
      where: { id },
      data: { status: "ACTIVE" },
      select: { id: true },
    });

    revalidateWebsitePaths(website.id);

    return {
      ok: true,
      message: "Website restored.",
      websiteId: website.id,
    };
  } catch {
    return {
      ok: false,
      message: "Website could not be restored.",
    };
  }
}

export async function deleteWebsite(id: string): Promise<WebsiteActionResult> {
  try {
    await prisma.website.delete({
      where: { id },
      select: { id: true },
    });

    revalidateWebsitePaths(id);

    return {
      ok: true,
      message: "Website deleted.",
      redirectTo: "/websites",
    };
  } catch {
    return {
      ok: false,
      message: "Website could not be deleted.",
    };
  }
}
