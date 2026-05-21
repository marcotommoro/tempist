/**
 * iCal feed domain — token management + ICS generation.
 */

import { randomBytes } from "node:crypto";

import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { IcalToken } from "@/lib/db/schema";
import { htmlToText } from "@/lib/utils/html";
import { buildIcs } from "@/lib/utils/ics";

function generateToken(): string {
  return randomBytes(24).toString("hex"); // 48 caratteri hex
}

export async function listActiveTokens(opts: {
  userId: string;
  organizationId: string;
}): Promise<IcalToken[]> {
  return db.query.icalToken.findMany({
    where: and(
      eq(schema.icalToken.userId, opts.userId),
      eq(schema.icalToken.organizationId, opts.organizationId),
      isNull(schema.icalToken.revokedAt),
    ),
    orderBy: [asc(schema.icalToken.createdAt)],
  });
}

export async function createIcalToken(opts: {
  userId: string;
  organizationId: string;
}): Promise<IcalToken> {
  const [created] = await db
    .insert(schema.icalToken)
    .values({
      userId: opts.userId,
      organizationId: opts.organizationId,
      token: generateToken(),
    })
    .returning();
  if (!created) throw new Error("Insert ical token fallito");
  return created;
}

export async function revokeIcalToken(opts: {
  tokenId: string;
  userId: string;
  organizationId: string;
}): Promise<void> {
  await db
    .update(schema.icalToken)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(schema.icalToken.id, opts.tokenId),
        eq(schema.icalToken.userId, opts.userId),
        eq(schema.icalToken.organizationId, opts.organizationId),
        isNull(schema.icalToken.revokedAt),
      ),
    );
}

/**
 * Risolve un token al feed: ritorna {userId, organizationId} se valido e non revoked.
 */
export async function resolveIcalToken(
  token: string,
): Promise<{ userId: string; organizationId: string } | null> {
  const found = await db.query.icalToken.findFirst({
    where: and(
      eq(schema.icalToken.token, token),
      isNull(schema.icalToken.revokedAt),
    ),
  });
  if (!found) return null;
  return { userId: found.userId, organizationId: found.organizationId };
}

/**
 * Genera ICS per tutti i task con scheduledAt non cancellati nell'org.
 * Include anche i completati (utili come storico nel calendario).
 */
export async function generateFeedIcs(opts: {
  organizationId: string;
}): Promise<string> {
  const tasks = await db.query.task.findMany({
    where: and(
      eq(schema.task.organizationId, opts.organizationId),
      isNull(schema.task.deletedAt),
      isNotNull(schema.task.scheduledAt),
    ),
  });

  return buildIcs({
    prodId: "-//todoist-tracker//iCal feed//IT",
    events: tasks.map((t) => ({
      uid: `${t.id}@todoist-tracker`,
      summary: t.title,
      description: htmlToText(t.descriptionMarkdown),
      start: t.scheduledAt!, // garantito da isNotNull
      end: t.estimatedMinutes
        ? new Date(t.scheduledAt!.getTime() + t.estimatedMinutes * 60_000)
        : null,
      lastModified: t.updatedAt,
      completedAt: t.completedAt,
    })),
  });
}
