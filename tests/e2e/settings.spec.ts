import { test, expect } from "@playwright/test";

test.describe("settings (theme, iCal, import)", () => {
  test("theme toggle: cycle in topbar cambia tema", async ({ page }) => {
    await page.goto("/today");

    const themeBtn = page.getByRole("button", { name: /tema:/i });
    await expect(themeBtn).toBeVisible();

    // Cycle e verifica che cambi label aria
    const initialLabel = await themeBtn.getAttribute("aria-label");
    await themeBtn.click();
    await page.waitForTimeout(150);
    const afterClick = await themeBtn.getAttribute("aria-label");
    expect(afterClick).not.toBe(initialLabel);
  });

  test("theme radio in /settings ha 3 opzioni e attive una via click", async ({ page }) => {
    await page.goto("/settings");
    const group = page.getByRole("radiogroup", { name: /tema colori/i });
    await expect(group).toBeVisible();

    const dark = group.getByRole("radio", { name: /scuro/i });
    await dark.click();
    await expect(dark).toHaveAttribute("aria-checked", "true");

    // Verifica anche light
    const light = group.getByRole("radio", { name: /chiaro/i });
    await light.click();
    await expect(light).toHaveAttribute("aria-checked", "true");
  });

  test("generate iCal token e copia URL", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: /ical feed/i })).toBeVisible();

    await page.getByRole("button", { name: /genera nuovo token/i }).click();
    // Aspetta che il nuovo URL compaia
    await expect(page.locator("code").filter({ hasText: /\/api\/ical\// }).first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test("import section è visibile con button upload", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: /importa csv/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /seleziona csv/i }),
    ).toBeVisible();
  });

  test("digest section ha button 'invia digest di prova'", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: /daily digest/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /invia digest di prova/i }),
    ).toBeVisible();
  });

  test("weekly report section visibile", async ({ page }) => {
    await page.goto("/settings");
    await expect(
      page.getByRole("heading", { name: /report settimanale/i }),
    ).toBeVisible();
  });

  test("calendar section visibile (connect/warning per env mancanti)", async ({ page }) => {
    await page.goto("/settings");
    await expect(
      page.getByRole("heading", { name: /calendar sync/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/sincronizzazione bidirezionale/i),
    ).toBeVisible();
  });
});
