import { test, expect } from "@playwright/test";

import { createTaskViaQuickAdd, uniqueSuffix } from "./helpers/utils";

test.describe("task CRUD su Today/Inbox", () => {
  test("crea task in Inbox via QuickAdd e lo vede in lista", async ({ page }) => {
    const title = `Task inbox ${uniqueSuffix()}`;
    await page.goto("/inbox");

    await createTaskViaQuickAdd(page, title);

    // Task appare nella lista
    await expect(page.getByText(title)).toBeVisible({ timeout: 5_000 });
  });

  test("crea task in Today con scheduledAt automatico e lo completa", async ({ page }) => {
    // "oggi" è un token NLP: schedula il task per oggi e sparisce dal titolo.
    const title = `Task odierno ${uniqueSuffix()}`;
    await page.goto("/today");

    await createTaskViaQuickAdd(page, `${title} oggi`, title);

    // Trova la row e clicca la LABEL (il cerchio visivo): l'input è sr-only
    // (1px clippato) e un click forzato sulle sue coordinate può atterrare
    // sul titolo aprendo il dialog invece di completare.
    const row = page
      .locator("li")
      .filter({ hasText: title })
      .first();
    await row.locator("label").first().click();

    // Dopo il revalidate la riga resta visibile in Today (sezione Completed)
    // con checkbox spuntata e titolo barrato. Il locator è live: si riaggancia
    // alla riga anche dopo il remount.
    await expect(row.getByRole("checkbox")).toBeChecked({ timeout: 10_000 });
    await expect(row.locator(".line-through").first()).toBeVisible();
  });

  test("crea task con priority via NLP (p1) ed elimina", async ({ page }) => {
    const title = `Priority test ${uniqueSuffix()}`;
    await page.goto("/inbox");

    // Il token "p1" viene parsato dal QuickAdd e rimosso dal titolo visibile.
    await createTaskViaQuickAdd(page, `${title} p1`, title);

    const row = page.locator("li").filter({ hasText: title }).first();
    await expect(row).toBeVisible({ timeout: 5_000 });
    // La priorità è un dot colorato con aria-label, non testo "P1".
    await expect(row.getByLabel(/^priority 1$/i)).toBeVisible();

    // Hover per mostrare action buttons, poi elimina
    await row.hover();
    await row.getByRole("button", { name: /cancella/i }).click();

    await expect(page.getByText(title)).not.toBeVisible({ timeout: 5_000 });
  });

  test("naviga Today → Inbox → Attività via sidebar", async ({ page }) => {
    await page.goto("/today");
    await page.getByRole("link", { name: /inbox/i }).first().click();
    await expect(page).toHaveURL(/\/inbox/);
    // La vista /upcoming si chiama "Attività" nella sidebar.
    await page.getByRole("link", { name: /attività/i }).first().click();
    await expect(page).toHaveURL(/\/upcoming/);
    await page.getByRole("link", { name: /today/i }).first().click();
    await expect(page).toHaveURL(/\/today/);
  });
});
