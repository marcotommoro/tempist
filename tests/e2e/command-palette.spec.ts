import { test, expect } from "@playwright/test";

import { uniqueSuffix } from "./helpers/utils";

test.describe("command palette (Cmd+K)", () => {
  test("Cmd+K apre la palette e mostra quick nav", async ({ page }) => {
    await page.goto("/today");
    await page.keyboard.press("Meta+k");
    // Su Linux/Windows usa Control+k; Playwright Meta funziona su Mac, Control altrove.
    // Per portabilità, se non si apre, prova Control.
    let dialog = page.getByRole("dialog");
    if (!(await dialog.isVisible().catch(() => false))) {
      await page.keyboard.press("Control+k");
      dialog = page.getByRole("dialog");
    }
    await expect(dialog).toBeVisible();
    await expect(page.getByPlaceholder(/cerca o digita/i)).toBeVisible();
    // Quick nav: "Today" item è visibile
    await expect(page.getByRole("option", { name: /today/i }).first()).toBeVisible();
  });

  test("cerca un task creato e naviga", async ({ page }) => {
    // Crea task in Inbox
    const title = `Palette ${uniqueSuffix()}`;
    await page.goto("/inbox");
    const input = page.getByPlaceholder(/Chiamare Mario/i);
    await input.fill(title);
    await input.press("Enter");
    await expect(page.getByText(title)).toBeVisible({ timeout: 5_000 });

    // Apri palette e cerca
    await page.keyboard.press("Meta+k");
    let dialog = page.getByRole("dialog");
    if (!(await dialog.isVisible().catch(() => false))) {
      await page.keyboard.press("Control+k");
      dialog = page.getByRole("dialog");
    }
    await expect(dialog).toBeVisible();

    await page.getByPlaceholder(/cerca o digita/i).fill(title);
    // Aspetta debounce 150ms + server search
    await page.waitForTimeout(500);
    const item = page.getByRole("option").filter({ hasText: title }).first();
    await expect(item).toBeVisible({ timeout: 5_000 });
  });

  test("Esc chiude la palette", async ({ page }) => {
    await page.goto("/today");
    await page.keyboard.press("Meta+k");
    let dialog = page.getByRole("dialog");
    if (!(await dialog.isVisible().catch(() => false))) {
      await page.keyboard.press("Control+k");
      dialog = page.getByRole("dialog");
    }
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });
});
