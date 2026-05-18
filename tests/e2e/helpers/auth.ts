/**
 * Auth helper per test E2E.
 *
 * Pre-requisito: il dev server gira con `E2E_TEST=1` così il sender magic-link
 * scrive il link in `.e2e-magic-links/<email>.txt`.
 *
 * Flow:
 *  1. POST /api/auth/sign-in/magic-link con { email }
 *  2. Poll file system per leggere il link generato
 *  3. GET sul link → Better Auth setta cookie + redirect a /today
 */

import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import type { APIRequestContext, BrowserContext } from "@playwright/test";

const MAGIC_LINK_DIR = join(process.cwd(), ".e2e-magic-links");

function safeFilename(email: string): string {
  return email.replace(/[^a-zA-Z0-9._-]/g, "_") + ".txt";
}

async function waitForMagicLink(email: string, timeoutMs = 10_000): Promise<string> {
  const filepath = join(MAGIC_LINK_DIR, safeFilename(email));
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const content = (await readFile(filepath, "utf8")).trim();
      if (content.startsWith("http")) return content;
    } catch {
      // ignore ENOENT
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(
    `Magic link non trovato per ${email} dopo ${timeoutMs}ms. Hai avviato il dev server con E2E_TEST=1?`,
  );
}

export async function clearMagicLinkFiles(): Promise<void> {
  try {
    await rm(MAGIC_LINK_DIR, { recursive: true, force: true });
    await mkdir(MAGIC_LINK_DIR, { recursive: true });
  } catch {
    // ignora
  }
}

/**
 * Esegue il flow magic-link via API + visita il link → sessione attiva.
 * Da chiamare in globalSetup; il cookie viene salvato in storageState.
 */
export async function signInViaMagicLink(opts: {
  context: BrowserContext;
  request: APIRequestContext;
  email: string;
  baseURL: string;
}): Promise<void> {
  // Pulisce eventuali link precedenti per questa email
  try {
    await rm(join(MAGIC_LINK_DIR, safeFilename(opts.email)), { force: true });
  } catch {
    // ignora
  }

  const res = await opts.request.post(
    `${opts.baseURL}/api/auth/sign-in/magic-link`,
    {
      data: { email: opts.email, callbackURL: "/today" },
    },
  );
  if (!res.ok()) {
    throw new Error(
      `magic-link signin POST fallito: ${res.status()} ${await res.text()}`,
    );
  }

  const link = await waitForMagicLink(opts.email);

  // Visita il link nel context Playwright → Better Auth setta cookie firmato
  const page = await opts.context.newPage();
  await page.goto(link);
  // Attendi che ci siamo sulla /today o ovunque ci porti il callback
  await page.waitForURL(/\/(today|app|inbox|projects)/, { timeout: 10_000 });
  await page.close();
}
