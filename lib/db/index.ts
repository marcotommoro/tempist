/**
 * Drizzle database client (postgres via node-postgres pool).
 * Singleton: evita pool multipli in Next.js dev hot reload.
 */

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;

declare global {
  var __drizzleDbGlobal: Db | undefined;
}

function makeDb(): Db {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL non impostata. Copia .env.example in .env.local e configurala.",
    );
  }
  const pool = new Pool({ connectionString });
  return drizzle(pool, { schema });
}

export const db: Db = globalThis.__drizzleDbGlobal ?? makeDb();

if (process.env.NODE_ENV !== "production") {
  globalThis.__drizzleDbGlobal = db;
}

export { schema };
