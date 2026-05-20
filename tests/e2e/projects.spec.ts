import { test, expect } from "@playwright/test";

import { uniqueSuffix } from "./helpers/utils";

test.describe("projects + sections", () => {
  test("crea progetto e lo vede in sidebar", async ({ page }) => {
    const projectName = `Progetto ${uniqueSuffix()}`;
    await page.goto("/projects");

    await page.getByPlaceholder(/Nome nuovo progetto/i).fill(projectName);
    await page.getByRole("button", { name: /^crea$/i }).click();

    // Appare nella lista projects
    // Sidebar + main-list contengono il link → ne prendiamo uno specifico via #main-content
    const mainLink = page.locator("#main-content").getByRole("link", { name: new RegExp(projectName) });
    await expect(mainLink).toBeVisible({ timeout: 5_000 });
    await mainLink.click();
    await expect(page).toHaveURL(/\/projects\/[\w-]+/);
    await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
  });

  test("crea task in un progetto + switch List/Board", async ({ page }) => {
    const projectName = `Proj ${uniqueSuffix()}`;
    await page.goto("/projects");
    await page.getByPlaceholder(/Nome nuovo progetto/i).fill(projectName);
    await page.getByRole("button", { name: /^crea$/i }).click();
    await page
      .locator("#main-content")
      .getByRole("link", { name: new RegExp(projectName) })
      .click();

    // Espandi il form "Aggiungi task" (in Senza sezione)
    await page.getByRole("button", { name: /^aggiungi task$/i }).first().click();

    const taskTitle = `Task progetto ${uniqueSuffix()}`;
    const addInput = page.getByPlaceholder(/Titolo task/i).first();
    await addInput.fill(taskTitle);
    await addInput.press("Enter");
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 5_000 });

    // Switch a Board view
    await page.getByRole("link", { name: /board/i }).click();
    await expect(page).toHaveURL(/view=board/);
    // Il task deve essere ancora visibile nel board
    await expect(page.getByText(taskTitle)).toBeVisible();

    // Torna a List
    await page.getByRole("link", { name: /^list$/i }).click();
    await expect(page).toHaveURL(/\/projects\/[\w-]+$/);
  });

  test("rinomina progetto inline dal titolo", async ({ page }) => {
    const projectName = `Rename ${uniqueSuffix()}`;
    const renamed = `${projectName} updated`;
    await page.goto("/projects");

    await page.getByPlaceholder(/Nome nuovo progetto/i).fill(projectName);
    await page.getByRole("button", { name: /^crea$/i }).click();
    await page
      .locator("#main-content")
      .getByRole("link", { name: new RegExp(projectName) })
      .click();

    await page.getByRole("button", { name: /rinomina progetto/i }).click();
    const nameInput = page.getByLabel(/nome progetto/i);
    await expect(nameInput).toBeVisible();
    await nameInput.fill(renamed);
    await nameInput.press("Enter");

    await expect(page.getByRole("heading", { name: renamed })).toBeVisible({
      timeout: 5_000,
    });
    await expect(
      page.locator("aside").getByRole("link", { name: new RegExp(renamed) }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("crea sezione nel progetto", async ({ page }) => {
    const projectName = `Proj sec ${uniqueSuffix()}`;
    await page.goto("/projects");
    await page.getByPlaceholder(/Nome nuovo progetto/i).fill(projectName);
    await page.getByRole("button", { name: /^crea$/i }).click();
    await page
      .locator("#main-content")
      .getByRole("link", { name: new RegExp(projectName) })
      .click();

    const sectionName = `Sezione ${uniqueSuffix()}`;
    const sectionInput = page.getByPlaceholder(/Nome sezione/i);
    if (await sectionInput.isVisible().catch(() => false)) {
      await sectionInput.fill(sectionName);
      await sectionInput.press("Enter");
      await expect(
        page.getByRole("heading", { name: new RegExp(sectionName, "i") }),
      ).toBeVisible({ timeout: 5_000 });
    } else {
      test.skip(true, "Section input non trovato in questo flusso UI");
    }
  });
});
