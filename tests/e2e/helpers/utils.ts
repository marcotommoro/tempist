/**
 * Utility per i test E2E autenticati.
 *
 * Tutti i test condividono lo stesso user demo; per evitare collisioni
 * sui nomi di task/project/client li suffissiamo con un id univoco.
 */

import { randomBytes } from "node:crypto";

import { expect, type Page } from "@playwright/test";

/**
 * Genera un suffisso unico breve per nomi di test fixture.
 * Prefisso letterale: un suffisso esadecimale puro come "14109d" verrebbe
 * parsato dall'NLP del QuickAdd (chrono lo legge come durata/data) e
 * rimosso dal titolo, rompendo gli assert sui nomi.
 */
export function uniqueSuffix(): string {
  return `x${randomBytes(3).toString("hex")}`;
}

/** Compone un nome user-friendly con suffisso. */
export function withSuffix(prefix: string): string {
  return `${prefix} ${uniqueSuffix()}`;
}

/**
 * Crea un task via QuickAdd e chiude il dialog di creazione.
 * Il QuickAdd non è più inline nelle pagine: sta dentro il dialog
 * aperto dal bottone "Aggiungi task".
 *
 * `expectedTitle`: titolo atteso in lista quando `input` contiene token NLP
 * (es. "p1", "oggi") che il parser rimuove dal titolo salvato.
 */
export async function createTaskViaQuickAdd(
  page: Page,
  input: string,
  expectedTitle: string = input,
): Promise<void> {
  // .first(): le pagine progetto possono avere più trigger "Aggiungi task".
  await page.getByRole("button", { name: /aggiungi task/i }).first().click();
  const quickAddInput = page.getByPlaceholder(/Chiamare Mario/i);
  await expect(quickAddInput).toBeVisible();
  await quickAddInput.fill(input);
  await quickAddInput.press("Enter");
  // Attende che il task compaia in lista, poi chiude il dialog di creazione.
  await expect(
    page.locator("li").filter({ hasText: expectedTitle }).first(),
  ).toBeVisible({ timeout: 5_000 });
  await page.keyboard.press("Escape");
}
