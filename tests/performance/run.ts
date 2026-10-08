// Simulation cost per full run, per slice level (budget: < 50 ms on a laptop).
import { performance } from "node:perf_hooks";
import { MACHINE_LEVELS } from "../../src/content/machine/levels.js";
import { runMachine } from "../../src/engine/machine/sim.js";
import { SOLUTIONS } from "../lib/solutions.js";

let fail = false;
for (const level of MACHINE_LEVELS) {
  const sol = SOLUTIONS[level.id] ?? [];
  const t0 = performance.now();
  const N = 20;
  for (let i = 0; i < N; i++) runMachine(level, sol);
  const ms = (performance.now() - t0) / N;
  console.log(`${level.id}: ${ms.toFixed(2)} ms per full run`);
  if (ms > 50) fail = true;
}
process.exit(fail ? 1 : 0);
