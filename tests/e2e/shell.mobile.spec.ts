import { test, expect } from "@playwright/test";

// Smoke test della shell responsive: sotto lg la sidebar sparisce e la
// navigazione passa dal drawer aperto con l'hamburger in topbar.
test.describe("shell mobile", () => {
  test("sidebar nascosta, drawer apre e naviga", async ({ page }) => {
    await page.goto("/today");

    // La sidebar desktop non deve essere visibile a viewport mobile
    await expect(
      page.getByRole("complementary", { name: "Navigazione principale" }),
    ).toBeHidden();

    // L'hamburger apre il drawer di navigazione
    await page
      .getByRole("button", { name: "Apri menu di navigazione" })
      .click();
    const drawer = page.getByRole("dialog", { name: "Menu di navigazione" });
    await expect(drawer).toBeVisible();

    // Cliccare un link naviga e chiude il drawer
    await drawer.getByRole("link", { name: "Inbox" }).click();
    await expect(page).toHaveURL(/\/inbox$/);
    await expect(drawer).toBeHidden();
  });
});
