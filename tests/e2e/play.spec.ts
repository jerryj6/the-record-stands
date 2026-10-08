import { test, expect } from "@playwright/test";
import { dragPart, openLevel } from "./helpers";

// Solo play through the real UI: drag from tray, press Play, watch the run end.
test.describe("solo slice", () => {
  test("level 1: a wrong ramp fails, the right ramp rings the bell", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await openLevel(page, "The Bell at Dawn");
    await dragPart(page, "ramp", 9, 7);
    await page.getByRole("button", { name: "2×" }).click();
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(page.getByText("The record doesn't hold.")).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/splattered the cake/)).toBeVisible();
    await page.getByRole("button", { name: "Back to building" }).click();
    await page.getByRole("button", { name: "Play", exact: true }).waitFor();
    await page.evaluate(() => undefined);
    // move the ramp two rows up
    const { a, b } = await page.evaluate(() => {
      const s = (window as unknown as { __trsStage: { cell(x: number, y: number): { x: number; y: number } } }).__trsStage;
      return { a: s.cell(10, 7.5), b: s.cell(10, 5.5) };
    });
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 8 });
    await page.mouse.up();
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(page.getByText("The record stands.")).toBeVisible({ timeout: 20000 });
    await expect(page.locator(".stamp.lit", { hasText: "BELL RINGS" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("level 2: the short ramp shows the order failure in the stamp row", async ({ page }) => {
    await openLevel(page, "Two Witnesses");
    await dragPart(page, "ramp", 8, 4);
    await page.getByRole("button", { name: "2×" }).click();
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(page.locator(".stamp.wrong", { hasText: "ARCADE BELL RINGS" })).toBeVisible({ timeout: 20000 });
    await expect(page.getByText("too early")).toBeVisible();
  });

  test("level 3: the full chain releases the trolley through the arch", async ({ page }) => {
    test.setTimeout(90000);
    await openLevel(page, "Through the Arch");
    await dragPart(page, "ramp", 7, 6);
    for (const x of [10, 11, 12, 13, 14]) await dragPart(page, "domino", x, 10);
    await page.getByRole("button", { name: "2×" }).click();
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(page.getByText("The record stands.")).toBeVisible({ timeout: 60000 });
  });
});
