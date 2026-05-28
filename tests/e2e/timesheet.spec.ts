import { test, expect } from "@playwright/test";

import { uniqueSuffix } from "./helpers/utils";

test.describe("timesheet", () => {
  test("modifica ed elimina voce manuale su cliente", async ({ page }) => {
    const clientName = `Timesheet ${uniqueSuffix()}`;
    const description = `Voce originale ${uniqueSuffix()}`;
    const updatedDescription = `Voce aggiornata ${uniqueSuffix()}`;

    await page.goto("/clients");
    await page.getByLabel(/^Nome \*/).fill(clientName);
    await page.getByRole("button", { name: /crea cliente/i }).click();
    await page
      .locator("#main-content")
      .getByRole("link", { name: new RegExp(clientName) })
      .first()
      .click();

    await page.getByRole("button", { name: /aggiungi voce manuale/i }).click();
    await page.getByPlaceholder(/cosa hai fatto/i).fill(description);
    await page.getByRole("button", { name: /salva voce/i }).click();
    await expect(page.getByText(description)).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: /modifica voce/i }).first().click();
    await expect(page.getByRole("dialog", { name: /modifica voce/i })).toBeVisible();
    await page.getByLabel(/descrizione/i).fill(updatedDescription);
    await page.getByRole("button", { name: /salva modifiche/i }).click();
    await expect(page.getByText(updatedDescription)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(description)).not.toBeVisible();

    await page.getByRole("button", { name: /elimina voce/i }).first().click();
    await expect(page.getByRole("dialog", { name: /elimina voce/i })).toBeVisible();
    await page.getByRole("button", { name: /^elimina$/i }).click();
    await expect(page.getByText(updatedDescription)).not.toBeVisible({ timeout: 5_000 });
  });

  test("pagina timesheet mostra voci della settimana", async ({ page }) => {
    const clientName = `TS Week ${uniqueSuffix()}`;
    const description = `Voce timesheet ${uniqueSuffix()}`;

    await page.goto("/clients");
    await page.getByLabel(/^Nome \*/).fill(clientName);
    await page.getByRole("button", { name: /crea cliente/i }).click();
    await page
      .locator("#main-content")
      .getByRole("link", { name: new RegExp(clientName) })
      .first()
      .click();

    await page.getByRole("button", { name: /aggiungi voce manuale/i }).click();
    await page.getByPlaceholder(/cosa hai fatto/i).fill(description);
    await page.getByRole("button", { name: /salva voce/i }).click();
    await expect(page.getByText(description)).toBeVisible({ timeout: 5_000 });

    await page.goto("/timesheet");
    await expect(page.getByRole("heading", { name: /timesheet/i })).toBeVisible();
    await expect(page.getByText(description)).toBeVisible({ timeout: 5_000 });
  });

  test("export CSV cliente restituisce CSV con voci", async ({ page, request }) => {
    const clientName = `CSV Export ${uniqueSuffix()}`;
    const description = `Voce CSV ${uniqueSuffix()}`;

    await page.goto("/clients");
    await page.getByLabel(/^Nome \*/).fill(clientName);
    await page.getByRole("button", { name: /crea cliente/i }).click();
    await page
      .locator("#main-content")
      .getByRole("link", { name: new RegExp(clientName) })
      .first()
      .click();

    // Estrai clientId dall'URL della pagina cliente
    const clientUrl = page.url();
    const clientId = clientUrl.match(/\/clients\/([^/?]+)/)?.[1];
    expect(clientId).toBeDefined();

    await page.getByRole("button", { name: /aggiungi voce manuale/i }).click();
    await page.getByPlaceholder(/cosa hai fatto/i).fill(description);
    await page.getByRole("button", { name: /salva voce/i }).click();
    await expect(page.getByText(description)).toBeVisible({ timeout: 5_000 });

    // Cliente carica già il preset "Questo mese", quindi la voce manuale è inclusa.
    const csvHref = await page
      .getByRole("link", { name: /export csv/i })
      .getAttribute("href");
    expect(csvHref).toBeTruthy();

    // Fai la richiesta CSV reusando il cookie di sessione del context
    const res = await request.get(csvHref!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/csv");

    const body = await res.text();
    // Verifica header colonne aggiornato + presenza descrizione + nome cliente
    expect(body).toContain("client_name");
    expect(body).toContain("project_name");
    expect(body).toContain(clientName);
    expect(body).toContain(description);
  });
});
