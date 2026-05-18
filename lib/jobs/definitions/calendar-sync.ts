/**
 * Job `calendar.sync` — push-only task → Google Calendar.
 * Cron: ogni 5 minuti.
 *
 * Salta gracefully se nessun calendar_account è registrato.
 * Errori per-account isolati: non bloccano gli altri account.
 */

import { PgBoss, type Job } from "pg-boss";

import { syncAllAccounts } from "@/lib/domain/calendar-sync";

export const CALENDAR_SYNC_QUEUE = "calendar.sync";

type Payload = { tickAt: string };

export async function registerCalendarSync(boss: PgBoss): Promise<void> {
  await boss.createQueue(CALENDAR_SYNC_QUEUE);

  // Ogni 5 minuti
  await boss.schedule(CALENDAR_SYNC_QUEUE, "*/5 * * * *", {
    tickAt: new Date().toISOString(),
  });

  await boss.work<Payload>(
    CALENDAR_SYNC_QUEUE,
    async ([job]: Job<Payload>[]) => {
      const start = Date.now();
      try {
        const r = await syncAllAccounts();
        const ms = Date.now() - start;
        if (r.accounts > 0) {
          console.log(
            `[calendar.sync] accounts=${r.accounts} inserted=${r.inserted} updated=${r.updated} deleted=${r.deleted} duration=${ms}ms tick=${job?.data?.tickAt}`,
          );
        }
      } catch (err) {
        console.error("[calendar.sync] error", err);
        throw err;
      }
    },
  );
}
