import { test, expect, type Page } from "@playwright/test";

import { uniqueSuffix } from "./helpers/utils";

/** Crea un task via QuickAdd (dialog "Aggiungi task") e chiude il dialog. */
async function createTaskViaQuickAdd(page: Page, title: string) {
  await page.getByRole("button", { name: /aggiungi task/i }).click();
  const input = page.getByPlaceholder(/Chiamare Mario/i);
  await expect(input).toBeVisible();
  await input.fill(title);
  await input.press("Enter");
  // Attende che il task compaia in lista, poi chiude il dialog di creazione.
  await expect(
    page.locator("li").filter({ hasText: title }).first(),
  ).toBeVisible({ timeout: 5_000 });
  await page.keyboard.press("Escape");
}

test.describe("sottoattività", () => {
  test("crea sottoattività dal dialog e completa il padre con cascata", async ({
    page,
  }) => {
    const title = `Padre subtask ${uniqueSuffix()}`;
    const childTitle = `Figlio subtask ${uniqueSuffix()}`;
    await page.goto("/inbox");

    // Crea il task padre via QuickAdd
    await createTaskViaQuickAdd(page, title);
    const row = page.locator("li").filter({ hasText: title }).first();

    // Apri il dialog di dettaglio cliccando il titolo
    await row.getByRole("button", { name: title }).click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Sottoattività" }),
    ).toBeVisible();

    // Aggiungi una sottoattività con Enter
    const subInput = dialog.getByPlaceholder(/Aggiungi sottoattività/i);
    await subInput.fill(childTitle);
    await subInput.press("Enter");
    await expect(dialog.getByText(childTitle)).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByText("0/1")).toBeVisible();

    // Completa il padre dal dialog → la cascata completa anche il figlio.
    // force: l'input è sr-only e lo span decorativo intercetta il click.
    await dialog
      .getByRole("checkbox", { name: /completa task/i })
      .click({ force: true });
    await expect(dialog.getByText("1/1")).toBeVisible({ timeout: 5_000 });
    await expect(
      dialog.locator("span.line-through", { hasText: childTitle }),
    ).toBeVisible();
  });

  test("le sottoattività non compaiono in Inbox", async ({ page }) => {
    const title = `Padre inbox ${uniqueSuffix()}`;
    const childTitle = `Figlio nascosto ${uniqueSuffix()}`;
    await page.goto("/inbox");

    await createTaskViaQuickAdd(page, title);
    const row = page.locator("li").filter({ hasText: title }).first();

    await row.getByRole("button", { name: title }).click();
    const dialog = page.getByRole("dialog");
    const subInput = dialog.getByPlaceholder(/Aggiungi sottoattività/i);
    await subInput.fill(childTitle);
    await subInput.press("Enter");
    await expect(dialog.getByText(childTitle)).toBeVisible({ timeout: 5_000 });

    // Chiudi il dialog: la sottoattività non deve apparire come riga in Inbox
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(
      page.locator("li").filter({ hasText: childTitle }),
    ).toHaveCount(0);
  });
});
