import { test, expect } from "@playwright/test";

test("TRS-01 full solve flow: redirect + toy → present findings", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open the case files" }).click();
  await page.getByRole("button", { name: /TRS-01/ }).click();
  await expect(page.getByText(/Budget 0\/2/)).toBeVisible();
  // baseline run: account fails
  await page.getByRole("button", { name: "Run simulation" }).click();
  await expect(page.getByText("The account does not hold.")).toBeVisible();
  // apply winning repair
  await page.getByRole("button", { name: /Junction →/ }).click();
  await page.getByRole("button", { name: /Wind-up toy/ }).click();
  await expect(page.getByText(/Budget 2\/2/)).toBeVisible();
  await page.getByRole("button", { name: "Run simulation" }).click();
  await expect(page.getByText("All evidence supports the account.")).toBeVisible();
  await page.getByRole("button", { name: "Present findings" }).click();
  await expect(page.getByText("Case closed")).toBeVisible();
});

test("over-budget config is rejected with explanation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open the case files" }).click();
  await page.getByRole("button", { name: /TRS-01/ }).click();
  await page.getByRole("button", { name: /Junction →/ }).click();
  await page.getByRole("button", { name: /Wind-up toy/ }).click();
  await page.getByRole("button", { name: /Valve:/ }).click();
  await page.getByRole("button", { name: "Run simulation" }).click();
  await expect(page.getByText(/Committed 3 intervention/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Present findings" })).toBeDisabled();
});
