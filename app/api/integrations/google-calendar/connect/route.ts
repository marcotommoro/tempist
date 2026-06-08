/**
 * GET /api/integrations/google-calendar/connect
 *
 * Avvia il flusso OAuth Google per Calendar. Redirect a Google consent screen.
 * Lo `state` è la session.activeOrganizationId (per associare l'account al workspace).
 */

import { redirect } from "next/navigation";

import { requireActiveOrganization } from "@/lib/auth/workspace";
import {
  buildAuthorizeUrl,
  resolveCalendarRedirectUri,
} from "@/lib/integrations/google-calendar";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const { user, organizationId } = await requireActiveOrganization();

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return new Response(
      "GOOGLE_CLIENT_ID non configurato sul server. Imposta le env vars e riavvia.",
      { status: 500 },
    );
  }

  // redirect_uri dal base URL configurato (NON da req.url): deve essere identico
  // a quello usato nel callback e registrato su Google Cloud Console.
  const redirectUri = resolveCalendarRedirectUri();

  // state = userId|orgId — il callback verifica che l'org sia ancora attiva
  const state = Buffer.from(
    JSON.stringify({ u: user.id, o: organizationId }),
  ).toString("base64url");

  const authUrl = buildAuthorizeUrl({ clientId, redirectUri, state });
  redirect(authUrl);
}
