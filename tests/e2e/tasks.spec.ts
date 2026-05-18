import { test, expect } from "@playwright/test";

import { uniqueSuffix } from "./helpers/utils";

test.describe("task CRUD su Today/Inbox", () => {
  test("crea task in Inbox via QuickAdd e lo vede in lista", async ({ page }) => {
    const title = `Task inbox ${uniqueSuffix()}`;
    await page.goto("/inbox");

    const input = page.getByPlaceholder(/Chiamare Mario/i);
    await expect(input).toBeVisible();
    await input.fill(title);
    await input.press("Enter");

    // Task appare nella lista
    await expect(page.getByText(title)).toBeVisible({ timeout: 5_000 });
  });

  test("crea task in Today con scheduledAt automatico e lo completa", async ({ page }) => {
    const title = `Task oggi ${uniqueSuffix()}`;
    await page.goto("/today");

    const input = page.getByPlaceholder(/Chiamare Mario/i);
    await input.fill(title);
    await input.press("Enter");

    await expect(page.getByText(title)).toBeVisible({ timeout: 5_000 });

    // Trova la row col task e clicca la checkbox.
    // Usiamo click() invece di check() perché il revalidate fa sparire il task
    // o cambia lo stato della checkbox prima che check() veda lo stato finale.
    const row = page
      .locator("li")
      .filter({ hasText: title })
      .first();
    await row.getByRole("checkbox", { name: /completato/i }).click();

    // Dopo il revalidate il task può essere ancora visibile con line-through
    // (Today include task con scheduledAt entro fine giornata anche completati)
    // oppure rimanere visibile con stato updated.
    await page.waitForTimeout(1_000);
    // Verifica che almeno UNA delle due condizioni sia vera:
    //   - task assente
    //   - task visibile con line-through
    const stillVisible = await page.getByText(title).isVisible().catch(() => false);
    if (stillVisible) {
      const updatedRow = page.locator("li").filter({ hasText: title }).first();
      await expect(updatedRow.locator("p.line-through")).toBeVisible({
        timeout: 3_000,
      });
    }
  });

  test("crea task con priority via NLP (p1) ed elimina", async ({ page }) => {
    const title = `Priority test ${uniqueSuffix()}`;
    await page.goto("/inbox");

    const input = page.getByPlaceholder(/Chiamare Mario/i);
    await input.fill(`${title} p1`);
    await input.press("Enter");

    const row = page.locator("li").filter({ hasText: title }).first();
    await expect(row).toBeVisible({ timeout: 5_000 });
    await expect(row.getByText("P1", { exact: true })).toBeVisible();

    // Hover per mostrare action buttons, poi elimina
    await row.hover();
    await row.getByRole("button", { name: /cancella/i }).click();

    await expect(page.getByText(title)).not.toBeVisible({ timeout: 5_000 });
  });

  test("naviga Today → Inbox → Upcoming via sidebar", async ({ page }) => {
    await page.goto("/today");
    await page.getByRole("link", { name: /inbox/i }).first().click();
    await expect(page).toHaveURL(/\/inbox/);
    await page.getByRole("link", { name: /upcoming/i }).first().click();
    await expect(page).toHaveURL(/\/upcoming/);
    await page.getByRole("link", { name: /today/i }).first().click();
    await expect(page).toHaveURL(/\/today/);
  });
});
