import { test, expect } from "@playwright/test";

import { createTaskViaQuickAdd, uniqueSuffix } from "./helpers/utils";

test.describe("projects + sections", () => {
  test("crea progetto e lo vede in sidebar", async ({ page }) => {
    const projectName = `Progetto ${uniqueSuffix()}`;
    await page.goto("/projects");

    await page.getByPlaceholder(/Nome nuovo progetto/i).fill(projectName);
    await page.getByRole("button", { name: /^create$/i }).click();

    // Appare nella lista projects
    // Sidebar + main-list contengono il link → ne prendiamo uno specifico via #main-content
    const mainLink = page.locator("#main-content").getByRole("link", { name: new RegExp(projectName) });
    await expect(mainLink).toBeVisible({ timeout: 5_000 });
    await mainLink.click();
    await expect(page).toHaveURL(/\/projects\/[\w-]+/);
    // Il titolo è un button editabile dentro l'h1: l'accessible name dell'h1
    // è "Rinomina progetto", quindi si verifica il testo, non il name.
    await expect(page.locator("h1")).toContainText(projectName);
  });

  test("crea task in un progetto + switch List/Board", async ({ page }) => {
    const projectName = `Proj ${uniqueSuffix()}`;
    await page.goto("/projects");
    await page.getByPlaceholder(/Nome nuovo progetto/i).fill(projectName);
    await page.getByRole("button", { name: /^create$/i }).click();
    await page
      .locator("#main-content")
      .getByRole("link", { name: new RegExp(projectName) })
      .click();

    // "Aggiungi task" apre il dialog QuickAdd condiviso
    const taskTitle = `Task progetto ${uniqueSuffix()}`;
    await createTaskViaQuickAdd(page, taskTitle);
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
    await page.getByRole("button", { name: /^create$/i }).click();
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
    await page.getByRole("button", { name: /^create$/i }).click();
    await page
      .locator("#main-content")
      .getByRole("link", { name: new RegExp(projectName) })
      .click();

    const sectionName = `Sezione ${uniqueSuffix()}`;
    // L'input compare solo dopo il bottone "Nuova sezione".
    await page.getByRole("button", { name: /nuova sezione/i }).click();
    const sectionInput = page.getByPlaceholder(/Nome sezione/i);
    await expect(sectionInput).toBeVisible();
    await sectionInput.fill(sectionName);
    await sectionInput.press("Enter");
    await expect(
      page.getByRole("heading", { name: new RegExp(sectionName, "i") }),
    ).toBeVisible({ timeout: 5_000 });
  });
});
