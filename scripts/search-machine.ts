import { machineLevel } from "../src/content/machine/levels";
import { runMachine } from "../src/engine/machine/sim";
import { canPlace } from "../src/engine/machine/geometry";
import type { PartKind, Placement } from "../src/engine/machine/types";

const [levelId, kindsArg, base, colsArg, rowsArg] = process.argv.slice(2);
const level = machineLevel(levelId!);
const kinds = (kindsArg ?? "ramp").split(",") as PartKind[];
const basePl: Placement[] = JSON.parse(base ?? "[]");
const [c0, c1] = (colsArg ?? "0-27").split("-").map(Number) as [number, number];
const [r0, r1] = (rowsArg ?? "0-13").split("-").map(Number) as [number, number];
let found = 0;
let tried = 0;
for (const kind of kinds) for (const flip of [false, true]) for (let gx = c0; gx <= c1; gx++) for (let gy = r0; gy <= r1; gy++) {
  if (!canPlace(level, basePl, kind, gx, gy, flip).ok) continue;
  const pl = [...basePl, { id: `x${basePl.length}`, kind, gx, gy, flip }];
  tried++;
  const r = runMachine(level, pl);
  const hits = r.verdict.stamps.filter((s) => s.hitTick !== null && s.inOrder).length;
  if (r.verdict.success || hits > 0) {
    found++;
    console.log(r.verdict.success ? "SOLVE" : `hits${hits}`, JSON.stringify(pl.slice(basePl.length)), r.verdict.reasons.join(" / "));
  }
}
console.log("tried", tried, "found", found);
