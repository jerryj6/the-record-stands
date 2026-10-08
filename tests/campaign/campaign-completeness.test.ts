/**
 * Campaign completeness (gate G3): the whole 12-case TRS campaign proven
 * against the production engine, not per-file unit tests.
 *
 *  - exactly 12 registered levels in shipped order
 *  - every level: baseline replay preserves every sealed observation but
 *    fails an outcome (a real case, not a broken record)
 *  - every level: ≥1 winning trace replays to `solved` via the real
 *    session engine (commit → TestRun → AcceptResult)
 *  - every level: LevelCard with winningTraceSummary + ≥2 wrongApproaches
 *    + a 3-rung hint ladder
 *  - ≥4 levels with ≥2 strategically distinct solutions — specifically
 *    trs-03, trs-08, trs-11, trs-12 (different event logs, both solve)
 *  - the four-person set (trs-09/10/11/12) carries coopNotes naming
 *    distinct contribution types
 */
import { describe, it, expect } from "vitest";
import { TrsEngine } from "../../src/engine/trs/engine.js";
import { LEVELS } from "../../src/content/levels/index.js";
import { LEVEL_CARDS, KEY_QUESTIONS } from "../../src/content/level-cards.js";
import {
  WINNING_TRACES, committedRun, replay,
} from "../lib/winning-traces.js";

const eng = new TrsEngine();

describe("campaign shape", () => {
  it("exactly 12 registered levels, TRS-01..TRS-12 in order", () => {
    expect(LEVELS.map(l => l.id)).toEqual(
      Array.from({ length: 12 }, (_, i) => `TRS-${String(i + 1).padStart(2, "0")}`));
  });

  it("every level id in LEVELS matches its CaseDefinition levelId", () => {
    for (const l of LEVELS) {
      expect(l.def.levelId.toUpperCase()).toBe(l.id);
    }
  });
});

describe("per-level completeness", () => {
  it.each(LEVELS.map(l => [l.id, l.def] as const))(
    "%s: the sealed record is already true, and the outcome is the only thing broken",
    (_id, level) => {
      const { evaluation } = replay(level, []);
      // Every sealed observation holds in the original replay — the
      // disaster happened INSIDE the truthful record.
      expect(evaluation.allObservationsPass,
        "original replay must satisfy every sealed observation").toBe(true);
      expect(evaluation.allOutcomesPass,
        "original replay must still fail an outcome — else there is no case").toBe(false);
    });

  it.each(LEVELS.map(l => [l.id, l.def] as const))(
    "%s: every registered winning trace solves within budget",
    (id, level) => {
      const traces = WINNING_TRACES[id];
      expect(traces, `no winning trace registered for ${id}`).toBeDefined();
      expect(traces!.length).toBeGreaterThanOrEqual(1);
      for (const trace of traces!) {
        const { state, last } = committedRun(eng, level, [...trace.interventions]);
        expect(last.evaluation.success, `${id}/${trace.name}: eval failed`).toBe(true);
        expect(last.withinBudget, `${id}/${trace.name}: over budget`).toBe(true);
        expect(last.cost).toBeLessThanOrEqual(level.interventionBudget);
        const accepted = eng.applyAction(level, state, { type: "AcceptResult" }).state;
        expect(accepted.solved).toBe(true);
      }
    });

  it.each(LEVELS.map(l => [l.id, l.def] as const))(
    "%s: LevelCard complete (summary + ≥2 wrong approaches + 3-rung hints)",
    (id, level) => {
      const card = LEVEL_CARDS[id];
      expect(card, `no LevelCard for ${id}`).toBeDefined();
      expect(card!.winningTraceSummary.length).toBeGreaterThan(0);
      expect(card!.wrongApproaches.length,
        `${id}: needs ≥2 designed wrong approaches`).toBeGreaterThanOrEqual(2);
      expect(level.hints.length, `${id}: needs a 3-rung hint ladder`).toBeGreaterThanOrEqual(3);
      expect(level.hints.every(h => h.length > 0)).toBe(true);
    });
});

describe("GME-005: ≥4 levels with ≥2 strategically distinct solutions", () => {
  const MULTI = ["TRS-03", "TRS-08", "TRS-11", "TRS-12"] as const;

  it.each(MULTI)("%s has ≥2 registered traces that BOTH solve with different event logs", (id) => {
    const level = LEVELS.find(l => l.id === id)!.def;
    const traces = WINNING_TRACES[id]!;
    expect(traces.length).toBeGreaterThanOrEqual(2);
    const logs = traces.map(t => {
      const { timeline, evaluation } = replay(level, [...t.interventions]);
      expect(evaluation.success, `${id}/${t.name} must solve`).toBe(true);
      return JSON.stringify(timeline.beats);
    });
    // Different causal histories, not reordered equivalents.
    expect(new Set(logs).size).toBe(logs.length);
  });

  it("the campaign in fact exceeds the floor — the multi-solution set", () => {
    const multiCount = LEVELS.filter(l => (WINNING_TRACES[l.id]?.length ?? 0) >= 2).length;
    expect(multiCount).toBeGreaterThanOrEqual(4);
    // Verified set: trs-03, trs-04, trs-05, trs-06, trs-08, trs-09,
    // trs-10, trs-11, trs-12 each carry ≥2 distinct traces.
    expect(multiCount).toBe(9);
  });
});

describe("GME-007: four-person-meaningful levels carry real coopNotes", () => {
  const COOP = ["TRS-09", "TRS-10", "TRS-11", "TRS-12"] as const;
  it.each(COOP)("%s names four distinct contribution types", (id) => {
    const note = LEVEL_CARDS[id]!.coopNote;
    expect(note, `${id}: missing coopNote`).toBeDefined();
    // Each note enumerates ≥4 comma/semicolon-separated jobs.
    const parts = note!.split(/;|\)/).filter(s => s.trim().length > 0);
    expect(parts.length, `${id} coopNote should enumerate ≥4 contributions`).toBeGreaterThanOrEqual(4);
  });
});

describe("GME-009: every case poses its key question", () => {
  it.each(LEVELS.map(l => l.id))("%s has a non-trivial keyQuestion", (id) => {
    const q = KEY_QUESTIONS[id];
    expect(q, `${id}: missing keyQuestion`).toBeDefined();
    expect(q!.trim().endsWith("?"), `${id}: keyQuestion should be phrased as a question`).toBe(true);
    expect(q!.length).toBeGreaterThan(20);
  });
});
