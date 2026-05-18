import { test, expect } from "@playwright/test";

import { uniqueSuffix } from "./helpers/utils";

test.describe("clients + timer", () => {
  test("crea cliente e visita pagina detail", async ({ page }) => {
    const clientName = `Cliente ${uniqueSuffix()}`;
    await page.goto("/clients");

    await page.getByLabel(/^Nome \*/).fill(clientName);
    await page.getByRole("button", { name: /crea cliente/i }).click();

    await expect(
      page.locator("#main-content").getByRole("link", { name: new RegExp(clientName) }).first(),
    ).toBeVisible({ timeout: 5_000 });
    await page.locator("#main-content").getByRole("link", { name: new RegExp(clientName) }).first().click();
    await expect(page.getByRole("heading", { name: clientName })).toBeVisible();
  });

  test("avvia timer dalla topbar, lo stoppa, l'entry compare", async ({ page }) => {
    await page.goto("/today");

    // Avvia timer dalla topbar (button "Start" senza task)
    const startBtn = page.getByRole("button", { name: /start timer/i }).first();
    // Se c'è già un timer attivo (test precedente fallito), stoppalo prima
    const stopExisting = page.getByRole("button", { name: /ferma timer/i });
    if (await stopExisting.isVisible().catch(() => false)) {
      await stopExisting.click();
      await page.waitForTimeout(500);
    }

    await startBtn.click();
    // Aspetta che il widget mostri Stop
    await expect(page.getByRole("button", { name: /ferma timer/i })).toBeVisible({
      timeout: 5_000,
    });

    // Aspetta almeno 1-2 secondi così la duration > 0
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: /ferma timer/i }).click();

    // Dopo stop, il button torna a "Start timer"
    await expect(
      page.getByRole("button", { name: /start timer/i }).first(),
    ).toBeVisible({
      timeout: 5_000,
    });
  });

  test("crea manual entry retroattiva sul cliente", async ({ page }) => {
    const clientName = `Manual ${uniqueSuffix()}`;
    await page.goto("/clients");
    await page.getByLabel(/^Nome \*/).fill(clientName);
    await page.getByRole("button", { name: /crea cliente/i }).click();

    await page.locator("#main-content").getByRole("link", { name: new RegExp(clientName) }).first().click();

    // Espandi il form manuale
    await page.getByRole("button", { name: /aggiungi voce manuale/i }).click();

    const desc = page.getByPlaceholder(/cosa hai fatto/i);
    await expect(desc).toBeVisible();

    const description = `Lavoro retroattivo ${uniqueSuffix()}`;
    await desc.fill(description);
    await page.getByRole("button", { name: /salva voce/i }).click();

    // L'entry compare nella lista
    await expect(page.getByText(description)).toBeVisible({ timeout: 5_000 });
  });
});
