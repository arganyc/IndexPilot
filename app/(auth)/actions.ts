"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAppOrigin } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/server";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function redirectWithError(path: "/login" | "/signup", error: string): never {
  redirect(`${path}?error=${encodeURIComponent(error)}`);
}

export async function loginAction(formData: FormData) {
  const email = getFormValue(formData, "email").toLowerCase();
  const password = getFormValue(formData, "password");

  if (!email || !password) {
    redirectWithError("/login", "missing_fields");
  }

  let authFailed = false;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    authFailed = Boolean(error);
  } catch {
    redirectWithError("/login", "configuration");
  }

  if (authFailed) {
    redirectWithError("/login", "invalid_credentials");
  }

  redirect("/dashboard");
}

export async function signupAction(formData: FormData) {
  const email = getFormValue(formData, "email").toLowerCase();
  const password = getFormValue(formData, "password");

  if (!email || password.length < 8) {
    redirectWithError("/signup", "invalid_fields");
  }

  let signupFailed = false;

  try {
    const requestHeaders = await headers();
    const emailRedirectTo = `${getAppOrigin(
      "https://indexpilot.cloud/signup",
      requestHeaders
    )}/dashboard`;
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
      },
    });

    signupFailed = Boolean(error);
  } catch {
    redirectWithError("/signup", "configuration");
  }

  if (signupFailed) {
    redirectWithError("/signup", "signup_failed");
  }

  redirect("/login?signup=check-email");
}
