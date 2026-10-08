/**
 * Acceptance tests for TRS-11, TRS-12 (master TRS-D rows 11–12, finale).
 * Per level: content validity (TRS-006), verified winning traces,
 * designed wrong approaches failing on the named predicate, over-budget
 * rejection, deterministic replay. TRS-11 asserts the neighboring-
 * subscene conflicts (shared-prop last-wins + cross-area event
 * contamination); TRS-12 asserts the three-stage finale record and two+
 * meaningfully different complete repairs.
 */
import { describe, it, expect } from "vitest";
import { TrsEngine } from "../../src/engine/trs/engine.js";
import { simulate } from "../../src/engine/trs/sim.js";
import { evaluateRun } from "../../src/engine/trs/evaluate.js";
import { TRS11 } from "../../src/content/levels/trs11-the-archive-exhibition.js";
import { TRS12 } from "../../src/content/levels/trs12-the-town-that-didnt-fall.js";
import type { CaseDefinition, Intervention, Timeline } from "../../src/engine/trs/types.js";

function run(level: CaseDefinition, ivs: Intervention[]) {
  const t = simulate(level, ivs);
  return { t, e: evaluateRun(t, level.sealedObservations, level.desiredOutcomes) };
}
const obs = (e: ReturnType<typeof evaluateRun>, id: string) =>
  e.observations.find(o => o.predicateId === id)!.passed;
const out = (e: ReturnType<typeof evaluateRun>, id: string) =>
  e.outcomes.find(o => o.predicateId === id)!.passed;
const posAt = (t: Timeline, id: string, beat: number) =>
  t.beats.find(x => x.beat === beat)?.entityStates[id]?.["position"];
const bellBeats = (t: Timeline, bell: string) =>
  t.beats.flatMap(x => x.events)
    .filter(ev => ev.type === "BellRing" && ev.entityId === bell)
    .map(ev => ev.beat);
const causeAt = (t: Timeline, bell: string, beat: number) =>
  t.beats.flatMap(x => x.events)
    .filter(ev => ev.type === "BellRing" && ev.entityId === bell && ev.beat === beat)
    .map(ev => String(ev.data?.["cause"]));

/** Committed-config cost via the real session engine, then TestRun. */
function testRun(eng: TrsEngine, level: CaseDefinition, ivs: Intervention[]) {
  let s = eng.createInitialState(level);
  ivs.forEach((iv, i) => {
    s = eng.applyAction(level, s, { type: "SetIntervention", slotKey: `s${i}`, intervention: iv }).state;
  });
  s = eng.applyAction(level, s, { type: "TestRun" }).state;
  return { state: s, last: s.runs[s.runs.length - 1]! };
}

// ---- winning traces -------------------------------------------------------

const TRS11_DETOURS: Intervention[] = [
  { kind: "RedirectJunction", junctionId: "northSwitch", toRouteId: "northDetour" },
  { kind: "RedirectJunction", junctionId: "southSwitch", toRouteId: "southDetour" },
];
const TRS11_WIN_RELAY: Intervention[] = [
  ...TRS11_DETOURS,
  { kind: "RedirectJunction", junctionId: "spareSwitch", toRouteId: "relaySpur" },
];
const TRS11_WIN_SPLIT: Intervention[] = [
  ...TRS11_DETOURS,
  { kind: "PlaceAndArmToy", toyId: "windUpToy", socketId: "gallerySocket" },
  { kind: "RedirectJunction", junctionId: "spareSwitch", toRouteId: "quaySpur" },
];
/** Each half claims the spare cart — last redirect wins. */
const TRS11_NAIVE_BOTH_CLAIMS: Intervention[] = [
  ...TRS11_DETOURS,
  { kind: "RedirectJunction", junctionId: "spareSwitch", toRouteId: "terraceSpur" },
  { kind: "RedirectJunction", junctionId: "spareSwitch", toRouteId: "quaySpur" },
];

const TRS12_DETOURS: Intervention[] = [
  { kind: "RedirectJunction", junctionId: "rocketSwitch", toRouteId: "dawnDetour" },
  { kind: "RedirectJunction", junctionId: "mayorSwitch", toRouteId: "civicDetour" },
];
const TRS12_WIN_RELAY: Intervention[] = [
  ...TRS12_DETOURS,
  { kind: "RedirectJunction", junctionId: "spareSwitch", toRouteId: "relaySpur" },
];
const TRS12_WIN_TOY_HARBOR: Intervention[] = [
  ...TRS12_DETOURS,
  { kind: "RedirectJunction", junctionId: "sweepSwitch", toRouteId: "plazaSpur" },
  { kind: "PlaceAndArmToy", toyId: "windUpFinch", socketId: "harborSocket" },
];
const TRS12_WIN_TWO_CREW: Intervention[] = [
  ...TRS12_DETOURS,
  { kind: "RedirectJunction", junctionId: "sweepSwitch", toRouteId: "plazaSpur" },
  { kind: "RedirectJunction", junctionId: "spareSwitch", toRouteId: "bankSpur" },
];

// ---------------------------------------------------------------- TRS-11
describe("TRS-11 The Archive Exhibition", () => {
  it("original run: five observations pass, both vases ruined", () => {
    const { t, e } = run(TRS11, []);
    expect(obs(e, "OBS-ARCH-N")).toBe(true);
    expect(obs(e, "OBS-BELL-N")).toBe(true);
    expect(obs(e, "OBS-ARCH-S")).toBe(true);
    expect(obs(e, "OBS-BELL-S")).toBe(true); // exactly one strike at 5
    expect(obs(e, "OBS-ANNEX")).toBe(true);
    expect(bellBeats(t, "galleryBell")).toEqual([4]);
    expect(bellBeats(t, "harborBell")).toEqual([5]);
    expect(out(e, "OUT-VASE-N")).toBe(false);
    expect(out(e, "OUT-VASE-S")).toBe(false);
    expect(e.success).toBe(false);
  });

  it("winning trace (RELAY): one spare cart serves both bells", () => {
    const { t, e } = run(TRS11, TRS11_WIN_RELAY);
    expect(e.success).toBe(true);
    expect(bellBeats(t, "galleryBell")).toEqual([4]);
    expect(bellBeats(t, "harborBell")).toEqual([5]);
    expect(posAt(t, "spareCart", 4)).toBe("wetTerrace");
    expect(posAt(t, "spareCart", 5)).toBe("wetQuay");
  });

  it("winning trace (SPLIT): toy at the gallery socket, skid at the quay", () => {
    const { t, e } = run(TRS11, TRS11_WIN_SPLIT);
    expect(e.success).toBe(true);
    expect(causeAt(t, "galleryBell", 4)).toEqual(["windUpToy:strike"]);
    expect(causeAt(t, "harborBell", 5)).toEqual(["spareCart:skid"]);
  });

  it("the naive 'each half claims the spare cart' plan is a conflict, not two repairs", () => {
    const { t, e } = run(TRS11, TRS11_NAIVE_BOTH_CLAIMS);
    // RedirectJunction is last-wins on a junction: the cart takes the
    // quay spur and the terrace leg never happens.
    expect(posAt(t, "spareCart", 4)).toBe("quayNorth");
    expect(posAt(t, "spareCart", 5)).toBe("wetQuay");
    expect(obs(e, "OBS-BELL-S")).toBe(true);   // harbor strike survives
    expect(obs(e, "OBS-BELL-N")).toBe(false);  // gallery bell silent
    expect(obs(e, "OBS-ARCH-N")).toBe(true);
    expect(obs(e, "OBS-ARCH-S")).toBe(true);
    expect(out(e, "OUT-VASE-N")).toBe(true);   // the detours did work
    expect(out(e, "OUT-VASE-S")).toBe(true);
    expect(e.success).toBe(false);
  });

  it("wrong approach — the arcade cut contaminates the south hall's record", () => {
    const { t, e } = run(TRS11, [
      { kind: "RedirectJunction", junctionId: "northSwitch", toRouteId: "arcadeCut" },
      TRS11_DETOURS[1]!,
      { kind: "RedirectJunction", junctionId: "spareSwitch", toRouteId: "quaySpur" },
      { kind: "PlaceAndArmToy", toyId: "windUpToy", socketId: "gallerySocket" },
    ]);
    // exhibitCart wades the quay at 5 AND the spare cart skids it at 5.
    expect(bellBeats(t, "harborBell")).toEqual([5, 5]);
    expect(obs(e, "OBS-BELL-N")).toBe(true);
    expect(obs(e, "OBS-ARCH-N")).toBe(true);
    expect(obs(e, "OBS-ARCH-S")).toBe(true);
    expect(obs(e, "OBS-ANNEX")).toBe(true);
    expect(obs(e, "OBS-BELL-S")).toBe(false); // two strikes ≠ one
    expect(e.success).toBe(false);
  });

  it("wrong approach — closing the shared pump saves both, silences both", () => {
    const { e } = run(TRS11, [
      { kind: "SetValve", entityId: "canalPump", running: false },
    ]);
    expect(out(e, "OUT-VASE-N")).toBe(true);
    expect(out(e, "OUT-VASE-S")).toBe(true);
    expect(obs(e, "OBS-BELL-N")).toBe(false);
    expect(obs(e, "OBS-BELL-S")).toBe(false);
  });

  it("wrong approach — detours alone silence both bells", () => {
    const { e } = run(TRS11, TRS11_DETOURS);
    expect(out(e, "OUT-VASE-N")).toBe(true);
    expect(out(e, "OUT-VASE-S")).toBe(true);
    expect(obs(e, "OBS-BELL-N")).toBe(false);
    expect(obs(e, "OBS-BELL-S")).toBe(false);
  });

  it("wrong approach — delaying the court cart erases half the south record", () => {
    const { e } = run(TRS11, [
      { kind: "SetMechanismDelay", entityId: "courtCart", delayBeats: 1 },
    ]);
    expect(obs(e, "OBS-ARCH-S")).toBe(false);  // arch at 4 now
    expect(obs(e, "OBS-BELL-S")).toBe(false);  // skid at 6, count@5 = 0
    expect(obs(e, "OBS-ANNEX")).toBe(false);   // stairs at 7
    expect(obs(e, "OBS-ARCH-N")).toBe(true);   // north record untouched
    expect(out(e, "OUT-VASE-S")).toBe(false);  // still skids, just later
  });

  it("counterfactual: bells are the only thing blocking the naive plan", () => {
    const t = simulate(TRS11, TRS11_NAIVE_BOTH_CLAIMS);
    const e = evaluateRun(t, [], TRS11.desiredOutcomes);
    expect(e.success).toBe(true); // every outcome already passes
  });

  it("over-budget: substitutes plus the naive second claim exceed 4", () => {
    const eng = new TrsEngine();
    const { last } = testRun(eng, TRS11, [
      ...TRS11_WIN_SPLIT,
      { kind: "RedirectJunction", junctionId: "spareSwitch", toRouteId: "terraceSpur" },
    ]);
    expect(last.cost).toBe(5);
    expect(last.withinBudget).toBe(false);
    expect(last.budgetNote).toContain("budget");
  });

  it("deterministic replay: identical event log", () => {
    const a = simulate(TRS11, TRS11_WIN_RELAY);
    const b = simulate(TRS11, TRS11_WIN_RELAY);
    expect(JSON.stringify(a.beats)).toBe(JSON.stringify(b.beats));
  });
});

// ---------------------------------------------------------------- TRS-12
describe("TRS-12 The Town That Didn't Fall", () => {
  it("original run: all six stage observations pass, the town falls", () => {
    const { t, e } = run(TRS12, []);
    expect(obs(e, "OBS-BRIDGE")).toBe(true);
    expect(obs(e, "OBS-ARCH")).toBe(true);
    expect(obs(e, "OBS-TOWER")).toBe(true);
    expect(obs(e, "OBS-HARBOR")).toBe(true);
    expect(obs(e, "OBS-QUIET")).toBe(true);
    expect(obs(e, "OBS-GREEN")).toBe(true);
    expect(bellBeats(t, "towerBell")).toEqual([4]);
    expect(bellBeats(t, "harborBell")).toEqual([5]);
    expect(out(e, "OUT-POWDER")).toBe(false);
    expect(out(e, "OUT-PROCLAMATION")).toBe(false);
    expect(out(e, "OUT-CEREMONY")).toBe(true); // it arrives — ruined
    expect(e.success).toBe(false);
  });

  it("RELAY (3/5): one borrowed road serves both strikes", () => {
    const { t, e } = run(TRS12, TRS12_WIN_RELAY);
    expect(e.success).toBe(true);
    expect(bellBeats(t, "towerBell")).toEqual([4]);
    expect(bellBeats(t, "harborBell")).toEqual([5]);
    expect(causeAt(t, "towerBell", 4)).toEqual(["spareCart:skid"]);
    expect(causeAt(t, "harborBell", 5)).toEqual(["spareCart:skid"]);
    expect(posAt(t, "rocketCart", 7)).toBe("celebrationGreen");
  });

  it("TOY-HARBOR (5/5): crew skid at 4, parked finch re-rings cover 5", () => {
    const { t, e } = run(TRS12, TRS12_WIN_TOY_HARBOR);
    expect(e.success).toBe(true);
    expect(causeAt(t, "towerBell", 4)).toEqual(["sweeperCart:skid"]);
    // The harbor bell has no sealed silence — the parked finch's whole
    // re-ring train is legal and its beat-5 member carries the record.
    expect(bellBeats(t, "harborBell")).toEqual([4, 5, 6, 7, 8]);
    expect(causeAt(t, "harborBell", 5)).toEqual(["windUpFinch:strike"]);
  });

  it("TWO-CREW (4/5): each empty cart owns one substitute skid", () => {
    const { t, e } = run(TRS12, TRS12_WIN_TWO_CREW);
    expect(e.success).toBe(true);
    expect(causeAt(t, "towerBell", 4)).toEqual(["sweeperCart:skid"]);
    expect(causeAt(t, "harborBell", 5)).toEqual(["spareCart:skid"]);
  });

  it("wrong approach — the finch at the tower socket breaks the silence", () => {
    const { e } = run(TRS12, [
      ...TRS12_DETOURS,
      { kind: "PlaceAndArmToy", toyId: "windUpFinch", socketId: "towerSocket" },
      { kind: "RedirectJunction", junctionId: "spareSwitch", toRouteId: "bankSpur" },
    ]);
    expect(obs(e, "OBS-TOWER")).toBe(true);   // the strike at 4 happens
    expect(obs(e, "OBS-HARBOR")).toBe(true);  // the crew skid covers 5
    expect(out(e, "OUT-POWDER")).toBe(true);
    expect(out(e, "OUT-PROCLAMATION")).toBe(true);
    expect(out(e, "OUT-CEREMONY")).toBe(true);
    expect(obs(e, "OBS-QUIET")).toBe(false);  // ONLY the silence fails
    expect(e.success).toBe(false);
  });

  it("counterfactual: without the quiet the tower finch 'wins'", () => {
    const t = simulate(TRS12, [
      ...TRS12_DETOURS,
      { kind: "PlaceAndArmToy", toyId: "windUpFinch", socketId: "towerSocket" },
      { kind: "RedirectJunction", junctionId: "spareSwitch", toRouteId: "bankSpur" },
    ]);
    const e = evaluateRun(
      t,
      TRS12.sealedObservations.filter(o => o.id !== "OBS-QUIET"),
      TRS12.desiredOutcomes,
    );
    expect(e.success).toBe(true);
  });

  it("wrong approach — closing the pump silences both strikes", () => {
    const { e } = run(TRS12, [
      { kind: "SetValve", entityId: "stormPump", running: false },
    ]);
    expect(out(e, "OUT-POWDER")).toBe(true);
    expect(out(e, "OUT-PROCLAMATION")).toBe(true);
    expect(obs(e, "OBS-TOWER")).toBe(false);
    expect(obs(e, "OBS-HARBOR")).toBe(false);
  });

  it("wrong approach — substitutes without detours keep the accidents", () => {
    const { e } = run(TRS12, [
      { kind: "RedirectJunction", junctionId: "spareSwitch", toRouteId: "relaySpur" },
    ]);
    // Every sealed fact still reads the same (extra rings are unrecorded);
    // the town still falls.
    expect(obs(e, "OBS-BRIDGE")).toBe(true);
    expect(obs(e, "OBS-TOWER")).toBe(true);
    expect(obs(e, "OBS-HARBOR")).toBe(true);
    expect(obs(e, "OBS-QUIET")).toBe(true);
    expect(obs(e, "OBS-GREEN")).toBe(true);
    expect(out(e, "OUT-POWDER")).toBe(false);
    expect(out(e, "OUT-PROCLAMATION")).toBe(false);
  });

  it("wrong approach — covering the tower alone leaves the harbor silent", () => {
    const { e } = run(TRS12, [
      ...TRS12_DETOURS,
      { kind: "RedirectJunction", junctionId: "sweepSwitch", toRouteId: "plazaSpur" },
    ]);
    expect(obs(e, "OBS-TOWER")).toBe(true);
    expect(obs(e, "OBS-HARBOR")).toBe(false);
    expect(obs(e, "OBS-QUIET")).toBe(true);
    expect(out(e, "OUT-POWDER")).toBe(true);
    expect(out(e, "OUT-PROCLAMATION")).toBe(true);
  });

  it("wrong approach — delaying the rocket cart scrambles three stages", () => {
    const { t, e } = run(TRS12, [
      { kind: "SetMechanismDelay", entityId: "rocketCart", delayBeats: 1 },
    ]);
    expect(bellBeats(t, "towerBell")).toEqual([5]); // skid dragged to 5
    expect(obs(e, "OBS-BRIDGE")).toBe(false);      // stage A
    expect(obs(e, "OBS-TOWER")).toBe(false);       // stage B (wrong beat)
    expect(obs(e, "OBS-QUIET")).toBe(false);       // stage C (inside silence)
    expect(out(e, "OUT-POWDER")).toBe(false);      // still ruined
  });

  it("over-budget: two crews plus the finch exceed 5", () => {
    const eng = new TrsEngine();
    const { last } = testRun(eng, TRS12, [
      ...TRS12_WIN_TWO_CREW,
      { kind: "PlaceAndArmToy", toyId: "windUpFinch", socketId: "harborSocket" },
    ]);
    expect(last.cost).toBe(6); // 4 redirects + toy(2)
    expect(last.withinBudget).toBe(false);
    expect(last.budgetNote).toContain("budget");
  });

  it("deterministic replay: identical event log and final states", () => {
    const a = simulate(TRS12, TRS12_WIN_RELAY);
    const b = simulate(TRS12, TRS12_WIN_RELAY);
    expect(JSON.stringify(a.beats)).toBe(JSON.stringify(b.beats));
    expect(JSON.stringify(a.finalEntityStates)).toBe(JSON.stringify(b.finalEntityStates));
  });
});

// ---------------------------------------------------------- engine-level
describe("session engine acceptance (TRS-11..12)", () => {
  const eng = new TrsEngine();
  it.each([
    ["TRS11-relay", TRS11, TRS11_WIN_RELAY],
    ["TRS11-split", TRS11, TRS11_WIN_SPLIT],
    ["TRS12-relay", TRS12, TRS12_WIN_RELAY],
    ["TRS12-toy-harbor", TRS12, TRS12_WIN_TOY_HARBOR],
    ["TRS12-two-crew", TRS12, TRS12_WIN_TWO_CREW],
  ] as const)("%s: committed winning config accepts", (_name, level, ivs) => {
    const { state, last } = testRun(eng, level, [...ivs]);
    expect(last.evaluation.success).toBe(true);
    expect(last.withinBudget).toBe(true);
    expect(eng.validateAction(level, state, { type: "AcceptResult" }).ok).toBe(true);
    const accepted = eng.applyAction(level, state, { type: "AcceptResult" }).state;
    expect(accepted.solved).toBe(true);
  });

  it("canonical hash is stable across identical sessions", () => {
    const a = testRun(new TrsEngine(), TRS12, TRS12_WIN_TWO_CREW).state;
    const b = testRun(new TrsEngine(), TRS12, TRS12_WIN_TWO_CREW).state;
    expect(eng.canonicalHash(a)).toBe(eng.canonicalHash(b));
  });
});
