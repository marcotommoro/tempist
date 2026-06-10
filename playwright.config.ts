import { defineConfig, devices } from "@playwright/test";
import { join } from "node:path";

const STORAGE_STATE = join(__dirname, "tests", "e2e", ".auth", "user.json");

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  // Disabilitiamo il parallelismo aggressivo perché i test condividono
  // lo stesso user demo e leggono/scrivono lo stesso DB.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    // Test che NON richiedono auth (landing, sign-in page)
    {
      name: "public",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /\.public\.spec\.ts$/,
    },
    // Test che richiedono auth (la maggior parte)
    {
      name: "authed",
      use: {
        ...devices["Desktop Chrome"],
        storageState: STORAGE_STATE,
      },
      testIgnore: [/\.public\.spec\.ts$/, /\.mobile\.spec\.ts$/],
    },
    // Smoke test responsive su viewport mobile (Chromium, nessun browser extra)
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
        storageState: STORAGE_STATE,
      },
      testMatch: /\.mobile\.spec\.ts$/,
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        stdout: "pipe",
        stderr: "pipe",
        timeout: 120_000,
        env: { E2E_TEST: "1" },
      },
});
