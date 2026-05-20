import { PgBoss, type Job } from "pg-boss";

import { syncAccountById, syncAllAccounts } from "@/lib/domain/calendar-sync";

export const CALENDAR_SYNC_QUEUE = "calendar.sync";

type Payload = { tickAt: string; accountId?: string };

export async function registerCalendarSync(boss: PgBoss): Promise<void> {
  await boss.createQueue(CALENDAR_SYNC_QUEUE);

  await boss.schedule(CALENDAR_SYNC_QUEUE, "*/5 * * * *", {
    tickAt: new Date().toISOString(),
  });

  await boss.work<Payload>(
    CALENDAR_SYNC_QUEUE,
    async ([job]: Job<Payload>[]) => {
      const start = Date.now();
      const accountId = job?.data?.accountId;
      try {
        if (accountId) {
          const r = await syncAccountById(accountId);
          if (r) {
            const ms = Date.now() - start;
            console.log(
              `[calendar.sync] account=${accountId} pulled=${r.pulled.imported}+${r.pulled.updated} push=${r.pushed.inserted}+${r.pushed.updated} duration=${ms}ms`,
            );
          }
          return;
        }

        const r = await syncAllAccounts();
        const ms = Date.now() - start;
        if (r.accounts > 0) {
          console.log(
            `[calendar.sync] accounts=${r.accounts} inserted=${r.inserted} updated=${r.updated} deleted=${r.deleted} pulled=${r.pulled} duration=${ms}ms tick=${job?.data?.tickAt}`,
          );
        }
      } catch (err) {
        console.error("[calendar.sync] error", err);
        throw err;
      }
    },
  );
}
