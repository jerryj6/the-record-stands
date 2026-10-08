import { test, expect, type Browser } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";

// Real two-client co-op: two browser pages against the production server
// (static / + ws /ws on one port). Host creates a room, guest joins by code,
// host commits a command, guest's board updates via lockstep fold.

const PORT = 8930;
let srv: ChildProcess;

test.beforeAll(async () => {
  srv = spawn("node", ["dist-server/src/server/main.js"], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: "ignore",
  });
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) return; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error("room server did not start");
});

test.afterAll(() => srv.kill());

test("two clients share one authoritative room", async ({ browser }: { browser: Browser }) => {
  const host = await browser.newPage();
  const guest = await browser.newPage();

  await host.goto(`http://localhost:${PORT}/`);
  await host.getByText("Play together").click();
  await host.getByText(/Host a room/).click();
  await expect(host.getByText(/Room [A-Z0-9]+/)).toBeVisible();
  const code = (await host.locator(".badge", { hasText: "Room" }).innerText()).replace("Room ", "");

  await guest.goto(`http://localhost:${PORT}/`);
  await guest.getByText("Play together").click();
  await guest.getByPlaceholder("Room code").fill(code);
  await guest.getByText("Join", { exact: true }).click();
  await expect(guest.getByText(new RegExp(`Room ${code}`))).toBeVisible();

  // Host commits an intervention (junction redirect — 1 cost); guest must
  // see the budget badge update via the server broadcast.
  await host.getByText(/Junction → Arcade lane/).first().click();
  await expect(guest.getByText(/Budget 1\/2/)).toBeVisible({ timeout: 5000 });

  // Guest commits too; host sees budget 2.
  await guest.getByText(/Wind-up toy at bellSocket/).first().click();
  await expect(host.getByText(/Budget 2\/2/)).toBeVisible({ timeout: 5000 });

  await host.close(); await guest.close();
});
