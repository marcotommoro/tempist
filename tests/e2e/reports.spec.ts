import { test, expect } from "@playwright/test";

test.describe("reports + export + print", () => {
  test("dashboard /reports renderizza con range toggle e KPI cards", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: /^reports$/i })).toBeVisible();
    // Range toggle
    await expect(page.getByRole("link", { name: /^settimana$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^mese$/i })).toBeVisible();
    // KPI labels — selezioniamo la prima occorrenza (le KPI cards, non gli header tabella)
    await expect(page.getByText(/ore totali/i).first()).toBeVisible();
    await expect(page.getByText(/task completati/i).first()).toBeVisible();
    // Export CSV link
    await expect(page.getByRole("link", { name: /export csv/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /versione stampa/i })).toBeVisible();
  });

  test("switch range week → month → last-week aggiorna URL", async ({ page }) => {
    await page.goto("/reports");
    await page.getByRole("link", { name: /^mese$/i }).click();
    await expect(page).toHaveURL(/range=month/);
    await page.getByRole("link", { name: /^scorsa$/i }).click();
    await expect(page).toHaveURL(/range=last-week/);
    await page.getByRole("link", { name: /^settimana$/i }).click();
    await expect(page).toHaveURL(/range=week/);
  });

  test("Export CSV scarica file con header corretto", async ({ page }) => {
    await page.goto("/reports");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: /export csv/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/time-entries.*\.csv/);
  });

  test("/reports/print renderizza senza sidebar e ha button print", async ({ page }) => {
    await page.goto("/reports/print");
    await expect(page.getByRole("heading", { name: /^report/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /stampa.*pdf/i }),
    ).toBeVisible();
    // Sidebar non presente (route group (print))
    await expect(
      page.getByRole("navigation", { name: /viste task/i }),
    ).not.toBeVisible();
  });
});
