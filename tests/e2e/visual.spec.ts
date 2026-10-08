import { test, expect } from "@playwright/test";
import { waitStage } from "./helpers";

// Layout guard (not pixel baselines): every HUD label is fully visible and no
// two HUD boxes overlap, at laptop and phone sizes, on every slice level.
const SIZES = [{ width: 1280, height: 800 }, { width: 390, height: 844 }];
const LEVELS = ["The Bell at Dawn", "Two Witnesses", "Through the Arch", "The Wind-up Parade", "Bucket Brigade", "The Clockwork Gate", "The Second Marble", "The Seesaw Toss", "The Long Toss"];

for (const size of SIZES) {
  for (const title of LEVELS) {
    test(`${title} HUD at ${size.width}x${size.height}`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto("/");
      await page.getByRole("button", { name: "Play", exact: true }).click();
      await page.getByRole("button", { name: new RegExp(title) }).click();
      await waitStage(page);
      const report = await page.evaluate(() => {
        const sel = ".hud-top .icon-btn, .level-name, .stamp, .play-btn, .speed, .room-chip";
        const els = [...document.querySelectorAll<HTMLElement>(sel)];
        const clipped = [...document.querySelectorAll<HTMLElement>(".stamp-label, .level-name .name, .play-btn span")]
          .filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent);
        const boxes = els.map((e) => ({ t: e.className, r: e.getBoundingClientRect() }));
        const overlaps: string[] = [];
        for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i]!.r; const b = boxes[j]!.r;
          if (boxes[i]!.t === "level-name" || boxes[j]!.t === "level-name") {
            if (a.right > b.left + 1 && b.right > a.left + 1 && a.bottom > b.top + 1 && b.bottom > a.top + 1 && !(els[i]!.contains(els[j]!) || els[j]!.contains(els[i]!))) overlaps.push(`${boxes[i]!.t} / ${boxes[j]!.t}`);
            continue;
          }
          if (a.right > b.left + 1 && b.right > a.left + 1 && a.bottom > b.top + 1 && b.bottom > a.top + 1 && !(els[i]!.contains(els[j]!) || els[j]!.contains(els[i]!))) overlaps.push(`${boxes[i]!.t} / ${boxes[j]!.t}`);
        }
        const offscreen = boxes.filter((b) => b.r.left < 0 || b.r.right > window.innerWidth + 0.5 || b.r.top < 0 || b.r.bottom > window.innerHeight + 0.5).map((b) => b.t);
        return { clipped, overlaps, offscreen };
      });
      expect(report).toEqual({ clipped: [], overlaps: [], offscreen: [] });
    });
  }
}
