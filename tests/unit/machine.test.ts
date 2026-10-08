import { describe, expect, it } from "vitest";
import { L1, L2, L3, MACHINE_LEVELS } from "../../src/content/machine/levels";
import { runMachine } from "../../src/engine/machine/sim";
import { canPlace } from "../../src/engine/machine/geometry";
import { applyBuild, initialBuild, rangeFor, validateBuild } from "../../src/engine/machine/editor";
import type { MachineLevel, PartKind, Placement } from "../../src/engine/machine/types";

const P = (id: string, kind: PartKind, gx: number, gy: number, flip = false): Placement => ({ id, kind, gx, gy, flip });

const L3_SOLUTION = [P("a", "ramp", 7, 6), P("d0", "domino", 8, 10), P("d00", "domino", 9, 10), P("d1", "domino", 10, 10), P("d2", "domino", 11, 10), P("d3", "domino", 12, 10), P("d4", "domino", 13, 10), P("d5", "domino", 14, 10)];

function legal(level: MachineLevel, pl: Placement[]): void {
  pl.forEach((p, i) => expect(canPlace(level, pl.slice(0, i), p.kind, p.gx, p.gy, p.flip), `${p.id}`).toEqual({ ok: true }));
  for (const [kind, n] of Object.entries(level.inventory)) expect(pl.filter((p) => p.kind === kind).length).toBeLessThanOrEqual(n);
}

describe("level 1 — The Bell at Dawn", () => {
  it("a ramp under the ledge rings the bell and the cake survives", () => {
    const pl = [P("a", "ramp", 9, 5)];
    legal(L1, pl);
    const r = runMachine(L1, pl);
    expect(r.verdict.success).toBe(true);
    expect(r.verdict.stamps[0]!.hitTick).toBeGreaterThan(0);
  });
  it("with no parts the marble drops into the canal and the stamp stays dark", () => {
    const r = runMachine(L1, []);
    expect(r.verdict.success).toBe(false);
    expect(r.verdict.stamps[0]!.hitTick).toBeNull();
    expect(r.events.some((e) => e.type === "plop")).toBe(true);
  });
  it("a ramp one row too low sends the marble under the bell into the cake", () => {
    const r = runMachine(L1, [P("a", "ramp", 9, 7)]);
    expect(r.verdict.success).toBe(false);
    expect(r.verdict.cakeSafe).toBe(false);
    expect(r.verdict.reasons.join(" ")).toMatch(/cake/);
  });
});

describe("level 2 — Two Witnesses", () => {
  it("a long ramp vaults the arcade bell: fountain first, arcade on the rebound", () => {
    const pl = [P("a", "rampLong", 8, 4)];
    legal(L2, pl);
    const r = runMachine(L2, pl);
    expect(r.verdict.success).toBe(true);
    const [f, a] = r.verdict.stamps;
    expect(f!.hitTick!).toBeLessThan(a!.hitTick!);
  });
  it("the obvious short ramp rings the arcade bell first and the stamp row shows the order failure", () => {
    const r = runMachine(L2, [P("a", "ramp", 8, 4)]);
    expect(r.verdict.success).toBe(false);
    const arcade = r.verdict.stamps[1]!;
    expect(arcade.hitTick).not.toBeNull();
    expect(arcade.inOrder).toBe(false);
    expect(r.events.some((e) => e.type === "stampWrongOrder")).toBe(true);
    expect(r.verdict.reasons.join(" ")).toMatch(/before/);
  });
});

describe("level 3 — Through the Arch", () => {
  it("ramp + domino run tips the brake: both bells in order, trolley passes the arch, cake safe", () => {
    legal(L3, L3_SOLUTION);
    const r = runMachine(L3, L3_SOLUTION);
    expect(r.verdict.success).toBe(true);
    const ticks = r.verdict.stamps.map((s) => s.hitTick!);
    expect(ticks[0]!).toBeLessThan(ticks[1]!);
    expect(ticks[1]!).toBeLessThan(ticks[2]!);
    expect(r.events.some((e) => e.type === "release")).toBe(true);
    expect(r.events.some((e) => e.type === "safe")).toBe(true);
  });
  it("a domino left standing on the track wrecks the trolley and the cake", () => {
    const r = runMachine(L3, [...L3_SOLUTION, P("d6", "domino", 23, 10)]);
    expect(r.verdict.success).toBe(false);
    expect(r.verdict.cakeSafe).toBe(false);
    expect(r.events.some((e) => e.type === "crash")).toBe(true);
  });
  it("without the domino run the trolley never leaves", () => {
    const r = runMachine(L3, [P("a", "ramp", 7, 6)]);
    expect(r.verdict.success).toBe(false);
    expect(r.verdict.stamps[2]!.hitTick).toBeNull();
  });
});

describe("determinism", () => {
  it("identical inputs give identical event streams", () => {
    for (const [level, pl] of [[L1, [P("a", "ramp", 9, 5)]], [L3, L3_SOLUTION]] as const) {
      const a = runMachine(level, pl);
      const b = runMachine(level, pl.map((p) => ({ ...p })));
      expect(JSON.stringify(a.events)).toBe(JSON.stringify(b.events));
      expect(a.ticks).toBe(b.ticks);
    }
  });
  it("every level terminates within its tick budget for random legal builds", () => {
    let seed = 7;
    const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
    for (const level of MACHINE_LEVELS) {
      for (let i = 0; i < 40; i++) {
        const pl: Placement[] = [];
        for (const [kind, n] of Object.entries(level.inventory) as Array<[PartKind, number]>) {
          for (let k = 0; k < n; k++) {
            const gx = rnd(level.cols); const gy = rnd(level.rows); const flip = rnd(2) === 1;
            if (canPlace(level, pl, kind, gx, gy, flip).ok) pl.push(P(`r${pl.length}`, kind, gx, gy, flip));
          }
        }
        const r = runMachine(level, pl);
        expect(r.ticks).toBeLessThanOrEqual(level.maxTicks);
        for (const e of r.events) expect(Number.isInteger(e.x) && Number.isInteger(e.y)).toBe(true);
      }
    }
  });
});

describe("placement rules", () => {
  it("rejects stone, overlaps, unsupported dominoes and off-scene spots", () => {
    expect(canPlace(L1, [], "ramp", 2, 4, false).ok).toBe(false);
    expect(canPlace(L1, [P("a", "ramp", 9, 5)], "ramp", 10, 5, false).ok).toBe(false);
    expect(canPlace(L3, [], "domino", 10, 5, false).ok).toBe(false);
    expect(canPlace(L1, [], "ramp", 27, 0, false).ok).toBe(false);
    expect(canPlace(L3, [], "domino", 10, 10, false).ok).toBe(true);
  });
});

describe("build reducer and relay stretches", () => {
  it("place / move / flip / remove respect the inventory", () => {
    let s = initialBuild(L1.id);
    const place = { type: "place", kind: "ramp", gx: 9, gy: 7, flip: false } as const;
    expect(validateBuild(L1, s, place)).toEqual({ ok: true });
    s = applyBuild(s, "solo", place, false);
    expect(validateBuild(L1, s, place).ok).toBe(false);
    s = applyBuild(s, "solo", { type: "move", id: "p1", gx: 9, gy: 5 }, false);
    expect(runMachine(L1, s.placements).verdict.success).toBe(true);
    s = applyBuild(s, "solo", { type: "flip", id: "p1" }, false);
    expect(s.placements[0]!.flip).toBe(true);
    s = applyBuild(s, "solo", { type: "remove", id: "p1" }, false);
    expect(s.placements).toEqual([]);
  });
  it("two players each build only in their own stretch; ready from both starts the run", () => {
    const a = rangeFor(L3, 1, 2)!;
    const b = rangeFor(L3, 2, 2)!;
    expect(a).toEqual({ from: 0, to: 14 });
    expect(b).toEqual({ from: 14, to: 32 });
    let s = initialBuild(L3.id);
    expect(validateBuild(L3, s, { type: "place", kind: "domino", gx: 20, gy: 10, flip: false }, a).ok).toBe(false);
    expect(validateBuild(L3, s, { type: "place", kind: "domino", gx: 10, gy: 10, flip: false }, a).ok).toBe(true);
    s = applyBuild(s, "A", { type: "ready", on: true }, false);
    expect(s.phase).toBe("build");
    s = applyBuild(s, "B", { type: "ready", on: true }, true);
    expect(s.phase).toBe("run");
    expect(s.runSeq).toBe(1);
    expect(validateBuild(L3, s, { type: "place", kind: "ramp", gx: 7, gy: 6, flip: false }).ok).toBe(false);
  });
});
