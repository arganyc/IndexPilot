"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentOrganizationContext } from "@/lib/auth/organization";
import {
  createPrismaGoogleAccountRepository,
  refreshPropertiesForAccount,
} from "@/lib/google/accounts";
import { prisma } from "@/lib/prisma";

export type GoogleSettingsActionResult = {
  ok: boolean;
  message: string;
};

const accountActionSchema = z.object({
  accountId: z.string().min(1),
});

export async function refreshGoogleProperties(input: {
  accountId: string;
}): Promise<GoogleSettingsActionResult> {
  const parsed = accountActionSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: "Invalid Google account request." };
  }

  try {
    const { organizationId } = await getCurrentOrganizationContext();
    const result = await refreshPropertiesForAccount({
      organizationId,
      accountId: parsed.data.accountId,
      repository: createPrismaGoogleAccountRepository(prisma),
    });

    revalidatePath("/settings/google");

    return {
      ok: true,
      message: `Properties refreshed. ${result.created} created, ${result.updated} updated, ${result.markedMissing} marked missing, ${result.restored} restored.`,
    };
  } catch {
    return {
      ok: false,
      message: "Google properties could not be refreshed.",
    };
  }
}

export async function disconnectGoogleAccount(input: {
  accountId: string;
}): Promise<GoogleSettingsActionResult> {
  const parsed = accountActionSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: "Invalid Google account request." };
  }

  try {
    const { organizationId } = await getCurrentOrganizationContext();
    const deleted = await createPrismaGoogleAccountRepository(
      prisma
    ).disconnectAccount({
      organizationId,
      accountId: parsed.data.accountId,
    });

    revalidatePath("/settings/google");

    return deleted
      ? { ok: true, message: "Google account disconnected." }
      : { ok: false, message: "Google account was not found." };
  } catch {
    return { ok: false, message: "Google account could not be disconnected." };
  }
}
