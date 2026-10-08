import { describe, expect, it } from "vitest";
import { L1, L2, L3 } from "../../src/content/machine/levels";
import { canPlace } from "../../src/engine/machine/geometry";
import { runMachine } from "../../src/engine/machine/sim";
import type { MachineLevel, PartKind, Placement } from "../../src/engine/machine/types";

/** Exhaustive single-part search: how many one-part builds solve a level. */
function singlePartSolutions(level: MachineLevel, kinds: PartKind[]): Placement[] {
  const out: Placement[] = [];
  for (const kind of kinds) for (const flip of [false, true]) for (let gx = 0; gx < level.cols; gx++) for (let gy = 0; gy < level.rows; gy++) {
    if (!canPlace(level, [], kind, gx, gy, flip).ok) continue;
    const p = { id: "x", kind, gx, gy, flip };
    if (runMachine(level, [p]).verdict.success) out.push(p);
  }
  return out;
}

describe("puzzle depth (not trivially solvable)", () => {
  it("level 1: only a narrow band of ramp spots works", () => {
    const sols = singlePartSolutions(L1, ["ramp"]);
    expect(sols.length).toBeGreaterThan(0);
    expect(sols.length).toBeLessThanOrEqual(6);
  });
  it("level 2: no single short ramp solves it — the obvious build rings in the wrong order", () => {
    expect(singlePartSolutions(L2, ["ramp"])).toHaveLength(0);
    expect(singlePartSolutions(L2, ["rampLong"]).length).toBeGreaterThan(0);
  });
  it("level 3 relay: the left stretch alone cannot finish — the chain must cross into the right stretch", () => {
    const left = [
      { id: "a", kind: "ramp" as const, gx: 7, gy: 6, flip: false },
      ...[10, 11, 12, 13].map((gx, i) => ({ id: `d${i}`, kind: "domino" as const, gx, gy: 10, flip: false })),
    ];
    expect(runMachine(L3, left).verdict.success).toBe(false);
    expect(runMachine(L3, [...left, { id: "d9", kind: "domino", gx: 14, gy: 10, flip: false }]).verdict.success).toBe(true);
  });
  it("level 3: no single part solves it — it needs a combined chain", () => {
    expect(singlePartSolutions(L3, ["ramp", "domino", "bucket", "toy"])).toHaveLength(0);
  });
});
