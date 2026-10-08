import { test, expect, type Page } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import { waitStage } from "./helpers";

// axe-core sweep of the entry surfaces and the play HUD. Zero serious/critical.
async function axeCheck(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  expect(blocking, `[${label}] ${blocking.map((v) => `${v.id}(${v.nodes.length})`).join(", ")}`).toHaveLength(0);
}

test("title screen", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await axeCheck(page, "title");
});
test("scene select", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("button", { name: /The Bell at Dawn/ })).toBeVisible();
  await axeCheck(page, "levels");
});
test("play HUD", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: /Through the Arch/ }).click();
  await waitStage(page);
  await axeCheck(page, "play");
});
