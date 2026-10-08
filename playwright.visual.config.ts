import { defineConfig } from "@playwright/test";

// Visual baselines: screenshots of the title screen, case select, and
// the TRS-01 scene. First run writes baselines under
// tests/e2e/visual.spec.ts-snapshots; later runs diff against them.
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "visual.spec.ts",
  use: { baseURL: "http://localhost:4173" },
  webServer: { command: "npx vite preview --port 4173", port: 4173, reuseExistingServer: true },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
