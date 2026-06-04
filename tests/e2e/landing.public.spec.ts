import { test, expect } from "@playwright/test";

test.describe("landing & sign-in (public)", () => {
  test("landing renders e link sign-in funziona", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /hours you actually billed/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /log in/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /github/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible();
  });

  test("sign-in page mostra il form email", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
  });

  test("proxy redirige /today verso /sign-in se non autenticati", async ({ page }) => {
    await page.goto("/today");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("proxy protegge anche /settings e /reports", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/sign-in/);
    await page.goto("/reports");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
