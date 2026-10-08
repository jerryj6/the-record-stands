/**
 * tests/performance/run.ts — campaign replay benchmark (gate G4).
 *
 * Replays EVERY registered winning trace for all 12 levels through the
 * production sim + evaluator (the same path TestRun uses), prints a
 * per-level table, and exits non-zero if the campaign regresses past the
 * configured budget.
 *
 * Budget knobs (env):
 *   TRS_PERF_PER_LEVEL_MS   per-level mean limit   (default 500)
 *   TRS_PERF_TOTAL_MS       whole-campaign limit   (default 6000)
 *   TRS_PERF_REPS           repetitions per trace  (default 20; mean reported)
 */
import { performance } from "node:perf_hooks";
import { LEVELS } from "../../src/content/levels/index.js";
import { WINNING_TRACES, replay } from "../lib/winning-traces.js";

const PER_LEVEL_MS = Number(process.env["TRS_PERF_PER_LEVEL_MS"] ?? 500);
const TOTAL_MS = Number(process.env["TRS_PERF_TOTAL_MS"] ?? 6000);
const REPS = Math.max(1, Number(process.env["TRS_PERF_REPS"] ?? 20));

interface Row {
  level: string;
  traces: number;
  meanMs: number;
  maxMs: number;
  solved: boolean;
}

const rows: Row[] = [];
let grandTotal = 0;
let failed = 0;

for (const { id, def } of LEVELS) {
  const traces = WINNING_TRACES[id] ?? [];
  const times: number[] = [];
  let allSolved = true;
  for (const trace of traces) {
    for (let r = 0; r < REPS; r++) {
      const t0 = performance.now();
      const { evaluation } = replay(def, trace.interventions);
      times.push(performance.now() - t0);
      if (!evaluation.success) allSolved = false;
    }
  }
  const mean = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  const max = times.length ? Math.max(...times) : 0;
  grandTotal += times.reduce((a, b) => a + b, 0);
  rows.push({ level: id, traces: traces.length, meanMs: mean, maxMs: max, solved: allSolved });
}

console.log("\nTRS campaign replay benchmark");
console.log(`reps/trace=${REPS}  per-level budget=${PER_LEVEL_MS}ms  total budget=${TOTAL_MS}ms\n`);
console.log("level   traces   mean ms   max ms   solved");
console.log("-----   ------   -------   ------   ------");
for (const r of rows) {
  const flag = r.meanMs > PER_LEVEL_MS ? "  ← OVER" : "";
  console.log(
    `${r.level.padEnd(7)} ${String(r.traces).padEnd(8)} ${r.meanMs.toFixed(2).padStart(7)} ${r.maxMs.toFixed(2).padStart(10)}   ${r.solved ? "yes" : "NO"}${flag}`,
  );
  if (!r.solved) failed++;
  if (r.meanMs > PER_LEVEL_MS) failed++;
}
console.log(`\nTOTAL simulated time: ${grandTotal.toFixed(2)}ms for ${REPS}× replays of every winning trace`);
if (grandTotal > TOTAL_MS) failed++;

if (failed > 0) {
  console.error(`FAIL: ${failed} budget/solve violation(s)`);
  process.exit(1);
}
console.log("PASS: all levels under budget, all traces solve.");
