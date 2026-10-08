import { describe, expect, it } from "vitest";
import { MACHINE_LEVELS } from "../../src/content/machine/levels";
import { canPlace, PART_KINDS } from "../../src/engine/machine/geometry";
import { runMachine } from "../../src/engine/machine/sim";
import { applyBuild, initialBuild, validateBuild, type BuildCommand } from "../../src/engine/machine/editor";
import type { Placement } from "../../src/engine/machine/types";

function rng(seed: number): (n: number) => number {
  let s = seed >>> 0;
  return (n) => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s % n; };
}

describe("machine properties", () => {
  it("runs are a pure function of level + build (200 random builds)", () => {
    const r = rng(42);
    for (let i = 0; i < 200; i++) {
      const level = MACHINE_LEVELS[r(MACHINE_LEVELS.length)]!;
      const pl: Placement[] = [];
      for (let k = 0; k < 6; k++) {
        const kind = PART_KINDS[r(PART_KINDS.length)]!;
        const gx = r(level.cols); const gy = r(level.rows); const flip = r(2) === 1;
        if ((level.inventory[kind] ?? 0) > pl.filter((p) => p.kind === kind).length && canPlace(level, pl, kind, gx, gy, flip).ok) pl.push({ id: `q${k}`, kind, gx, gy, flip });
      }
      const a = runMachine(level, pl);
      const b = runMachine(level, JSON.parse(JSON.stringify(pl)) as Placement[]);
      expect(JSON.stringify(a.events)).toBe(JSON.stringify(b.events));
      expect(a.verdict).toEqual(b.verdict);
      expect(a.ticks).toBeLessThanOrEqual(level.maxTicks);
    }
  });
  it("the build reducer never accepts an illegal state (random command streams)", () => {
    const r = rng(9);
    for (const level of MACHINE_LEVELS) {
      let st = initialBuild(level.id);
      for (let i = 0; i < 300; i++) {
        const kind = PART_KINDS[r(PART_KINDS.length)]!;
        const ids = st.placements.map((p) => p.id);
        const pick = ids[r(Math.max(1, ids.length))] ?? "p0";
        const cmds: BuildCommand[] = [
          { type: "place", kind, gx: r(level.cols), gy: r(level.rows), flip: r(2) === 1 },
          { type: "move", id: pick, gx: r(level.cols), gy: r(level.rows) },
          { type: "flip", id: pick },
          { type: "remove", id: pick },
        ];
        const cmd = cmds[r(cmds.length)]!;
        if (validateBuild(level, st, cmd).ok) st = applyBuild(st, "solo", cmd, false);
        st.placements.forEach((p, j) => expect(canPlace(level, st.placements.slice(0, j), p.kind, p.gx, p.gy, p.flip).ok).toBe(true));
        for (const [k, n] of Object.entries(level.inventory)) expect(st.placements.filter((p) => p.kind === k).length).toBeLessThanOrEqual(n);
      }
    }
  });
});
