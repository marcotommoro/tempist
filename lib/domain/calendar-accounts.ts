/**
 * Calendar accounts domain — gestione token + helper "get valid access token".
 *
 * I token sono cifrati at-rest via lib/utils/encryption (AES-GCM).
 * Il refresh è gestito on-demand: se l'access token è scaduto/sta per scadere,
 * `getValidAccessToken` lo refresha e aggiorna la riga in DB.
 */

import { and, eq, lt } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { CalendarAccount } from "@/lib/db/schema";
import { decrypt, encrypt } from "@/lib/utils/encryption";
import { refreshAccessToken } from "@/lib/integrations/google-calendar";

// Refresha 60s prima della scadenza per safety margin
const REFRESH_MARGIN_MS = 60_000;

export async function listAccountsForUser(opts: {
  userId: string;
  organizationId: string;
}): Promise<CalendarAccount[]> {
  return db.query.calendarAccount.findMany({
    where: and(
      eq(schema.calendarAccount.userId, opts.userId),
      eq(schema.calendarAccount.organizationId, opts.organizationId),
    ),
  });
}

export async function upsertGoogleAccount(opts: {
  organizationId: string;
  userId: string;
  externalAccountId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresInSeconds: number;
}): Promise<CalendarAccount> {
  const expiresAt = new Date(Date.now() + opts.expiresInSeconds * 1000);
  const accessEnc = encrypt(opts.accessToken);
  const refreshEnc = opts.refreshToken ? encrypt(opts.refreshToken) : null;

  // Cerco se esiste già
  const existing = await db.query.calendarAccount.findFirst({
    where: and(
      eq(schema.calendarAccount.userId, opts.userId),
      eq(schema.calendarAccount.provider, "GOOGLE"),
      eq(schema.calendarAccount.externalAccountId, opts.externalAccountId),
    ),
  });

  if (existing) {
    const [updated] = await db
      .update(schema.calendarAccount)
      .set({
        organizationId: opts.organizationId,
        accessTokenEncrypted: accessEnc,
        // Manteniamo il refresh esistente se Google non ne fornisce uno nuovo
        refreshTokenEncrypted: refreshEnc ?? existing.refreshTokenEncrypted,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(schema.calendarAccount.id, existing.id))
      .returning();
    if (!updated) throw new Error("Update calendar account fallito");
    return updated;
  }

  if (!refreshEnc) {
    throw new Error(
      "Primo collegamento senza refresh_token — riavvia il consent flow (prompt=consent)",
    );
  }

  const [created] = await db
    .insert(schema.calendarAccount)
    .values({
      organizationId: opts.organizationId,
      userId: opts.userId,
      provider: "GOOGLE",
      externalAccountId: opts.externalAccountId,
      accessTokenEncrypted: accessEnc,
      refreshTokenEncrypted: refreshEnc,
      expiresAt,
    })
    .returning();
  if (!created) throw new Error("Insert calendar account fallito");
  return created;
}

export async function deleteAccount(opts: {
  accountId: string;
  userId: string;
  organizationId: string;
}): Promise<void> {
  await db
    .delete(schema.calendarAccount)
    .where(
      and(
        eq(schema.calendarAccount.id, opts.accountId),
        eq(schema.calendarAccount.userId, opts.userId),
        eq(schema.calendarAccount.organizationId, opts.organizationId),
      ),
    );
}

/**
 * Ritorna un access token valido per l'account, refreshando se serve.
 * Aggiorna la riga in DB con il nuovo token + expiresAt.
 */
export async function getValidAccessToken(
  account: CalendarAccount,
): Promise<string> {
  const now = Date.now();
  const expiresAt = account.expiresAt?.getTime() ?? 0;
  if (expiresAt - now > REFRESH_MARGIN_MS) {
    return decrypt(account.accessTokenEncrypted);
  }
  // Refresh required
  if (!account.refreshTokenEncrypted) {
    throw new Error(
      "Access token scaduto e refresh_token assente — riconnetti il calendario",
    );
  }
  const refreshToken = decrypt(account.refreshTokenEncrypted);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID/SECRET non configurati");
  }
  const tok = await refreshAccessToken({
    refreshToken,
    clientId,
    clientSecret,
  });
  const newAccess = tok.access_token;
  const newExpires = new Date(Date.now() + tok.expires_in * 1000);
  await db
    .update(schema.calendarAccount)
    .set({
      accessTokenEncrypted: encrypt(newAccess),
      expiresAt: newExpires,
      updatedAt: new Date(),
    })
    .where(eq(schema.calendarAccount.id, account.id));
  return newAccess;
}

/**
 * Ritorna gli account che non sono stati sincronizzati da più di N minuti
 * (per evitare di sincronizzare ad ogni tick se nulla è cambiato).
 */
export async function listAccountsDueForSync(opts: {
  staleMinutes?: number;
}): Promise<CalendarAccount[]> {
  const stale = (opts.staleMinutes ?? 5) * 60_000;
  const threshold = new Date(Date.now() - stale);
  return db.query.calendarAccount.findMany({
    where: lt(schema.calendarAccount.updatedAt, threshold),
  });
}
