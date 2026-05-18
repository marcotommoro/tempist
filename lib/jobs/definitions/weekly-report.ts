/**
 * Job `weekly.report` — cron `0 * * * *` (hourly).
 * Internamente filtra per lunedì @08:00 nella tz dell'utente + dedupe.
 */

import { PgBoss, type Job } from "pg-boss";

import { processWeeklyReport } from "@/lib/domain/weekly-report";

export const WEEKLY_REPORT_QUEUE = "weekly.report";

type Payload = { tickAt: string };

export async function registerWeeklyReport(boss: PgBoss): Promise<void> {
  await boss.createQueue(WEEKLY_REPORT_QUEUE);

  await boss.schedule(WEEKLY_REPORT_QUEUE, "0 * * * *", {
    tickAt: new Date().toISOString(),
  });

  await boss.work<Payload>(
    WEEKLY_REPORT_QUEUE,
    async ([job]: Job<Payload>[]) => {
      const start = Date.now();
      try {
        const { considered, sent } = await processWeeklyReport(new Date());
        const ms = Date.now() - start;
        if (sent > 0) {
          console.log(
            `[weekly.report] sent=${sent} considered=${considered} duration=${ms}ms tick=${job?.data?.tickAt}`,
          );
        }
      } catch (err) {
        console.error("[weekly.report] error", err);
        throw err;
      }
    },
  );
}
