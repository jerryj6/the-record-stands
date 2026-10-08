/**
 * Acceptance tests for TRS-08, TRS-09, TRS-10 (master TRS-D rows 8–10).
 * Per level: content validity (TRS-006), verified winning trace(s),
 * designed wrong approaches failing on the named predicate, over-budget
 * rejection, deterministic replay. New observation forms exercised:
 * EventAbsent (TRS-08 quiet interval), VisibleFrom (TRS-09), plus
 * same-beat conjunction and shared-route convoy pulls.
 */
import { describe, it, expect } from "vitest";
import { TrsEngine } from "../../src/engine/trs/engine.js";
import { simulate } from "../../src/engine/trs/sim.js";
import { evaluateRun } from "../../src/engine/trs/evaluate.js";
import { TRS08 } from "../../src/content/levels/trs08-the-quiet-interval.js";
import { TRS09 } from "../../src/content/levels/trs09-the-same-moment.js";
import { TRS10 } from "../../src/content/levels/trs10-no-spare-parts.js";
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

const TRS08_DETOUR: Intervention = {
  kind: "RedirectJunction", junctionId: "duskSwitch", toRouteId: "cloisterDetour",
};
const TRS08_WIN_REROUTE: Intervention[] = [
  TRS08_DETOUR,
  { kind: "RedirectJunction", junctionId: "sweepSwitch", toRouteId: "vesperSpur" },
];
const TRS08_WIN_RETIME: Intervention[] = [
  TRS08_DETOUR,
  { kind: "SetMechanismDelay", entityId: "sweepCart", delayBeats: 1 },
];

const TRS09_BYPASSES: Intervention[] = [
  { kind: "RedirectJunction", junctionId: "northSwitch", toRouteId: "northBypass" },
  { kind: "RedirectJunction", junctionId: "southSwitch", toRouteId: "southBypass" },
];
const TRS09_WIN_TOY_N: Intervention[] = [
  ...TRS09_BYPASSES,
  { kind: "PlaceAndArmToy", toyId: "windUpToy", socketId: "northSocket" },
  { kind: "RedirectJunction", junctionId: "usherSwitch", toRouteId: "quaySpur" },
];
const TRS09_WIN_TOY_S: Intervention[] = [
  ...TRS09_BYPASSES,
  { kind: "PlaceAndArmToy", toyId: "windUpToy", socketId: "southSocket" },
  { kind: "RedirectJunction", junctionId: "pageSwitch", toRouteId: "terraceSpur" },
];
const TRS09_WIN_TWO_SKIDS: Intervention[] = [
  ...TRS09_BYPASSES,
  { kind: "RedirectJunction", junctionId: "pageSwitch", toRouteId: "terraceSpur" },
  { kind: "RedirectJunction", junctionId: "usherSwitch", toRouteId: "quaySpur" },
];

const TRS10_CONVOY: Intervention = {
  kind: "RedirectJunction", junctionId: "convoySwitch", toRouteId: "processionDetour",
};
const TRS10_WIN_BEST: Intervention[] = [
  TRS10_CONVOY,
  { kind: "RedirectJunction", junctionId: "spareSwitch", toRouteId: "towerSpur" },
];
const TRS10_WIN_TOY: Intervention[] = [
  TRS10_CONVOY,
  { kind: "PlaceAndArmToy", toyId: "windUpBird", socketId: "towerSocket" },
];
const TRS10_WIN_RESHUFFLE: Intervention[] = [
  TRS10_CONVOY,
  { kind: "RedirectJunction", junctionId: "sweepSwitch", toRouteId: "towerSpur" },
  { kind: "RedirectJunction", junctionId: "spareSwitch", toRouteId: "quayShift" },
];

// ---------------------------------------------------------------- TRS-08
describe("TRS-08 The Quiet Interval", () => {
  it("original run: bell rings at 4, silent 5–8, candles still ruined", () => {
    const { t, e } = run(TRS08, []);
    expect(obs(e, "OBS-VESPER")).toBe(true);
    expect(obs(e, "OBS-QUIET")).toBe(true);   // sweeper's extra ring was at 3
    expect(obs(e, "OBS-CLOISTER")).toBe(true);
    expect(obs(e, "OBS-GATE")).toBe(true);
    expect(bellBeats(t, "vesperBell")).toEqual([3, 4]); // sweeper + dusk cart
    expect(out(e, "OUT-CANDLES")).toBe(false);
    expect(e.success).toBe(false);
  });

  it("winning trace (reroute): sweeper spur skids at 4, silence preserved", () => {
    const { t, e } = run(TRS08, TRS08_WIN_REROUTE);
    expect(e.success).toBe(true);
    expect(bellBeats(t, "vesperBell")).toEqual([4]); // one-shot cause only
  });

  it("second strategy (retime): delay the sweeper's own skid from 3 to 4", () => {
    const { t, e } = run(TRS08, TRS08_WIN_RETIME);
    expect(e.success).toBe(true);
    expect(bellBeats(t, "vesperBell")).toEqual([4]);
  });

  it("the two strategies are different causal moves on the same sweeper", () => {
    const a = simulate(TRS08, TRS08_WIN_REROUTE);
    const b = simulate(TRS08, TRS08_WIN_RETIME);
    // Reroute: sweeper takes the spur road (towerGreen at 3).
    // Retime: sweeper keeps its own loop, one beat late (millpond at 3).
    expect(posAt(a, "sweepCart", 3)).toBe("towerGreen");
    expect(posAt(b, "sweepCart", 3)).toBe("millpond");
  });

  it("wrong approach — the toy rings at 4 AND through the sealed quiet", () => {
    const { t, e } = run(TRS08, [
      TRS08_DETOUR,
      { kind: "PlaceAndArmToy", toyId: "windUpToy", socketId: "vesperSocket" },
    ]);
    // Toy strikes at 4 and re-rings every later beat; the untouched
    // sweeper still contributes its own daily skid-ring at 3.
    expect(bellBeats(t, "vesperBell")).toEqual([3, 4, 5, 6, 7, 8]);
    expect(obs(e, "OBS-VESPER")).toBe(true);  // the permitted ring happens
    expect(out(e, "OUT-CANDLES")).toBe(true); // the candles are safe
    expect(obs(e, "OBS-QUIET")).toBe(false);  // ONLY the silence is violated
    expect(e.success).toBe(false);
  });

  it("wrong approach — closing the pump silences the permitted ring", () => {
    const { e } = run(TRS08, [
      { kind: "SetValve", entityId: "canalPump", running: false },
    ]);
    expect(out(e, "OUT-CANDLES")).toBe(true);
    expect(obs(e, "OBS-QUIET")).toBe(true); // vacuously
    expect(obs(e, "OBS-VESPER")).toBe(false);
  });

  it("wrong approach — a second ringer does not unload the candles", () => {
    const { e } = run(TRS08, [
      { kind: "RedirectJunction", junctionId: "sweepSwitch", toRouteId: "vesperSpur" },
    ]);
    expect(obs(e, "OBS-VESPER")).toBe(true);
    expect(obs(e, "OBS-QUIET")).toBe(true);
    expect(out(e, "OUT-CANDLES")).toBe(false); // dusk cart still skids at 4
  });

  it("wrong approach — delaying the dusk cart drags its skid into the quiet", () => {
    const { t, e } = run(TRS08, [
      { kind: "SetMechanismDelay", entityId: "duskCart", delayBeats: 1 },
    ]);
    expect(bellBeats(t, "vesperBell")).toEqual([3, 5]); // skid moved to 5
    expect(obs(e, "OBS-VESPER")).toBe(false);
    expect(obs(e, "OBS-QUIET")).toBe(false); // beat 5 is inside [5,8]
    expect(obs(e, "OBS-GATE")).toBe(false);
    expect(out(e, "OUT-CANDLES")).toBe(false);
  });

  it("wrong approach — the detour alone deletes the vesper ring", () => {
    const { e } = run(TRS08, [TRS08_DETOUR]);
    expect(out(e, "OUT-CANDLES")).toBe(true);
    expect(obs(e, "OBS-QUIET")).toBe(true);
    expect(obs(e, "OBS-VESPER")).toBe(false);
  });

  it("over-budget committed config cannot be accepted", () => {
    const eng = new TrsEngine();
    const { last } = testRun(eng, TRS08, [
      ...TRS08_WIN_REROUTE,
      { kind: "PlaceAndArmToy", toyId: "windUpToy", socketId: "vesperSocket" },
    ]);
    expect(last.cost).toBe(5);
    expect(last.withinBudget).toBe(false);
    expect(last.budgetNote).toContain("budget");
  });

  it("deterministic replay: identical event log", () => {
    const a = simulate(TRS08, TRS08_WIN_REROUTE);
    const b = simulate(TRS08, TRS08_WIN_REROUTE);
    expect(JSON.stringify(a.beats)).toBe(JSON.stringify(b.beats));
  });

  it("counterfactual: without the quiet window the toy would 'win'", () => {
    const t = simulate(TRS08, [
      TRS08_DETOUR,
      { kind: "PlaceAndArmToy", toyId: "windUpToy", socketId: "vesperSocket" },
    ]);
    const e = evaluateRun(
      t,
      TRS08.sealedObservations.filter(o => o.id !== "OBS-QUIET"),
      TRS08.desiredOutcomes,
    );
    expect(e.success).toBe(true); // OBS-QUIET is the load-bearing fact
  });
});

// ---------------------------------------------------------------- TRS-09
describe("TRS-09 The Same Moment", () => {
  it("original run: both bells at 4, both views at 5 — both vases ruined", () => {
    const { e } = run(TRS09, []);
    expect(obs(e, "OBS-BELL-N")).toBe(true);
    expect(obs(e, "OBS-BELL-S")).toBe(true);
    expect(obs(e, "OBS-ARCH-N")).toBe(true);
    expect(obs(e, "OBS-VIEW-N")).toBe(true);
    expect(obs(e, "OBS-VIEW-S")).toBe(true);
    expect(out(e, "OUT-VASE-N")).toBe(false);
    expect(out(e, "OUT-VASE-S")).toBe(false);
    expect(e.success).toBe(false);
  });

  it("winning trace (toy north + usher skid south) passes all five", () => {
    const { e } = run(TRS09, TRS09_WIN_TOY_N);
    expect(e.success).toBe(true);
  });

  it("winning trace (toy south + page skid north) passes all five", () => {
    const { e } = run(TRS09, TRS09_WIN_TOY_S);
    expect(e.success).toBe(true);
  });

  it("winning trace (two sacrificial skids, no toy) passes all five", () => {
    const { e } = run(TRS09, TRS09_WIN_TWO_SKIDS);
    expect(e.success).toBe(true);
  });

  it("the three allocations differ causally at beat 4", () => {
    const a = simulate(TRS09, TRS09_WIN_TOY_N);
    const b = simulate(TRS09, TRS09_WIN_TOY_S);
    const c = simulate(TRS09, TRS09_WIN_TWO_SKIDS);
    const causes = (t: typeof a, bell: string) =>
      t.beats.flatMap(x => x.events)
        .filter(ev => ev.type === "BellRing" && ev.entityId === bell && ev.beat === 4)
        .map(ev => String(ev.data?.["cause"]));
    expect(causes(a, "northBell")).toEqual(["windUpToy:strike"]);
    expect(causes(a, "southBell")).toEqual(["usherCart:skid"]);
    expect(causes(b, "northBell")).toEqual(["pageCart:skid"]);
    expect(causes(b, "southBell")).toEqual(["windUpToy:strike"]);
    expect(causes(c, "northBell")).toEqual(["pageCart:skid"]);
    expect(causes(c, "southBell")).toEqual(["usherCart:skid"]);
  });

  it("wrong approach — the quay-late spur rings a beat late (near-miss)", () => {
    const { e } = run(TRS09, [
      ...TRS09_BYPASSES,
      { kind: "PlaceAndArmToy", toyId: "windUpToy", socketId: "northSocket" },
      { kind: "RedirectJunction", junctionId: "usherSwitch", toRouteId: "quayLate" },
    ]);
    expect(obs(e, "OBS-BELL-N")).toBe(true);
    expect(obs(e, "OBS-BELL-S")).toBe(false); // ring at 5, not the recorded 4
    expect(out(e, "OUT-VASE-N")).toBe(true);
    expect(out(e, "OUT-VASE-S")).toBe(true);
    expect(e.success).toBe(false);
  });

  it("wrong approach — the terrace-early spur rings a beat early (near-miss)", () => {
    const { e } = run(TRS09, [
      ...TRS09_BYPASSES,
      { kind: "PlaceAndArmToy", toyId: "windUpToy", socketId: "southSocket" },
      { kind: "RedirectJunction", junctionId: "pageSwitch", toRouteId: "terraceEarly" },
    ]);
    expect(obs(e, "OBS-BELL-N")).toBe(false); // ring at 3
    expect(obs(e, "OBS-BELL-S")).toBe(true);
  });

  it("wrong approach — one toy cannot cover both bells", () => {
    const { e } = run(TRS09, [
      ...TRS09_BYPASSES,
      { kind: "PlaceAndArmToy", toyId: "windUpToy", socketId: "northSocket" },
    ]);
    expect(obs(e, "OBS-BELL-N")).toBe(true);
    expect(obs(e, "OBS-BELL-S")).toBe(false);
    expect(out(e, "OUT-VASE-N")).toBe(true);
    expect(out(e, "OUT-VASE-S")).toBe(true);
  });

  it("wrong approach — the cellar route is dry but off the north camera", () => {
    const { e } = run(TRS09, [
      { kind: "RedirectJunction", junctionId: "northSwitch", toRouteId: "northCellar" },
      TRS09_BYPASSES[1]!,
      { kind: "PlaceAndArmToy", toyId: "windUpToy", socketId: "northSocket" },
      { kind: "RedirectJunction", junctionId: "usherSwitch", toRouteId: "quaySpur" },
    ]);
    expect(obs(e, "OBS-ARCH-N")).toBe(true);   // arch prefix still holds
    expect(obs(e, "OBS-BELL-N")).toBe(true);   // toy still rings at 4
    expect(obs(e, "OBS-BELL-S")).toBe(true);
    expect(obs(e, "OBS-VIEW-S")).toBe(true);
    expect(obs(e, "OBS-VIEW-N")).toBe(false);  // vaultStairs is off-camera
    expect(out(e, "OUT-VASE-N")).toBe(true);
    expect(e.success).toBe(false);
  });

  it("wrong approach — closing the storm main saves both vases, kills both bells", () => {
    const { e } = run(TRS09, [
      { kind: "SetValve", entityId: "stormMain", running: false },
    ]);
    expect(out(e, "OUT-VASE-N")).toBe(true);
    expect(out(e, "OUT-VASE-S")).toBe(true);
    expect(obs(e, "OBS-BELL-N")).toBe(false);
    expect(obs(e, "OBS-BELL-S")).toBe(false);
  });

  it("wrong approach — bypasses with no substitutes silence both bells", () => {
    const { e } = run(TRS09, TRS09_BYPASSES);
    expect(out(e, "OUT-VASE-N")).toBe(true);
    expect(out(e, "OUT-VASE-S")).toBe(true);
    expect(obs(e, "OBS-BELL-N")).toBe(false);
    expect(obs(e, "OBS-BELL-S")).toBe(false);
  });

  it("over-budget: a fifth move on a 4/4 plan cannot be accepted", () => {
    const eng = new TrsEngine();
    const { last } = testRun(eng, TRS09, [
      ...TRS09_WIN_TWO_SKIDS,
      { kind: "PlaceAndArmToy", toyId: "windUpToy", socketId: "northSocket" },
    ]);
    expect(last.cost).toBe(5);
    expect(last.withinBudget).toBe(false);
    expect(last.budgetNote).toContain("budget");
  });

  it("deterministic replay: identical event log", () => {
    const a = simulate(TRS09, TRS09_WIN_TWO_SKIDS);
    const b = simulate(TRS09, TRS09_WIN_TWO_SKIDS);
    expect(JSON.stringify(a.beats)).toBe(JSON.stringify(b.beats));
  });
});

// ---------------------------------------------------------------- TRS-10
describe("TRS-10 No Spare Parts", () => {
  it("original run: all five observations pass, both gift sets ruined", () => {
    const { e } = run(TRS10, []);
    expect(obs(e, "OBS-TOWER")).toBe(true);
    expect(obs(e, "OBS-HARBOR")).toBe(true);
    expect(obs(e, "OBS-GATE-A")).toBe(true);
    expect(obs(e, "OBS-STAND-B")).toBe(true);
    expect(obs(e, "OBS-BRIDGE")).toBe(true);
    expect(out(e, "OUT-GIFT-A")).toBe(false);
    expect(out(e, "OUT-GIFT-B")).toBe(false);
    expect(e.success).toBe(false);
  });

  it("one convoy pull really moves BOTH gift carts (shared route)", () => {
    const t = simulate(TRS10, [TRS10_CONVOY]);
    expect(posAt(t, "giftCartA", 4)).toBe("coveredWalk");
    expect(posAt(t, "giftCartB", 4)).toBe("coveredWalk");
  });

  it("BEST (2/4): borrow the tower spur for the spare cart; sweeper untouched", () => {
    const { t, e } = run(TRS10, TRS10_WIN_BEST);
    expect(e.success).toBe(true);
    // The harbor ring is the sweeper's ORIGINAL consequence — reused, not rebuilt.
    expect(bellBeats(t, "harborBell")).toEqual([6]);
    expect(bellBeats(t, "towerBell")).toEqual([4]);
  });

  it("TOY (3/4): the bird covers the tower bell", () => {
    const { e } = run(TRS10, TRS10_WIN_TOY);
    expect(e.success).toBe(true);
  });

  it("RESHUFFLE (3/4): sweeper takes the tower, spare covers the quay", () => {
    const { t, e } = run(TRS10, TRS10_WIN_RESHUFFLE);
    expect(e.success).toBe(true);
    expect(bellBeats(t, "towerBell")).toEqual([4]);
    expect(bellBeats(t, "harborBell")).toEqual([6]);
    // The sweeper's recorded bridge crossing survives the reassignment.
    expect(posAt(t, "sweeperCart", 2)).toBe("sweepBridge");
  });

  it("the plans allocate the scarce props differently", () => {
    const a = simulate(TRS10, TRS10_WIN_BEST);
    const b = simulate(TRS10, TRS10_WIN_TOY);
    const c = simulate(TRS10, TRS10_WIN_RESHUFFLE);
    const cause = (t: typeof a, bell: string, beat: number) =>
      t.beats.flatMap(x => x.events)
        .filter(ev => ev.type === "BellRing" && ev.entityId === bell && ev.beat === beat)
        .map(ev => String(ev.data?.["cause"]));
    expect(cause(a, "towerBell", 4)).toEqual(["spareCart:skid"]);
    expect(cause(a, "harborBell", 6)).toEqual(["sweeperCart:skid"]);
    expect(cause(b, "towerBell", 4)).toEqual(["windUpBird:strike"]);
    expect(cause(c, "towerBell", 4)).toEqual(["sweeperCart:skid"]);
    expect(cause(c, "harborBell", 6)).toEqual(["spareCart:skid"]);
  });

  it("wrong approach — moving the sweeper to the tower orphans the harbor", () => {
    const { e } = run(TRS10, [
      TRS10_CONVOY,
      { kind: "RedirectJunction", junctionId: "sweepSwitch", toRouteId: "towerSpur" },
    ]);
    expect(obs(e, "OBS-TOWER")).toBe(true);   // tower covered by the sweeper
    expect(obs(e, "OBS-HARBOR")).toBe(false); // its old consequence is gone
    expect(obs(e, "OBS-BRIDGE")).toBe(true);  // towerSpur keeps the bridge
    expect(out(e, "OUT-GIFT-A")).toBe(true);
    expect(out(e, "OUT-GIFT-B")).toBe(true);
    expect(e.success).toBe(false);
  });

  it("wrong approach — the detour alone drops the tower ring", () => {
    const { e } = run(TRS10, [TRS10_CONVOY]);
    expect(out(e, "OUT-GIFT-A")).toBe(true);
    expect(out(e, "OUT-GIFT-B")).toBe(true);
    expect(obs(e, "OBS-TOWER")).toBe(false);
    expect(obs(e, "OBS-HARBOR")).toBe(true); // sweeper's consequence stands
  });

  it("wrong approach — one pump feeds both tiles: valve kills both bells", () => {
    const { e } = run(TRS10, [
      { kind: "SetValve", entityId: "canalPump", running: false },
    ]);
    expect(out(e, "OUT-GIFT-A")).toBe(true);
    expect(obs(e, "OBS-TOWER")).toBe(false);
    expect(obs(e, "OBS-HARBOR")).toBe(false);
  });

  it("wrong approach — the bird at the harbor socket leaves the tower bare", () => {
    const { e } = run(TRS10, [
      TRS10_CONVOY,
      { kind: "PlaceAndArmToy", toyId: "windUpBird", socketId: "harborSocket" },
    ]);
    expect(obs(e, "OBS-HARBOR")).toBe(true); // parked re-rings cover beat 6
    expect(obs(e, "OBS-TOWER")).toBe(false);
    expect(e.success).toBe(false);
  });

  it("wrong approach — delaying a gift cart re-times its record", () => {
    const { e } = run(TRS10, [
      { kind: "SetMechanismDelay", entityId: "giftCartA", delayBeats: 1 },
    ]);
    expect(obs(e, "OBS-GATE-A")).toBe(false); // gate at 6 now
    expect(obs(e, "OBS-TOWER")).toBe(true);  // gift cart B still skids at 4
    expect(out(e, "OUT-GIFT-A")).toBe(false);
  });

  it("over-budget: reshuffle + the priced toy exceed the budget of 4", () => {
    const eng = new TrsEngine();
    const { last } = testRun(eng, TRS10, [
      ...TRS10_WIN_RESHUFFLE,
      { kind: "PlaceAndArmToy", toyId: "windUpBird", socketId: "towerSocket" },
      { kind: "ScheduleActivation", entityId: "festivalGate", beat: 2 },
    ]);
    expect(last.cost).toBe(6); // 3 redirects + toy(2) + schedule(1)
    expect(last.withinBudget).toBe(false);
    expect(last.budgetNote).toContain("budget");
  });

  it("deterministic replay: identical event log", () => {
    const a = simulate(TRS10, TRS10_WIN_BEST);
    const b = simulate(TRS10, TRS10_WIN_BEST);
    expect(JSON.stringify(a.beats)).toBe(JSON.stringify(b.beats));
    expect(JSON.stringify(a.finalEntityStates)).toBe(JSON.stringify(b.finalEntityStates));
  });

  it("counterfactual: the harbor record is what forbids moving the sweeper", () => {
    const t = simulate(TRS10, [
      TRS10_CONVOY,
      { kind: "RedirectJunction", junctionId: "sweepSwitch", toRouteId: "towerSpur" },
    ]);
    const e = evaluateRun(t, [], TRS10.desiredOutcomes);
    expect(e.success).toBe(true); // obs are what make the orphan illegal
  });
});

// ---------------------------------------------------------- engine-level
describe("session engine acceptance (TRS-08..10)", () => {
  const eng = new TrsEngine();
  it.each([
    ["TRS08-reroute", TRS08, TRS08_WIN_REROUTE],
    ["TRS08-retime", TRS08, TRS08_WIN_RETIME],
    ["TRS09-toyN+usher", TRS09, TRS09_WIN_TOY_N],
    ["TRS09-toyS+page", TRS09, TRS09_WIN_TOY_S],
    ["TRS09-two-skids", TRS09, TRS09_WIN_TWO_SKIDS],
    ["TRS10-best", TRS10, TRS10_WIN_BEST],
    ["TRS10-toy", TRS10, TRS10_WIN_TOY],
    ["TRS10-reshuffle", TRS10, TRS10_WIN_RESHUFFLE],
  ] as const)("%s: committed winning config accepts", (_name, level, ivs) => {
    const { state, last } = testRun(eng, level, [...ivs]);
    expect(last.evaluation.success).toBe(true);
    expect(last.withinBudget).toBe(true);
    expect(eng.validateAction(level, state, { type: "AcceptResult" }).ok).toBe(true);
    const accepted = eng.applyAction(level, state, { type: "AcceptResult" }).state;
    expect(accepted.solved).toBe(true);
  });

  it("canonical hash is stable across identical sessions", () => {
    const a = testRun(new TrsEngine(), TRS09, TRS09_WIN_TWO_SKIDS).state;
    const b = testRun(new TrsEngine(), TRS09, TRS09_WIN_TWO_SKIDS).state;
    expect(eng.canonicalHash(a)).toBe(eng.canonicalHash(b));
  });
});
