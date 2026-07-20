"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseConfig } from "@/lib/supabase/env";

export function createClient() {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();

  return createBrowserClient(supabaseUrl, supabaseKey);
}
