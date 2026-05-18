/**
 * Utility per i test E2E autenticati.
 *
 * Tutti i test condividono lo stesso user demo; per evitare collisioni
 * sui nomi di task/project/client li suffissiamo con un id univoco.
 */

import { randomBytes } from "node:crypto";

/** Genera un suffisso unico breve per nomi di test fixture. */
export function uniqueSuffix(): string {
  return randomBytes(3).toString("hex");
}

/** Compone un nome user-friendly con suffisso. */
export function withSuffix(prefix: string): string {
  return `${prefix} ${uniqueSuffix()}`;
}
