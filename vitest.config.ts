import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    coverage: {
      reporter: ["text", "html"],
      exclude: [
        "node_modules/",
        ".next/",
        "drizzle/",
        "tests/e2e/**",
        "**/*.config.*",
        "**/types.ts",
      ],
    },
    include: ["tests/unit/**/*.{test,spec}.ts?(x)", "tests/integration/**/*.{test,spec}.ts?(x)"],
    exclude: ["tests/e2e/**", "node_modules", ".next"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
