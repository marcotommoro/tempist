import { test, expect } from "@playwright/test";

test.describe("auth (authed)", () => {
  test("autenticato vede /today", async ({ page }) => {
    await page.goto("/today");
    await expect(page).toHaveURL(/\/today/);
    await expect(page.getByRole("heading", { name: /today/i })).toBeVisible();
    // Sidebar visible
    await expect(page.getByRole("navigation", { name: /viste task/i })).toBeVisible();
  });

  test("redirect /sign-in se autenticato → /today", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page).toHaveURL(/\/today/);
  });

  test("skip link 'Salta al contenuto' è raggiungibile via Tab", async ({ page }) => {
    await page.goto("/today");
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: /salta al contenuto/i });
    await expect(skipLink).toBeFocused();
  });
});
