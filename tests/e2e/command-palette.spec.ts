import { test, expect, type Page } from "@playwright/test";

import { createTaskViaQuickAdd, uniqueSuffix } from "./helpers/utils";

/**
 * Apre la palette con retry: il listener Cmd/Ctrl+K si attacca solo dopo
 * l'hydration, quindi un singolo press appena caricata la pagina può perdersi.
 * Alterna Meta/Control per portabilità (Mac vs Linux/Windows).
 */
async function openCommandPalette(page: Page): Promise<void> {
  let useMeta = true;
  await expect(async () => {
    await page.keyboard.press(useMeta ? "Meta+k" : "Control+k");
    useMeta = !useMeta;
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}

test.describe("command palette (Cmd+K)", () => {
  test("Cmd+K apre la palette e mostra quick nav", async ({ page }) => {
    await page.goto("/today");
    await openCommandPalette(page);
    await expect(page.getByPlaceholder(/search anything/i)).toBeVisible();
    // Quick nav: "Today" item è visibile
    await expect(page.getByRole("option", { name: /today/i }).first()).toBeVisible();
  });

  test("cerca un task creato e naviga", async ({ page }) => {
    // Crea task in Inbox
    const title = `Palette ${uniqueSuffix()}`;
    await page.goto("/inbox");
    await createTaskViaQuickAdd(page, title);

    // Apri palette e cerca
    await openCommandPalette(page);

    await page.getByPlaceholder(/search anything/i).fill(title);
    // Aspetta debounce 150ms + server search
    await page.waitForTimeout(500);
    const item = page.getByRole("option").filter({ hasText: title }).first();
    await expect(item).toBeVisible({ timeout: 5_000 });
  });

  test("Esc chiude la palette", async ({ page }) => {
    await page.goto("/today");
    await openCommandPalette(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});
