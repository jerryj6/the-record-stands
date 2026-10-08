import { machineLevel } from "../src/content/machine/levels";
import { buildWorld, createSim, stepSim, verdictOf } from "../src/engine/machine/sim";
import { C, type Placement } from "../src/engine/machine/types";

const [levelId, json, every] = process.argv.slice(2);
const level = machineLevel(levelId ?? "gala-01");
const placements: Placement[] = JSON.parse(json ?? "[]");
const world = buildWorld(level, placements);
const st = createSim(world, placements);
const n = Number(every ?? 20);
const f = (v: number) => (v / C).toFixed(2);
let ev = 0;
while (!st.done) {
  stepSim(world, st);
  const line = st.marbles.map((m) => `${m.mode}@(${f(m.x)},${f(m.y)}) v(${m.vx},${m.vy}) s${m.s}`).join(" | ");
  const extra = [...st.toys.map((t) => `toy ${t.mode}@${f(t.x)}`), ...st.trolleys.map((t) => `trolley ${t.mode}@${f(t.x)}`), ...st.dominoes.map((d) => `${d.id}:${d.state}${d.ang}`)].join(" ");
  if (st.tick % n === 0) console.log(st.tick, line, extra);
  for (; ev < st.events.length; ev++) { const e = st.events[ev]!; if (e.type !== "bounce") console.log("   EVENT", e.tick, e.type, e.id, f(e.x), f(e.y)); }
}
console.log(JSON.stringify(verdictOf(world, st)));
