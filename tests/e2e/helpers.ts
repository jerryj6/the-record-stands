import { expect, type Page } from "@playwright/test";
import { FOOTPRINT } from "../../src/engine/machine/geometry";
import type { PartKind } from "../../src/engine/machine/types";

interface Probe { cell(gx: number, gy: number): { x: number; y: number; u: number }; slot(k: string): { x: number; y: number } | null; placements(): number; running(): boolean }

export async function waitStage(page: Page): Promise<void> {
  await page.waitForFunction(() => !!(window as unknown as { __trsStage?: Probe }).__trsStage?.slot("ramp") || !!(window as unknown as { __trsStage?: Probe }).__trsStage?.slot("domino"));
}

/** Drag a part from the tray so its footprint lands at (gx, gy). */
export async function dragPart(page: Page, kind: PartKind, gx: number, gy: number, flip = false): Promise<void> {
  const f = FOOTPRINT[kind];
  const before = await page.evaluate(() => (window as unknown as { __trsStage: Probe }).__trsStage.placements());
  const { from, to } = await page.evaluate(([k, x, y]) => {
    const s = (window as unknown as { __trsStage: Probe }).__trsStage;
    return { from: s.slot(k as string)!, to: s.cell(x as number, y as number) };
  }, [kind, gx + f.w / 2, gy + f.h / 2] as const);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 6 });
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __trsStage: Probe }).__trsStage.placements())).toBe(before + 1);
  if (flip) { await page.waitForTimeout(150); await page.mouse.click(to.x, to.y); await page.waitForTimeout(150); }
}

export async function openLevel(page: Page, title: string): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: new RegExp(title) }).click();
  await waitStage(page);
}
