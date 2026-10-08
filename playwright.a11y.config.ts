import { defineConfig } from "@playwright/test";

// Accessibility sweep: axe-core across the three entry surfaces
// (title → case select → TRS-01 scene). Same server pattern as the
// base config; run with `npx playwright test --config playwright.a11y.config.ts`.
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "a11y.spec.ts",
  use: { baseURL: "http://localhost:4173" },
  webServer: { command: "npx vite preview --port 4173", port: 4173, reuseExistingServer: true },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
