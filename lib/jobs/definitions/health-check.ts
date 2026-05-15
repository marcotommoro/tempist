/**
 * Job dummy "health-check": serve a verificare che il worker pg-boss funzioni.
 *
 * In Fase 0: lo schedula ogni minuto e logga un OK.
 * In Fase 4+ verra rimosso o sostituito con un job reale.
 */

import { PgBoss, type Job } from "pg-boss";

export const HEALTH_CHECK_QUEUE = "health-check";

type HealthCheckPayload = { startedAt: string };

export async function registerHealthCheck(boss: PgBoss): Promise<void> {
  await boss.createQueue(HEALTH_CHECK_QUEUE);

  // Schedula ogni minuto
  await boss.schedule(HEALTH_CHECK_QUEUE, "* * * * *", { startedAt: new Date().toISOString() });

  // Worker
  await boss.work<HealthCheckPayload>(HEALTH_CHECK_QUEUE, async ([job]: Job<HealthCheckPayload>[]) => {
    console.log(`[health-check] alive @ ${new Date().toISOString()}`, job?.data);
  });
}
