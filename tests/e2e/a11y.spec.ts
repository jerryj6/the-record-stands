import { test, expect, type Page } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

// axe-core sweep of the three entry surfaces. We assert zero
// serious/critical violations; minor/moderate findings are reported but
// non-blocking (they are logged into the test output for triage).
test.describe("accessibility (axe-core)", () => {
  async function axeCheck(page: Page, label: string) {
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter(v => v.impact === "critical" || v.impact === "serious");
    const advisory = results.violations.filter(v => v.impact === "moderate" || v.impact === "minor");
    if (advisory.length) {
      console.log(`[a11y:${label}] ${advisory.length} advisory finding(s):`,
        advisory.map(v => v.id).join(", "));
    }
    expect(blocking, `[${label}] serious/critical violations: ${
      blocking.map(v => `${v.id}(${v.nodes.length})`).join(", ")
    }`).toHaveLength(0);
  }

  test("title screen", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Open the case files" })).toBeVisible();
    await axeCheck(page, "title");
  });

  test("case select", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open the case files" }).click();
    await expect(page.getByRole("button", { name: /TRS-01/ })).toBeVisible();
    await axeCheck(page, "case-select");
  });

  test("TRS-01 scene", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open the case files" }).click();
    await page.getByRole("button", { name: /TRS-01/ }).click();
    await expect(page.getByRole("button", { name: "Run simulation" })).toBeVisible();
    await axeCheck(page, "trs-01-scene");
  });
});
