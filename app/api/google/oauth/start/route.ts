import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getCurrentOrganizationContext } from "@/lib/auth/organization";
import {
  buildGoogleOAuthUrl,
  createGoogleOAuthState,
  GOOGLE_OAUTH_STATE_COOKIE,
} from "@/lib/google/oauth";
import { getAppOrigin } from "@/lib/app-url";

export async function GET(request: NextRequest) {
  try {
    await getCurrentOrganizationContext();
    const state = createGoogleOAuthState();
    const response = NextResponse.redirect(buildGoogleOAuthUrl({ state }));

    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.redirect(
      new URL(
        "/settings/google?error=oauth_not_configured",
        getAppOrigin(request.url, request.headers)
      )
    );
  }
}
