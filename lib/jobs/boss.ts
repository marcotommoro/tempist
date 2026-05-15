/**
 * pg-boss singleton.
 *
 * pg-boss vive nello stesso DB Postgres dell'app (schema dedicato `pgboss`).
 * Una sola istanza condivisa per processo (gestita via globalThis in dev hot reload).
 *
 * Uso lato server (Next.js):
 *   import { getBoss } from "@/lib/jobs/boss";
 *   const boss = await getBoss();
 *   await boss.send("send-reminder", { reminderId: r.id });
 *
 * Uso nel worker process: il worker chiama getBoss() e registra handlers via boss.work(...).
 */

import { PgBoss } from "pg-boss";

declare global {
  var __pgBossPromise: Promise<PgBoss> | undefined;
}

async function makeBoss(): Promise<PgBoss> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL non impostata. Necessaria per pg-boss (stesso DB dell'app).",
    );
  }
  const boss = new PgBoss({
    connectionString,
    // Lascia che pg-boss gestisca il suo schema (default: "pgboss")
    schema: "pgboss",
    // Le retention/policies si aggiungeranno per-queue in Fase 4
  });
  boss.on("error", (err: unknown) => console.error("[pg-boss]", err));
  await boss.start();
  return boss;
}

export async function getBoss(): Promise<PgBoss> {
  if (!globalThis.__pgBossPromise) {
    globalThis.__pgBossPromise = makeBoss();
  }
  return globalThis.__pgBossPromise;
}

/**
 * Chiude la connessione (usato in test teardown / graceful shutdown del worker).
 */
export async function stopBoss(): Promise<void> {
  if (globalThis.__pgBossPromise) {
    const boss = await globalThis.__pgBossPromise;
    await boss.stop();
    globalThis.__pgBossPromise = undefined;
  }
}
