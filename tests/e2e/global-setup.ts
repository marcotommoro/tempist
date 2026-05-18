/**
 * Playwright global setup.
 *
 * Esegue una volta prima di TUTTI i test:
 *  1. Sign-in via magic link con un user dedicato E2E
 *  2. Salva lo storageState (cookies + localStorage) in `tests/e2e/.auth/user.json`
 *
 * I test poi caricano questo storageState come `test.use({ storageState })`.
 */

import { chromium, request as playwrightRequest, type FullConfig } from "@playwright/test";
import { dirname, join } from "node:path";
import { mkdir } from "node:fs/promises";

import { clearMagicLinkFiles, signInViaMagicLink } from "./helpers/auth";

export const E2E_USER_EMAIL = "e2e-test@todoist-tracker.local";
export const STORAGE_STATE = join(
  process.cwd(),
  "tests",
  "e2e",
  ".auth",
  "user.json",
);

async function globalSetup(config: FullConfig) {
  const baseURL =
    config.projects[0]?.use.baseURL ??
    process.env.PLAYWRIGHT_BASE_URL ??
    "http://localhost:3000";

  await clearMagicLinkFiles();
  await mkdir(dirname(STORAGE_STATE), { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const request = await playwrightRequest.newContext({ baseURL });

  try {
    await signInViaMagicLink({
      context,
      request,
      email: E2E_USER_EMAIL,
      baseURL,
    });
    await context.storageState({ path: STORAGE_STATE });
  } finally {
    await context.close();
    await request.dispose();
    await browser.close();
  }

  console.log(`[e2e setup] storageState saved → ${STORAGE_STATE}`);
}

export default globalSetup;
