import { test, expect } from "@playwright/test";

test("landing page renders + sign-in link works", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /todoist \+ time tracker/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /accedi/i })).toBeVisible();

  await page.getByRole("link", { name: /accedi/i }).click();
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByRole("heading", { name: /accedi/i })).toBeVisible();
});
