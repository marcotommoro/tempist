/**
 * Worker entry point — esegue pg-boss in un processo separato dall'app Next.js.
 *
 * Locale (dev):
 *   pnpm worker:dev
 *
 * Produzione (Coolify):
 *   container separato con Dockerfile.worker, stesso DATABASE_URL dell'app.
 */

import "dotenv/config";
import { getBoss, stopBoss } from "../lib/jobs/boss";
import { registerHealthCheck } from "../lib/jobs/definitions/health-check";
import { registerReminderScan } from "../lib/jobs/definitions/reminder-scan";

async function main() {
  const boss = await getBoss();
  console.log("[worker] pg-boss started, registering jobs...");

  await registerHealthCheck(boss);
  await registerReminderScan(boss);

  console.log("[worker] ready. listening for jobs.");
}

async function shutdown(signal: string) {
  console.log(`[worker] received ${signal}, shutting down gracefully...`);
  try {
    await stopBoss();
    process.exit(0);
  } catch (err) {
    console.error("[worker] error during shutdown", err);
    process.exit(1);
  }
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

main().catch((err) => {
  console.error("[worker] fatal error", err);
  process.exit(1);
});
