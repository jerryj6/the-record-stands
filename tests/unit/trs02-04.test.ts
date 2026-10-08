/**
 * Acceptance tests for TRS-02, TRS-03, TRS-04 (master TRS-D rows 2–4).
 * Per level: content validity (TRS-006), verified winning trace, designed
 * wrong approaches failing on the named predicate, over-budget rejection,
 * and deterministic replay. TRS-03 and TRS-04 each carry two strategically
 * distinct valid solutions (GME-005).
 */
import { describe, it, expect } from "vitest";
import { TrsEngine } from "../../src/engine/trs/engine.js";
import { simulate } from "../../src/engine/trs/sim.js";
import { evaluateRun } from "../../src/engine/trs/evaluate.js";
import { TRS02 } from "../../src/content/levels/trs02-the-late-lantern.js";
import { TRS03 } from "../../src/content/levels/trs03-rain-on-the-parade.js";
import { TRS04 } from "../../src/content/levels/trs04-the-shared-counterweight.js";
import type { CaseDefinition, Intervention } from "../../src/engine/trs/types.js";

function run(level: CaseDefinition, ivs: Intervention[]) {
  const t = simulate(level, ivs);
  return { t, e: evaluateRun(t, level.sealedObservations, level.desiredOutcomes) };
}
const obs = (e: ReturnType<typeof evaluateRun>, id: string) =>
  e.observations.find(o => o.predicateId === id)!.passed;
const out = (e: ReturnType<typeof evaluateRun>, id: string) =>
  e.outcomes.find(o => o.predicateId === id)!.passed;

/** Committed-config cost via the real session engine, then TestRun. */
function testRun(eng: TrsEngine, level: CaseDefinition, ivs: Intervention[]) {
  let s = eng.createInitialState(level);
  ivs.forEach((iv, i) => {
    s = eng.applyAction(level, s, { type: "SetIntervention", slotKey: `s${i}`, intervention: iv }).state;
  });
  s = eng.applyAction(level, s, { type: "TestRun" }).state;
  return { state: s, last: s.runs[s.runs.length - 1]! };
}

const TRS02_WIN: Intervention[] = [
  { kind: "RedirectJunction", junctionId: "routeSwitch", toRouteId: "serviceAlley" },
  { kind: "PlaceAndArmToy", toyId: "windUpToy", socketId: "bellSocket" },
];

const TRS03_DETOUR: Intervention = {
  kind: "RedirectJunction", junctionId: "floatSwitch", toRouteId: "arcadeDetour",
};
const TRS03_WIN_TOY: Intervention[] = [
  TRS03_DETOUR,
  { kind: "PlaceAndArmToy", toyId: "windUpToy", socketId: "rainBellSocket" },
];
const TRS03_WIN_SKID: Intervention[] = [
  TRS03_DETOUR,
  { kind: "RedirectJunction", junctionId: "marshalSwitch", toRouteId: "hazardSpur" },
];

const TRS04_WIN_KEEP: Intervention[] = [
  { kind: "SetValve", entityId: "cistern", running: false },
  { kind: "PlaceAndArmToy", toyId: "windUpToy", socketId: "belfrySocket" },
];
const TRS04_WIN_SPLIT: Intervention[] = [
  { kind: "RedirectJunction", junctionId: "cartSwitch", toRouteId: "upperCircuit" },
  { kind: "RedirectJunction", junctionId: "supplySwitch", toRouteId: "grateSpur" },
];

// ---------------------------------------------------------------- TRS-02
describe("TRS-02 The Late Lantern", () => {
  it("original run satisfies all observations but ruins the lantern", () => {
    const { e } = run(TRS02, []);
    expect(obs(e, "OBS-ARCH")).toBe(true);
    expect(obs(e, "OBS-BELL")).toBe(true);
    expect(obs(e, "OBS-FOUNTAIN")).toBe(true);
    expect(out(e, "OUT-LANTERN")).toBe(false);
    expect(e.success).toBe(false);
  });

  it("winning trace: dry service alley + toy strike passes everything", () => {
    const { e } = run(TRS02, TRS02_WIN);
    expect(e.success).toBe(true);
    expect(e.allObservationsPass).toBe(true);
    expect(e.allOutcomesPass).toBe(true);
  });

  it("wrong approach — blanket delay breaks the earlier crossing", () => {
    const { e } = run(TRS02, [
      { kind: "SetMechanismDelay", entityId: "lanternCart", delayBeats: 1 },
    ]);
    // Whole route shifts one beat: arch at 4, skid at 5, lantern ruined.
    expect(obs(e, "OBS-ARCH")).toBe(false);
    expect(obs(e, "OBS-BELL")).toBe(false);
    expect(out(e, "OUT-LANTERN")).toBe(false);
  });

  it("wrong approach — cutting the fountain falsifies the running fact and the bell", () => {
    const { e } = run(TRS02, [
      { kind: "SetValve", entityId: "fountain", running: false },
    ]);
    expect(out(e, "OUT-LANTERN")).toBe(true);
    expect(obs(e, "OBS-ARCH")).toBe(true);
    expect(obs(e, "OBS-FOUNTAIN")).toBe(false);
    expect(obs(e, "OBS-BELL")).toBe(false);
    expect(e.success).toBe(false);
  });

  it("wrong approach — toy alone rings the bell but the skid still ruins the lantern", () => {
    const { e } = run(TRS02, [
      { kind: "PlaceAndArmToy", toyId: "windUpToy", socketId: "bellSocket" },
    ]);
    expect(obs(e, "OBS-BELL")).toBe(true); // skid ring and strike both land at 4
    expect(out(e, "OUT-LANTERN")).toBe(false);
    expect(e.success).toBe(false);
  });

  it("wrong approach — dry alley alone drops the sealed bell ring", () => {
    const { e } = run(TRS02, [TRS02_WIN[0]!]);
    expect(out(e, "OUT-LANTERN")).toBe(true);
    expect(obs(e, "OBS-ARCH")).toBe(true);
    expect(obs(e, "OBS-BELL")).toBe(false);
  });

  it("over-budget committed config cannot be accepted", () => {
    const eng = new TrsEngine();
    const { last } = testRun(eng, TRS02, [
      ...TRS02_WIN,
      { kind: "ScheduleActivation", entityId: "fountain", beat: 2 },
    ]);
    expect(last.cost).toBe(4);
    expect(last.withinBudget).toBe(false);
    expect(last.budgetNote).toContain("budget");
  });

  it("deterministic replay: identical event log", () => {
    const a = simulate(TRS02, TRS02_WIN);
    const b = simulate(TRS02, TRS02_WIN);
    expect(JSON.stringify(a.beats)).toBe(JSON.stringify(b.beats));
    expect(JSON.stringify(a.finalEntityStates)).toBe(JSON.stringify(b.finalEntityStates));
  });

  it("counterfactual: sealed observations are load-bearing", () => {
    // With observations stripped, the lantern-saving dry alley alone would 'win'.
    const t = simulate(TRS02, [TRS02_WIN[0]!]);
    const e = evaluateRun(t, [], TRS02.desiredOutcomes);
    expect(e.success).toBe(true); // proves the sealed facts are what demand the toy
  });
});

// ---------------------------------------------------------------- TRS-03
describe("TRS-03 Rain on the Parade", () => {
  it("original run satisfies all observations but ruins the banner", () => {
    const { e } = run(TRS03, []);
    expect(obs(e, "OBS-GATE")).toBe(true);
    expect(obs(e, "OBS-BELL")).toBe(true);
    expect(obs(e, "OBS-RAIN")).toBe(true);
    expect(out(e, "OUT-BANNER")).toBe(false);
    expect(e.success).toBe(false);
  });

  it("strategy A (toy substitute): arcade detour + finch strike passes", () => {
    const { e } = run(TRS03, TRS03_WIN_TOY);
    expect(e.success).toBe(true);
  });

  it("strategy B (sacrificial skid): detour + marshal on boulevard spur passes", () => {
    const { e } = run(TRS03, TRS03_WIN_SKID);
    expect(e.success).toBe(true);
  });

  it("the two strategies differ causally: B rings the bell with no toy", () => {
    const a = simulate(TRS03, TRS03_WIN_TOY);
    const b = simulate(TRS03, TRS03_WIN_SKID);
    const bellsAt4 = (t: typeof a) =>
      t.beats.flatMap(x => x.events)
        .filter(ev => ev.type === "BellRing" && ev.entityId === "rainBell" && ev.beat === 4)
        .map(ev => String(ev.data?.["cause"]));
    expect(bellsAt4(a)).toEqual(["windUpToy:strike"]);
    expect(bellsAt4(b)).toEqual(["marshalCart:skid"]);
  });

  it("wrong approach — express alley is dry but early at the gate", () => {
    const { e } = run(TRS03, [
      { kind: "RedirectJunction", junctionId: "floatSwitch", toRouteId: "expressAlley" },
      { kind: "PlaceAndArmToy", toyId: "windUpToy", socketId: "rainBellSocket" },
    ]);
    expect(out(e, "OUT-BANNER")).toBe(true);
    expect(obs(e, "OBS-BELL")).toBe(true);
    expect(obs(e, "OBS-GATE")).toBe(false); // gate at beat 5, not the recorded 6
  });

  it("wrong approach — stopping the rain falsifies the fixed weather record", () => {
    const { e } = run(TRS03, [
      { kind: "SetValve", entityId: "weatherFront", running: false },
    ]);
    expect(out(e, "OUT-BANNER")).toBe(true);
    expect(obs(e, "OBS-GATE")).toBe(true);
    expect(obs(e, "OBS-RAIN")).toBe(false);
    expect(obs(e, "OBS-BELL")).toBe(false);
  });

  it("wrong approach — toy at the bandstand socket rings the wrong bell", () => {
    const { e } = run(TRS03, [
      TRS03_DETOUR,
      { kind: "PlaceAndArmToy", toyId: "windUpToy", socketId: "bandstandSocket" },
    ]);
    expect(out(e, "OUT-BANNER")).toBe(true);
    expect(obs(e, "OBS-BELL")).toBe(false); // bandstandBell rang; rainBell did not
  });

  it("wrong approach — delaying the float re-times the gate and the skid", () => {
    const { e } = run(TRS03, [
      { kind: "SetMechanismDelay", entityId: "bannerFloat", delayBeats: 1 },
    ]);
    expect(obs(e, "OBS-GATE")).toBe(false);
    expect(obs(e, "OBS-BELL")).toBe(false);
    expect(out(e, "OUT-BANNER")).toBe(false);
  });

  it("over-budget committed config cannot be accepted", () => {
    const eng = new TrsEngine();
    const { last } = testRun(eng, TRS03, [
      ...TRS03_WIN_TOY,
      { kind: "RedirectJunction", junctionId: "marshalSwitch", toRouteId: "hazardSpur" },
      { kind: "ScheduleActivation", entityId: "bandstand", beat: 2 },
    ]);
    expect(last.cost).toBe(4);
    expect(last.withinBudget).toBe(false);
  });

  it("deterministic replay: identical event log", () => {
    const a = simulate(TRS03, TRS03_WIN_SKID);
    const b = simulate(TRS03, TRS03_WIN_SKID);
    expect(JSON.stringify(a.beats)).toBe(JSON.stringify(b.beats));
  });
});

// ---------------------------------------------------------------- TRS-04
describe("TRS-04 The Shared Counterweight", () => {
  it("original run satisfies all four observations but ruins the crystal", () => {
    const { e } = run(TRS04, []);
    expect(obs(e, "OBS-PLATE")).toBe(true);
    expect(obs(e, "OBS-CHIME")).toBe(true);
    expect(obs(e, "OBS-GATE")).toBe(true);
    expect(obs(e, "OBS-BRIDGE")).toBe(true);
    expect(out(e, "OUT-CRYSTAL")).toBe(false);
    expect(e.success).toBe(false);
  });

  it("repair KEEP — reuse the counterweight: dry the cistern, toy strikes the chime", () => {
    const { e } = run(TRS04, TRS04_WIN_KEEP);
    expect(e.success).toBe(true);
    expect(e.allObservationsPass).toBe(true);
  });

  it("repair SPLIT — dry viaduct for the counterweight, supply cart takes the skid", () => {
    const { e } = run(TRS04, TRS04_WIN_SPLIT);
    expect(e.success).toBe(true);
    expect(e.allObservationsPass).toBe(true);
  });

  it("KEEP and SPLIT are substantively different repairs", () => {
    const keep = simulate(TRS04, TRS04_WIN_KEEP);
    const split = simulate(TRS04, TRS04_WIN_SPLIT);
    const chimeAt4 = (t: typeof keep) =>
      t.beats.flatMap(x => x.events)
        .filter(ev => ev.type === "BellRing" && ev.entityId === "belfryChime" && ev.beat === 4)
        .map(ev => String(ev.data?.["cause"]));
    expect(chimeAt4(keep)).toEqual(["windUpToy:strike"]);
    expect(chimeAt4(split)).toEqual(["supplyCart:skid"]);
    // KEEP leaves the counterweight's route untouched; SPLIT changes it.
    const pos = (t: typeof keep, id: string, beat: number) =>
      t.beats.find(x => x.beat === beat)?.entityStates[id]?.["position"];
    expect(pos(keep, "ballastCart", 4)).toBe("slickGrate");
    expect(pos(split, "ballastCart", 4)).toBe("viaductWalk");
  });

  it("wrong approach — closing the cistern alone silences the chime", () => {
    const { e } = run(TRS04, [TRS04_WIN_KEEP[0]!]);
    expect(out(e, "OUT-CRYSTAL")).toBe(true);
    expect(obs(e, "OBS-CHIME")).toBe(false);
    expect(obs(e, "OBS-PLATE")).toBe(true);
    expect(obs(e, "OBS-GATE")).toBe(true);
  });

  it("wrong approach — dry viaduct alone drops the chime strike", () => {
    const { e } = run(TRS04, [TRS04_WIN_SPLIT[0]!]);
    expect(out(e, "OUT-CRYSTAL")).toBe(true);
    expect(obs(e, "OBS-CHIME")).toBe(false);
    expect(obs(e, "OBS-PLATE")).toBe(true);
    expect(obs(e, "OBS-GATE")).toBe(true);
  });

  it("wrong approach — a second striker never unloads the crystal", () => {
    const { e } = run(TRS04, [
      { kind: "PlaceAndArmToy", toyId: "windUpToy", socketId: "belfrySocket" },
    ]);
    expect(obs(e, "OBS-CHIME")).toBe(true);
    expect(out(e, "OUT-CRYSTAL")).toBe(false);
  });

  it("wrong approach — the chapel socket rings the wrong bell", () => {
    const { e } = run(TRS04, [
      TRS04_WIN_KEEP[0]!,
      { kind: "PlaceAndArmToy", toyId: "windUpToy", socketId: "chapelSocket" },
    ]);
    expect(out(e, "OUT-CRYSTAL")).toBe(true);
    expect(obs(e, "OBS-CHIME")).toBe(false);
  });

  it("wrong approach — delaying the counterweight breaks all three duties", () => {
    const { e } = run(TRS04, [
      { kind: "SetMechanismDelay", entityId: "ballastCart", delayBeats: 1 },
    ]);
    expect(obs(e, "OBS-PLATE")).toBe(false);
    expect(obs(e, "OBS-CHIME")).toBe(false);
    expect(obs(e, "OBS-GATE")).toBe(false);
    expect(out(e, "OUT-CRYSTAL")).toBe(false);
  });

  it("over-budget committed config cannot be accepted", () => {
    const eng = new TrsEngine();
    const { last } = testRun(eng, TRS04, [
      ...TRS04_WIN_KEEP,
      TRS04_WIN_SPLIT[1]!,
      { kind: "ScheduleActivation", entityId: "liftPlate", beat: 3 },
    ]);
    expect(last.cost).toBe(4);
    expect(last.withinBudget).toBe(false);
  });

  it("deterministic replay: identical event log", () => {
    const a = simulate(TRS04, TRS04_WIN_SPLIT);
    const b = simulate(TRS04, TRS04_WIN_SPLIT);
    expect(JSON.stringify(a.beats)).toBe(JSON.stringify(b.beats));
  });
});

// ---------------------------------------------------------- engine-level
describe("session engine acceptance (TRS-02..04)", () => {
  const eng = new TrsEngine();
  it.each([
    ["TRS02", TRS02, TRS02_WIN],
    ["TRS03-toy", TRS03, TRS03_WIN_TOY],
    ["TRS03-skid", TRS03, TRS03_WIN_SKID],
    ["TRS04-keep", TRS04, TRS04_WIN_KEEP],
    ["TRS04-split", TRS04, TRS04_WIN_SPLIT],
  ] as const)("%s: committed winning config accepts", (_name, level, ivs) => {
    const { state, last } = testRun(eng, level, [...ivs]);
    expect(last.evaluation.success).toBe(true);
    expect(last.withinBudget).toBe(true);
    expect(eng.validateAction(level, state, { type: "AcceptResult" }).ok).toBe(true);
    const accepted = eng.applyAction(level, state, { type: "AcceptResult" }).state;
    expect(accepted.solved).toBe(true);
  });

  it("canonical hash is stable across identical sessions", () => {
    const a = testRun(new TrsEngine(), TRS04, TRS04_WIN_SPLIT).state;
    const b = testRun(new TrsEngine(), TRS04, TRS04_WIN_SPLIT).state;
    expect(eng.canonicalHash(a)).toBe(eng.canonicalHash(b));
  });
});
