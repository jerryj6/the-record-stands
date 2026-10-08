import { defineConfig } from "@playwright/test";

// HUD layout guard: no clipped or overlapping labels at 1280x800 and 390x844.
// (Pixel baselines were retired with the rework — they accepted glitches.)
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "visual.spec.ts",
  use: { baseURL: "http://localhost:4173" },
  webServer: { command: "npx vite preview --port 4173", port: 4173, reuseExistingServer: true },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
