import { describe, expect, it } from "vitest";
import { MACHINE_LEVELS } from "../../src/content/machine/levels";
import { canPlace } from "../../src/engine/machine/geometry";
import { runMachine } from "../../src/engine/machine/sim";
import { FAILURES, SOLUTIONS } from "../lib/solutions";

describe("solo campaign: every slice level is completable and has a real failure", () => {
  for (const level of MACHINE_LEVELS) {
    it(`${level.number}. ${level.title} — solution is legal and succeeds`, () => {
      const sol = SOLUTIONS[level.id]!;
      expect(sol, "missing solution").toBeDefined();
      sol.forEach((p, i) => expect(canPlace(level, sol.slice(0, i), p.kind, p.gx, p.gy, p.flip).ok).toBe(true));
      for (const [kind, n] of Object.entries(level.inventory)) expect(sol.filter((p) => p.kind === kind).length).toBeLessThanOrEqual(n);
      const r = runMachine(level, sol);
      expect(r.verdict.success, r.verdict.reasons.join("; ")).toBe(true);
    });
    it(`${level.number}. ${level.title} — empty build fails`, () => {
      expect(runMachine(level, []).verdict.success).toBe(false);
    });
    it(`${level.number}. ${level.title} — near-miss build fails for the expected reason`, () => {
      const f = FAILURES[level.id]!;
      const v = runMachine(level, f.build).verdict;
      expect(v.success).toBe(false);
      if (f.expect === "cake") expect(v.cakeSafe).toBe(false);
      if (f.expect === "order") expect(v.stamps.some((s) => s.hitTick !== null && !s.inOrder)).toBe(true);
      if (f.expect === "missing") expect(v.stamps.some((s) => s.hitTick === null)).toBe(true);
    });
  }
});
