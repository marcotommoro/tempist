import { defineConfig } from "tsup";

/**
 * Bundle del migrator per il container di produzione.
 * `noExternal` inlina drizzle-orm e pg nel file finale, così il runtime
 * dell'app (Next.js standalone, ~50MB) non deve mantenere node_modules dev.
 */
export default defineConfig({
  entry: ["scripts/migrate.ts"],
  outDir: "dist/migrate",
  format: ["cjs"],
  target: "node20",
  noExternal: [/^drizzle-orm($|\/)/, /^pg($|-)/],
  clean: true,
});
