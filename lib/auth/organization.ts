import "server-only";

import { createClient } from "@/lib/supabase/server";

export type CurrentOrganizationContext = {
  userId: string;
  organizationId: string;
};

export async function getCurrentOrganizationContext(): Promise<CurrentOrganizationContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Authentication is required.");
  }

  return {
    userId: user.id,
    organizationId: user.id,
  };
}
