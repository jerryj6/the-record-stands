import { test, expect } from "@playwright/test";

// Visual baselines for the three entry surfaces. First run writes the
// snapshots; subsequent runs diff with a small anti-alias tolerance.
test.describe("visual baselines", () => {
  test("title screen", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Open the case files" })).toBeVisible();
    await expect(page).toHaveScreenshot("title.png", { maxDiffPixelRatio: 0.02 });
  });

  test("case select", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open the case files" }).click();
    await expect(page.getByRole("button", { name: /TRS-01/ })).toBeVisible();
    await expect(page).toHaveScreenshot("case-select.png", { maxDiffPixelRatio: 0.02 });
  });

  test("TRS-01 scene", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open the case files" }).click();
    await page.getByRole("button", { name: /TRS-01/ }).click();
    await expect(page.getByRole("button", { name: "Run simulation" })).toBeVisible();
    await expect(page).toHaveScreenshot("trs-01-scene.png", { maxDiffPixelRatio: 0.03 });
  });
});
