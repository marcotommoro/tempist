/**
 * Runner migrazioni standalone — usato dal container in produzione (Coolify)
 * prima di avviare il server Next.js. Esegue le SQL in ./drizzle contro
 * DATABASE_URL e exit 1 al primo errore, così l'app non parte con schema rotto.
 *
 * Drizzle è idempotente: tiene traccia delle migrazioni applicate nella tabella
 * `__drizzle_migrations`, quindi rilanciare lo script è sicuro.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("[migrate] DATABASE_URL non impostata");
    process.exit(1);
  }

  const migrationsFolder = process.env.MIGRATIONS_FOLDER ?? "./drizzle";
  const pool = new Pool({ connectionString, max: 1 });
  const db = drizzle(pool);

  const start = Date.now();
  console.log(`[migrate] Avvio migrazioni da ${migrationsFolder}…`);
  try {
    await migrate(db, { migrationsFolder });
    console.log(`[migrate] OK in ${Date.now() - start}ms`);
  } catch (err) {
    console.error("[migrate] FALLITO:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

void main();
