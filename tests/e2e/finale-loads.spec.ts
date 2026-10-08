import { test, expect } from "@playwright/test";

// Finale smoke: TRS-11 and TRS-12 load their boards in the live client —
// budget line + run button render, zero page errors.
for (const id of ["TRS-11", "TRS-12"]) {
  test(`${id} board loads clean`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await page.getByRole("button", { name: "Open the case files" }).click();
    await page.getByRole("button", { name: new RegExp(id) }).click();
    await expect(page.getByText(/Budget 0\/\d+/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Run simulation" })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
