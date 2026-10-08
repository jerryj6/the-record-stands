import { test, expect } from "@playwright/test";
import { dragPart, openLevel } from "./helpers";

// Regression: after winning a scene and pressing "Next scene", the first Play must run.
test("win a scene, go to the next one, build it, and the first Play runs to a verdict", async ({ page }) => {
  test.setTimeout(180000);
  await openLevel(page, "The Wind-up Parade");
  await dragPart(page, "toy", 9, 11);
  for (const x of [12, 13, 14, 15]) await dragPart(page, "domino", x, 10);
  await dragPart(page, "ramp", 23, 3, true);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByText("The record stands.")).toBeVisible({ timeout: 60000 });
  await page.getByRole("button", { name: "Next scene" }).click();
  await expect(page.locator(".level-name")).toContainText("Bucket Brigade");
  await dragPart(page, "rampLong", 7, 5);
  await dragPart(page, "bucket", 17, 10);
  await dragPart(page, "ramp", 2, 10);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByText(/The record (stands|doesn't hold)\./)).toBeVisible({ timeout: 60000 });
});
