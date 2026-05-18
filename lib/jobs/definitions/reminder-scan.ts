/**
 * Job `reminder.scan` — scan ogni minuto dei reminder pending.
 *
 * Per ogni reminder con trigger time <= now:
 *  - claim atomico via UPDATE sent_at = now WHERE sent_at IS NULL
 *  - createNotification(type=reminder.fired) per il task creator
 *
 * In futuro: invio Push/Email basato su reminder.channels.
 */

import { PgBoss, type Job } from "pg-boss";

import { processDueReminders } from "@/lib/domain/reminders";

export const REMINDER_SCAN_QUEUE = "reminder.scan";

type Payload = { tickAt: string };

export async function registerReminderScan(boss: PgBoss): Promise<void> {
  await boss.createQueue(REMINDER_SCAN_QUEUE);

  // Cron: ogni minuto
  await boss.schedule(REMINDER_SCAN_QUEUE, "* * * * *", {
    tickAt: new Date().toISOString(),
  });

  await boss.work<Payload>(
    REMINDER_SCAN_QUEUE,
    async ([job]: Job<Payload>[]) => {
      const start = Date.now();
      try {
        const fired = await processDueReminders(new Date());
        const ms = Date.now() - start;
        if (fired > 0) {
          console.log(
            `[reminder.scan] fired=${fired} duration=${ms}ms tick=${job?.data?.tickAt}`,
          );
        }
      } catch (err) {
        console.error("[reminder.scan] error", err);
        throw err;
      }
    },
  );
}
