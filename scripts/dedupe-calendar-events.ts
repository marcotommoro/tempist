/**
 * One-shot cleanup: remove duplicate Google Calendar events created before the
 * per-account sync lock was introduced.
 *
 * Concurrent syncs (connect callback + webhook job + cron) used to push the same
 * task twice, leaving multiple `calendarEventLink` rows for one (account, task)
 * pair — each pointing at a distinct Google event. This script keeps the most
 * recently synced link and deletes the surplus Google events + link rows.
 *
 * Sequence:
 *   1. Load every calendarEventLink, group by (calendarAccountId, taskId).
 *   2. For each group with >1 link, keep the newest (lastSyncedAt), mark the rest.
 *   3. (--apply) deleteEvent() the surplus Google events, then drop their links.
 *
 * Usage:
 *   tsx scripts/dedupe-calendar-events.ts                      # dry-run
 *   tsx scripts/dedupe-calendar-events.ts --apply              # mutates
 *   ACCOUNT_ID="<id>" tsx scripts/dedupe-calendar-events.ts    # scope to 1 account
 */

import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, schema } from "../lib/db";
import { getValidAccessToken } from "../lib/domain/calendar-accounts";
import { deleteEvent } from "../lib/integrations/google-calendar";

const APPLY = process.argv.includes("--apply");
const ACCOUNT_ID = process.env.ACCOUNT_ID?.trim() || null;

type Link = typeof schema.calendarEventLink.$inferSelect;

async function main() {
  const links = await db.query.calendarEventLink.findMany({
    ...(ACCOUNT_ID
      ? { where: eq(schema.calendarEventLink.calendarAccountId, ACCOUNT_ID) }
      : {}),
  });

  // Group by (accountId, taskId): >1 link in a group means duplicate events.
  const groups = new Map<string, Link[]>();
  for (const link of links) {
    const key = `${link.calendarAccountId}::${link.taskId}`;
    const arr = groups.get(key);
    if (arr) arr.push(link);
    else groups.set(key, [link]);
  }

  const surplus: Link[] = [];
  for (const arr of groups.values()) {
    if (arr.length <= 1) continue;
    // Keep the most recently synced link; everything else is a duplicate.
    arr.sort((a, b) => b.lastSyncedAt.getTime() - a.lastSyncedAt.getTime());
    surplus.push(...arr.slice(1));
  }

  console.log(`Links scanned:        ${links.length}`);
  console.log(`Duplicate groups:     ${[...groups.values()].filter((a) => a.length > 1).length}`);
  console.log(`Surplus links/events: ${surplus.length}`);
  console.log(`Scope:                ${ACCOUNT_ID ? `account ${ACCOUNT_ID}` : "all accounts"}`);
  console.log(`Mode:                 ${APPLY ? "APPLY" : "DRY-RUN"}`);

  if (surplus.length === 0) {
    console.log("\nNo duplicates. Nothing to do.");
    return;
  }
  if (!APPLY) {
    console.log("\nRe-run with --apply to delete the surplus Google events and links.");
    return;
  }

  // Cache one access token per account (getValidAccessToken refreshes if needed).
  const tokenByAccount = new Map<string, string>();
  async function tokenFor(accountId: string): Promise<string | null> {
    const cached = tokenByAccount.get(accountId);
    if (cached) return cached;
    const account = await db.query.calendarAccount.findFirst({
      where: eq(schema.calendarAccount.id, accountId),
    });
    if (!account) return null;
    const token = await getValidAccessToken(account);
    tokenByAccount.set(accountId, token);
    return token;
  }

  let deletedEvents = 0;
  let removedLinks = 0;
  for (const link of surplus) {
    const token = await tokenFor(link.calendarAccountId);
    if (token) {
      try {
        await deleteEvent({ accessToken: token, eventId: link.externalEventId });
        deletedEvents++;
      } catch (err) {
        // Event may already be gone; drop the link anyway.
        console.warn(
          `[dedupe] deleteEvent fail event=${link.externalEventId}: ${(err as Error).message}`,
        );
      }
    }
    await db
      .delete(schema.calendarEventLink)
      .where(eq(schema.calendarEventLink.id, link.id));
    removedLinks++;
  }

  console.log(`\nDone. Deleted ${deletedEvents} Google events, removed ${removedLinks} duplicate links.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
