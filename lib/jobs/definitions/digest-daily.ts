/**
 * Job `digest.daily` — runs ogni ora (`0 * * * *`).
 * Filtra internamente per ora locale dell'utente (08:00) e dedupe via notification.
 */

import { PgBoss, type Job } from "pg-boss";

import { processDailyDigest } from "@/lib/domain/digest";

export const DIGEST_DAILY_QUEUE = "digest.daily";

type Payload = { tickAt: string };

export async function registerDigestDaily(boss: PgBoss): Promise<void> {
  await boss.createQueue(DIGEST_DAILY_QUEUE);

  // Ogni ora al minuto 0
  await boss.schedule(DIGEST_DAILY_QUEUE, "0 * * * *", {
    tickAt: new Date().toISOString(),
  });

  await boss.work<Payload>(
    DIGEST_DAILY_QUEUE,
    async ([job]: Job<Payload>[]) => {
      const start = Date.now();
      try {
        const { considered, sent } = await processDailyDigest(new Date());
        const ms = Date.now() - start;
        if (sent > 0) {
          console.log(
            `[digest.daily] sent=${sent} considered=${considered} duration=${ms}ms tick=${job?.data?.tickAt}`,
          );
        }
      } catch (err) {
        console.error("[digest.daily] error", err);
        throw err;
      }
    },
  );
}
