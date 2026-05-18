/**
 * GET /api/integrations/google-calendar/callback?code=...&state=...
 *
 * Scambia code → tokens, fetch userinfo, upsert CalendarAccount.
 * Redirect a /settings con flag success/error.
 */

import { NextResponse } from "next/server";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import {
  exchangeCodeForTokens,
  fetchUserInfo,
} from "@/lib/integrations/google-calendar";
import { upsertGoogleAccount } from "@/lib/domain/calendar-accounts";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const { user, organizationId } = await requireActiveOrganization();

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/settings?gcal_error=${encodeURIComponent(errorParam)}`, url),
    );
  }
  if (!code || !stateParam) {
    return NextResponse.redirect(new URL("/settings?gcal_error=invalid", url));
  }

  let state: { u: string; o: string };
  try {
    state = JSON.parse(Buffer.from(stateParam, "base64url").toString("utf8"));
  } catch {
    return NextResponse.redirect(new URL("/settings?gcal_error=state", url));
  }

  if (state.u !== user.id || state.o !== organizationId) {
    return NextResponse.redirect(
      new URL("/settings?gcal_error=session_mismatch", url),
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/settings?gcal_error=missing_env", url));
  }

  const redirectUri = `${url.protocol}//${url.host}/api/integrations/google-calendar/callback`;

  try {
    const tok = await exchangeCodeForTokens({
      code,
      clientId,
      clientSecret,
      redirectUri,
    });
    const info = await fetchUserInfo(tok.access_token);
    await upsertGoogleAccount({
      organizationId,
      userId: user.id,
      externalAccountId: info.sub,
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token ?? null,
      expiresInSeconds: tok.expires_in,
    });
    return NextResponse.redirect(new URL("/settings?gcal_connected=1", url));
  } catch (err) {
    console.error("[gcal.callback]", err);
    return NextResponse.redirect(
      new URL(
        `/settings?gcal_error=${encodeURIComponent((err as Error).message)}`,
        url,
      ),
    );
  }
}
