# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: next-scene.spec.ts >> win a scene, go to the next one, build it, and the first Play runs to a verdict
- Location: tests/e2e/next-scene.spec.ts:5:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/The record (stands|doesn't hold)\./)
Expected: visible
Timeout: 60000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText(/The record (stands|doesn't hold)\./) with timeout 60000ms
  - waiting for getByText(/The record (stands|doesn't hold)\./)

```

```yaml
- banner:
  - button "Back to scenes": ‹
  - text: 5 Bucket Brigade
  - button "Mute": ♪
  - list "Witness record":
    - listitem: 1 MARKET BELL RINGS
    - listitem: 2 TROLLEY PASSES ARCH
    - listitem: CAKE SURVIVES
- button "2×"
- button "Reset"
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { dragPart, openLevel } from "./helpers";
  3  | 
  4  | // Regression: after winning a scene and pressing "Next scene", the first Play must run.
  5  | test("win a scene, go to the next one, build it, and the first Play runs to a verdict", async ({ page }) => {
  6  |   test.setTimeout(180000);
  7  |   await openLevel(page, "The Wind-up Parade");
  8  |   await dragPart(page, "toy", 9, 11);
  9  |   for (const x of [12, 13, 14, 15]) await dragPart(page, "domino", x, 10);
  10 |   await dragPart(page, "ramp", 23, 3, true);
  11 |   await page.getByRole("button", { name: "Play", exact: true }).click();
  12 |   await expect(page.getByText("The record stands.")).toBeVisible({ timeout: 60000 });
  13 |   await page.getByRole("button", { name: "Next scene" }).click();
  14 |   await expect(page.locator(".level-name")).toContainText("Bucket Brigade");
  15 |   await dragPart(page, "rampLong", 7, 5);
  16 |   await dragPart(page, "bucket", 21, 10);
  17 |   await dragPart(page, "ramp", 2, 10);
  18 |   await page.getByRole("button", { name: "Play", exact: true }).click();
> 19 |   await expect(page.getByText(/The record (stands|doesn't hold)\./)).toBeVisible({ timeout: 60000 });
     |                                                                      ^ Error: expect(locator).toBeVisible() failed
  20 | });
  21 | 
```