/**
 * GET /api/ical/[token] — feed iCal pubblico (read-only).
 *
 * Auth: token random in URL (capability URL). Niente sessione richiesta —
 * il calendario remoto pulla questa URL periodicamente.
 *
 * Sicurezza:
 *  - Token revocabile via /settings (revokedAt setta a not-null → 404).
 *  - 24 byte random hex = 192 bit entropy, brute-force unfeasible.
 *  - Solo dati dell'organizationId associato al token.
 */

import { generateFeedIcs, resolveIcalToken } from "@/lib/domain/ical";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;

  // Permettiamo anche .ics in coda (alcuni client lo richiedono)
  const cleanToken = token.replace(/\.ics$/i, "");

  const resolved = await resolveIcalToken(cleanToken);
  if (!resolved) {
    return new Response("Token non valido o revocato", { status: 404 });
  }

  const ics = await generateFeedIcs({ organizationId: resolved.organizationId });

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="todoist-tracker.ics"',
      // I client tipicamente rispettano un Cache-Control breve
      "Cache-Control": "private, max-age=300",
    },
  });
}
