import { test, expect } from "@playwright/test";

import { createTaskViaQuickAdd, uniqueSuffix } from "./helpers/utils";

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

    // Il revalidate sposta la riga nella sezione "Completed" e il remount
    // chiude il dialog: riapriamo il dettaglio e verifichiamo la cascata.
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    const completedRow = page.locator("li").filter({ hasText: title }).first();
    await completedRow.getByRole("button", { name: title }).click();
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
