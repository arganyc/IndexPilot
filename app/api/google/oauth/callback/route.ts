import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { getCurrentOrganizationContext } from "@/lib/auth/organization";
import { prisma } from "@/lib/prisma";
import {
  connectGoogleAccount,
  createPrismaGoogleAccountRepository,
} from "@/lib/google/accounts";
import {
  exchangeGoogleOAuthCode,
  fetchGoogleUserInfo,
  fetchSearchConsoleSites,
  GOOGLE_OAUTH_STATE_COOKIE,
} from "@/lib/google/oauth";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  const redirectUrl = new URL("/settings/google", url.origin);

  cookieStore.delete(GOOGLE_OAUTH_STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    redirectUrl.searchParams.set("error", "invalid_oauth_state");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const { organizationId } = await getCurrentOrganizationContext();
    const tokens = await exchangeGoogleOAuthCode({ code });
    const userInfo = await fetchGoogleUserInfo({
      accessToken: tokens.access_token,
    });
    const sites = await fetchSearchConsoleSites({
      accessToken: tokens.access_token,
    });
    const result = await connectGoogleAccount({
      organizationId,
      tokens,
      userInfo,
      sites,
      repository: createPrismaGoogleAccountRepository(prisma),
    });

    redirectUrl.searchParams.set("connected", result.email);
    redirectUrl.searchParams.set(
      "properties",
      String(result.propertySync.discovered)
    );
    return NextResponse.redirect(redirectUrl);
  } catch {
    redirectUrl.searchParams.set("error", "google_connection_failed");
    return NextResponse.redirect(redirectUrl);
  }
}
