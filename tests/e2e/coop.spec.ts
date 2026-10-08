import { test, expect, type Browser, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { dragPart, waitStage } from "./helpers";

// Real two-client relay co-op against the production server (static / + ws /ws).
// Level 3: the host builds the left stretch, the guest must finish the domino run
// in the right stretch; both press Ready and the same run plays on both screens.
const PORT = 8930;
let srv: ChildProcess;
const shot = async (p: Page, name: string): Promise<void> => { if (process.env.SHOT_DIR) await p.screenshot({ path: `${process.env.SHOT_DIR}/${name}.png` }); };
const placements = (p: Page): Promise<number> => p.evaluate(() => (window as unknown as { __trsStage: { placements(): number } }).__trsStage.placements());

test.beforeAll(async () => {
  srv = spawn("node", ["dist-server/src/server/main.js"], { env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(`http://localhost:${PORT}/healthz`); if (r.ok) return; } catch { /* starting */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("room server did not start");
});
test.afterAll(() => srv.kill());

test("two players build one machine in relay and see the same run", async ({ browser }: { browser: Browser }) => {
  test.setTimeout(120000);
  const host = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const guest = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  // host picks the scene, then opens a room for it
  await host.goto(`http://localhost:${PORT}/`);
  await host.getByRole("button", { name: "Play", exact: true }).click();
  await host.getByRole("button", { name: /Through the Arch/ }).click();
  await waitStage(host);
  await host.getByRole("button", { name: "Back to scenes" }).click();
  await host.getByRole("button", { name: "‹ Back" }).click();
  await host.getByRole("button", { name: "Play together" }).click();
  await host.getByRole("button", { name: "Start a room" }).click();
  await waitStage(host);
  const code = (await host.locator(".room-chip b").innerText()).trim();
  expect(code).toMatch(/^[A-Z0-9]{4,8}$/);

  await guest.goto(`http://localhost:${PORT}/`);
  await guest.getByRole("button", { name: "Play together" }).click();
  await guest.getByLabel("Room code").fill(code);
  await guest.getByRole("button", { name: "Join" }).click();
  await waitStage(guest);
  await expect(host.locator(".room-chip")).toContainText("2 players");
  await expect(guest.locator(".room-chip")).toContainText("2 players");
  await expect(guest.locator(".level-name")).toContainText("Through the Arch");
  await expect(host.getByText(/You build the left stretch/)).toBeVisible();
  await expect(guest.getByText(/You build the right stretch/)).toBeVisible();
  const clipped = await host.evaluate(() => [...document.querySelectorAll<HTMLElement>(".stamp-label, .level-name .name, .room-chip")].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent));
  expect(clipped).toEqual([]);

  await dragPart(host, "ramp", 7, 6);
  for (const x of [10, 11, 12, 13]) await dragPart(host, "domino", x, 10);
  await expect.poll(() => placements(guest)).toBe(5);

  // the guest cannot build in the host's stretch
  const { a, b } = await guest.evaluate(() => {
    const s = (window as unknown as { __trsStage: { slot(k: string): { x: number; y: number }; cell(x: number, y: number): { x: number; y: number } } }).__trsStage;
    return { a: s.slot("domino"), b: s.cell(9.5, 11) };
  });
  await guest.mouse.move(a.x, a.y); await guest.mouse.down(); await guest.mouse.move(b.x, b.y, { steps: 8 }); await guest.mouse.up();
  await expect(guest.getByText("That stretch belongs to your partner.")).toBeVisible();
  expect(await placements(guest)).toBe(5);

  await dragPart(guest, "domino", 14, 10);
  await expect.poll(() => placements(host)).toBe(6);
  await shot(host, "coop-host-built");
  await shot(guest, "coop-guest-built");

  await host.getByRole("button", { name: "Ready" }).click();
  await expect(guest.getByText("1/2 ready")).toBeVisible();
  await shot(guest, "coop-guest-waiting");
  await guest.getByRole("button", { name: "Ready" }).click();
  await host.waitForTimeout(9000);
  await shot(host, "coop-host-mid");
  await shot(guest, "coop-guest-mid");
  await expect(host.getByText("The record stands.")).toBeVisible({ timeout: 40000 });
  await expect(guest.getByText("The record stands.")).toBeVisible({ timeout: 40000 });
  await shot(host, "coop-host-end");
  await shot(guest, "coop-guest-end");

  // either player can send the room back to building; both screens follow
  await guest.getByRole("button", { name: "Replay" }).click();
  await expect(host.getByRole("button", { name: "Ready" })).toBeVisible();
});
