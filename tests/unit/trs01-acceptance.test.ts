import { describe, it, expect } from "vitest";
import { TrsEngine } from "../../src/engine/trs/engine.js";
import { simulate } from "../../src/engine/trs/sim.js";
import { evaluateRun } from "../../src/engine/trs/evaluate.js";
import { TRS01 } from "../../src/content/levels/trs01-grand-opening.js";
import type { Intervention } from "../../src/engine/trs/types.js";

const REDIRECT: Intervention = { kind: "RedirectJunction", junctionId: "junction", toRouteId: "dryLane" };
const TOY: Intervention = { kind: "PlaceAndArmToy", toyId: "windUpToy", socketId: "bellSocket" };
const FOUNTAIN_OFF: Intervention = { kind: "SetValve", entityId: "fountain", running: false };

function run(ivs: Intervention[]) {
  const t = simulate(TRS01, ivs);
  return { t, e: evaluateRun(t, TRS01.sealedObservations, TRS01.desiredOutcomes) };
}
const obs = (e: ReturnType<typeof run>["e"], id: string) => e.observations.find(o => o.predicateId === id)!.passed;
const out = (e: ReturnType<typeof run>["e"], id: string) => e.outcomes.find(o => o.predicateId === id)!.passed;

describe("TRS-01 Grand Opening acceptance matrix (master TRS-C)", () => {
  it("original run: all 3 observations pass, cake fails", () => {
    const { e } = run([]);
    expect(obs(e, "OBS-BELL")).toBe(true);
    expect(obs(e, "OBS-ARCH")).toBe(true);
    expect(obs(e, "OBS-FOUNTAIN")).toBe(true);
    expect(out(e, "OUT-CAKE")).toBe(false);
    expect(e.success).toBe(false);
  });

  it("fountain off only: cake+arch pass; bell+fountain fail", () => {
    const { e } = run([FOUNTAIN_OFF]);
    expect(out(e, "OUT-CAKE")).toBe(true);
    expect(obs(e, "OBS-ARCH")).toBe(true);
    expect(obs(e, "OBS-BELL")).toBe(false);
    expect(obs(e, "OBS-FOUNTAIN")).toBe(false);
    expect(e.success).toBe(false);
  });

  it("dry route only: cake+arch+fountain pass; bell fails", () => {
    const { e } = run([REDIRECT]);
    expect(out(e, "OUT-CAKE")).toBe(true);
    expect(obs(e, "OBS-ARCH")).toBe(true);
    expect(obs(e, "OBS-FOUNTAIN")).toBe(true);
    expect(obs(e, "OBS-BELL")).toBe(false);
    expect(e.success).toBe(false);
  });

  it("dry route + toy at bell socket: everything passes", () => {
    const { e } = run([REDIRECT, TOY]);
    expect(e.success).toBe(true);
    expect(e.allObservationsPass).toBe(true);
    expect(e.allOutcomesPass).toBe(true);
  });

  it("deterministic replay: same config → identical event log", () => {
    const a = simulate(TRS01, [REDIRECT, TOY]);
    const b = simulate(TRS01, [REDIRECT, TOY]);
    expect(JSON.stringify(a.beats)).toBe(JSON.stringify(b.beats));
  });
});

describe("TRS-01 budget and session engine", () => {
  const eng = new TrsEngine();
  it("winning repair costs exactly two", () => {
    let s = eng.createInitialState(TRS01);
    s = eng.applyAction(TRS01, s, { type: "SetIntervention", slotKey: "j", intervention: REDIRECT }).state;
    s = eng.applyAction(TRS01, s, { type: "SetIntervention", slotKey: "t", intervention: TOY }).state;
    s = eng.applyAction(TRS01, s, { type: "TestRun" }).state;
    const last = s.runs[s.runs.length - 1]!;
    expect(last.cost).toBe(2);
    expect(last.withinBudget).toBe(true);
    expect(last.evaluation.success).toBe(true);
    expect(eng.validateAction(TRS01, s, { type: "AcceptResult" }).ok).toBe(true);
    s = eng.applyAction(TRS01, s, { type: "AcceptResult" }).state;
    expect(s.solved).toBe(true);
  });

  it("over-budget committed config fails with explanation", () => {
    let s = eng.createInitialState(TRS01);
    s = eng.applyAction(TRS01, s, { type: "SetIntervention", slotKey: "j", intervention: REDIRECT }).state;
    s = eng.applyAction(TRS01, s, { type: "SetIntervention", slotKey: "t", intervention: TOY }).state;
    s = eng.applyAction(TRS01, s, { type: "SetIntervention", slotKey: "v", intervention: FOUNTAIN_OFF }).state;
    s = eng.applyAction(TRS01, s, { type: "TestRun" }).state;
    const last = s.runs[s.runs.length - 1]!;
    expect(last.cost).toBe(3);
    expect(last.withinBudget).toBe(false);
    expect(last.budgetNote).toContain("budget");
    expect(eng.validateAction(TRS01, s, { type: "AcceptResult" }).ok).toBe(false);
  });

  it("undo restores prior config", () => {
    let s = eng.createInitialState(TRS01);
    s = eng.applyAction(TRS01, s, { type: "SetIntervention", slotKey: "j", intervention: REDIRECT }).state;
    s = eng.applyAction(TRS01, s, { type: "Undo" }).state;
    expect(Object.keys(s.config)).toHaveLength(0);
  });
});
