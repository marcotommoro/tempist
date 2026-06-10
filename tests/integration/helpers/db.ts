/**
 * Harness Postgres per i test di integrazione.
 *
 * Usa TEST_DATABASE_URL e MAI DATABASE_URL (in .env può puntare al DB reale).
 * L'override deve avvenire nel prefisso sincrono di questo modulo, PRIMA che
 * `@/lib/db` venga valutato: il pool è un singleton creato al primo import.
 * Per questo i file di test devono importare questo helper come PRIMO import.
 */

import "dotenv/config";
import { sql } from "drizzle-orm";

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  throw new Error(
    "TEST_DATABASE_URL non impostata: i test di integrazione richiedono un Postgres dedicato (vedi .env.example).",
  );
}
process.env.DATABASE_URL = testUrl;

// Import dinamico DOPO l'override: un import statico verrebbe hoistato prima.
const { db, schema } = await import("@/lib/db");

export { db, schema };

/** Applica le migration pendenti al DB di test (idempotente). */
export async function migrateTestDb(): Promise<void> {
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  await migrate(db, { migrationsFolder: "./drizzle" });
}

/** Svuota i task e, via cascade, le tabelle che li referenziano (label, comment, …). */
export async function truncateTasks(): Promise<void> {
  await db.execute(sql`truncate table "task" cascade`);
}

/** Crea una coppia org+user isolata per la suite (specchia lib/db/seed.ts). */
export async function createTestOrgAndUser(): Promise<{
  userId: string;
  organizationId: string;
}> {
  const suffix = crypto.randomUUID().slice(0, 8);

  const [userRow] = await db
    .insert(schema.user)
    .values({
      email: `test-${suffix}@test.local`,
      name: "Test User",
      emailVerified: true,
    })
    .returning();
  if (!userRow) throw new Error("Impossibile creare user di test");

  const [org] = await db
    .insert(schema.organization)
    .values({ name: `Test Org ${suffix}`, slug: `test-${suffix}` })
    .returning();
  if (!org) throw new Error("Impossibile creare organization di test");

  await db.insert(schema.member).values({
    organizationId: org.id,
    userId: userRow.id,
    role: "owner",
  });

  return { userId: userRow.id, organizationId: org.id };
}
