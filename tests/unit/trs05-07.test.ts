/**
 * Acceptance tests for TRS-05, TRS-06, TRS-07 (master TRS-D rows 5–7).
 * Per level: content validity (TRS-006), verified winning trace, designed
 * wrong approaches failing on the named predicate, over-budget rejection,
 * and deterministic replay. TRS-05 and TRS-06 each carry two+
 * strategically distinct valid solutions (GME-005); TRS-05 exercises the
 * VisibleFrom camera-region form and TRS-06 the EventCount form.
 */
import { describe, it, expect } from "vitest";
import { TrsEngine } from "../../src/engine/trs/engine.js";
import { simulate } from "../../src/engine/trs/sim.js";
import { evaluateRun } from "../../src/engine/trs/evaluate.js";
import { TRS05 } from "../../src/content/levels/trs05-two-sides-of-the-square.js";
import { TRS06 } from "../../src/content/levels/trs06-the-unbroken-exhibit.js";
import { TRS07 } from "../../src/content/levels/trs07-the-wrong-delivery.js";
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
const ringsAt = (t: Timeline, bell: string, beat: number) =>
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

const TRS05_WIN_REROUTE: Intervention[] = [
  { kind: "RedirectJunction", junctionId: "routeSwitch", toRouteId: "arcadeDetour" },
  { kind: "PlaceAndArmToy", toyId: "windUpToy", socketId: "squareSocket" },
];
const TRS05_WIN_DRY: Intervention[] = [
  { kind: "SetValve", entityId: "plazaFountain", running: false },
  { kind: "PlaceAndArmToy", toyId: "windUpToy", socketId: "squareSocket" },
];
// Factually valid but priced out: detour + awning wade costs 4 > 3.
const TRS05_WADE: Intervention[] = [
  { kind: "RedirectJunction", junctionId: "routeSwitch", toRouteId: "arcadeDetour" },
  { kind: "RedirectJunction", junctionId: "awningSwitch", toRouteId: "awningWade" },
];

const TRS06_DETOUR: Intervention = {
  kind: "RedirectJunction", junctionId: "exhibitSwitch", toRouteId: "cloisterDetour",
};
const TRS06_WIN_TOY: Intervention[] = [
  TRS06_DETOUR,
  { kind: "PlaceAndArmToy", toyId: "windUpWren", socketId: "gallerySocket" },
];
const TRS06_WIN_ABSORBER: Intervention[] = [
  TRS06_DETOUR,
  { kind: "RedirectJunction", junctionId: "porterSwitch", toRouteId: "marbleSpur" },
];
const TRS06_WIN_HAZARD: Intervention[] = [
  { kind: "SetValve", entityId: "sprinklerHouse", running: false },
  { kind: "PlaceAndArmToy", toyId: "windUpWren", socketId: "gallerySocket" },
];

const TRS07_WIN: Intervention[] = [
  { kind: "RedirectJunction", junctionId: "postSwitch", toRouteId: "postRoadCivic" },
  { kind: "RedirectJunction", junctionId: "bargeSwitch", toRouteId: "lockRunHarbor" },
];

// ---------------------------------------------------------------- TRS-05
describe("TRS-05 Two Sides of the Square", () => {
  it("original run satisfies all four observations but ruins the prism lens", () => {
    const { e } = run(TRS05, []);
    expect(obs(e, "OBS-N-ARCH")).toBe(true);
    expect(obs(e, "OBS-N-VIS")).toBe(true);
    expect(obs(e, "OBS-S-BELL")).toBe(true);
    expect(obs(e, "OBS-S-VIS")).toBe(true);
    expect(out(e, "OUT-PRISM")).toBe(false);
    expect(e.success).toBe(false);
  });

  it("winning trace (reroute): arcade detour keeps both camera views, toy rings the bell", () => {
    const { e } = run(TRS05, TRS05_WIN_REROUTE);
    expect(e.success).toBe(true);
    expect(e.allObservationsPass).toBe(true);
    expect(e.allOutcomesPass).toBe(true);
  });

  it("second strategy (dry-in-place): valve off + toy also passes", () => {
    const { e } = run(TRS05, TRS05_WIN_DRY);
    expect(e.success).toBe(true);
  });

  it("the two strategies differ: only reroute takes the cart off the cobbles", () => {
    const a = simulate(TRS05, TRS05_WIN_REROUTE);
    const b = simulate(TRS05, TRS05_WIN_DRY);
    expect(posAt(a, "prismCart", 4)).toBe("arcadeCobbles");
    expect(posAt(b, "prismCart", 4)).toBe("slickCobbles"); // still on camera
    // Both keep the south view (arcadeCobbles and slickCobbles share the
    // southArcade region) — the difference is whether the wet tile is
    // avoided or dried.
  });

  it("wrong approach — covering the camera view changes nothing sealed", () => {
    const { e } = run(TRS05, [
      { kind: "RepositionProp", entityId: "canvasScreen", toLocationId: "southArcade" },
    ]);
    expect(obs(e, "OBS-N-ARCH")).toBe(true);
    expect(obs(e, "OBS-N-VIS")).toBe(true);
    expect(obs(e, "OBS-S-BELL")).toBe(true);
    expect(obs(e, "OBS-S-VIS")).toBe(true);
    expect(out(e, "OUT-PRISM")).toBe(false); // the skid still happens
    expect(e.success).toBe(false);
  });

  it("wrong approach — moving the wrong cart fixes nothing", () => {
    const { e } = run(TRS05, [
      { kind: "RedirectJunction", junctionId: "awningSwitch", toRouteId: "awningSpur" },
      { kind: "PlaceAndArmToy", toyId: "windUpToy", socketId: "squareSocket" },
    ]);
    expect(e.allObservationsPass).toBe(true); // awning cart was never on record
    expect(out(e, "OUT-PRISM")).toBe(false);
  });

  it("wrong approach — the dry back lane leaves the south camera's region", () => {
    const { e } = run(TRS05, [
      { kind: "RedirectJunction", junctionId: "routeSwitch", toRouteId: "backLane" },
      { kind: "PlaceAndArmToy", toyId: "windUpToy", socketId: "squareSocket" },
    ]);
    expect(out(e, "OUT-PRISM")).toBe(true);
    expect(obs(e, "OBS-N-ARCH")).toBe(true);
    expect(obs(e, "OBS-N-VIS")).toBe(true);
    expect(obs(e, "OBS-S-BELL")).toBe(true);
    expect(obs(e, "OBS-S-VIS")).toBe(false); // workshopRow is in no region
  });

  it("wrong approach — closing the fountain alone drops the recorded ring", () => {
    const { e } = run(TRS05, [
      { kind: "SetValve", entityId: "plazaFountain", running: false },
    ]);
    expect(out(e, "OUT-PRISM")).toBe(true);
    expect(obs(e, "OBS-S-BELL")).toBe(false);
    expect(obs(e, "OBS-S-VIS")).toBe(true); // positions were never the problem
  });

  it("wrong approach — the dry detour alone drops the recorded ring", () => {
    const { e } = run(TRS05, [TRS05_WIN_REROUTE[0]!]);
    expect(out(e, "OUT-PRISM")).toBe(true);
    expect(obs(e, "OBS-S-BELL")).toBe(false);
    expect(obs(e, "OBS-S-VIS")).toBe(true);
  });

  it("wrong approach — delaying the cart re-times the recorded beats", () => {
    const { e } = run(TRS05, [
      { kind: "SetMechanismDelay", entityId: "prismCart", delayBeats: 1 },
    ]);
    expect(obs(e, "OBS-N-ARCH")).toBe(false);  // arch crossing moves to 4
    expect(obs(e, "OBS-N-VIS")).toBe(true);   // beat 3 is galleryRow — still in-region
    expect(obs(e, "OBS-S-BELL")).toBe(false);  // skid (and its ring) moves to 5
    expect(obs(e, "OBS-S-VIS")).toBe(false);  // beat 4 is squareArch — off south camera
    expect(out(e, "OUT-PRISM")).toBe(false);
  });

  it("over-budget: the awning-wade plan is factually valid but unpayable", () => {
    const eng = new TrsEngine();
    const { last } = testRun(eng, TRS05, TRS05_WADE);
    // The empty awning cart really does skid-ring the square bell at 4 —
    // the rejection is budget alone.
    expect(last.evaluation.success).toBe(true);
    expect(last.cost).toBe(4);
    expect(last.withinBudget).toBe(false);
    expect(last.budgetNote).toContain("budget");
  });

  it("deterministic replay: identical event log", () => {
    const a = simulate(TRS05, TRS05_WIN_REROUTE);
    const b = simulate(TRS05, TRS05_WIN_REROUTE);
    expect(JSON.stringify(a.beats)).toBe(JSON.stringify(b.beats));
    expect(JSON.stringify(a.finalEntityStates)).toBe(JSON.stringify(b.finalEntityStates));
  });

  it("counterfactual: the camera facts are load-bearing", () => {
    // With observations stripped, the off-camera back lane would 'win'.
    const t = simulate(TRS05, [
      { kind: "RedirectJunction", junctionId: "routeSwitch", toRouteId: "backLane" },
      { kind: "PlaceAndArmToy", toyId: "windUpToy", socketId: "squareSocket" },
    ]);
    const e = evaluateRun(t, [], TRS05.desiredOutcomes);
    expect(e.success).toBe(true); // OBS-S-VIS is what rules the back lane out
  });
});

// ---------------------------------------------------------------- TRS-06
describe("TRS-06 The Unbroken Exhibit", () => {
  it("original run satisfies all four observations but ruins the orb", () => {
    const { e } = run(TRS06, []);
    expect(obs(e, "OBS-ARCH")).toBe(true);
    expect(obs(e, "OBS-RING")).toBe(true);
    expect(obs(e, "OBS-STAIR")).toBe(true);
    expect(obs(e, "OBS-PORTER")).toBe(true);
    expect(out(e, "OUT-ORB")).toBe(false);
    expect(e.success).toBe(false);
  });

  it("strategy A (toy substitute): cloister detour + wren strike passes", () => {
    const { e } = run(TRS06, TRS06_WIN_TOY);
    expect(e.success).toBe(true);
    expect(e.allObservationsPass).toBe(true);
  });

  it("strategy B (swap the absorber): porter takes the marble skid", () => {
    const { e } = run(TRS06, TRS06_WIN_ABSORBER);
    expect(e.success).toBe(true);
    expect(e.allObservationsPass).toBe(true);
  });

  it("strategy C (remove the hazard): dry marble + wren strike passes", () => {
    const { e } = run(TRS06, TRS06_WIN_HAZARD);
    expect(e.success).toBe(true);
  });

  it("A, B, C are substantively different causal chains", () => {
    const a = simulate(TRS06, TRS06_WIN_TOY);
    const b = simulate(TRS06, TRS06_WIN_ABSORBER);
    const c = simulate(TRS06, TRS06_WIN_HAZARD);
    // The recorded single ring at beat 4 is produced by different causes:
    expect(ringsAt(a, "galleryBell", 4)).toEqual(["windUpWren:strike"]);
    expect(ringsAt(b, "galleryBell", 4)).toEqual(["porterCart:skid"]);
    expect(ringsAt(c, "galleryBell", 4)).toEqual(["windUpWren:strike"]);
    // A vs C: substitute-signal vs hazard-removal differ in where the
    // exhibit cart spends beat 4 (cloister vs still-wet tile, now dry).
    expect(posAt(a, "exhibitCart", 4)).toBe("cloisterPath");
    expect(posAt(c, "exhibitCart", 4)).toBe("floodedMarble");
  });

  it("wrong approach — a second absorber double-rings the recorded bell", () => {
    // Porter onto the spur while the exhibit still rides the gallery route:
    // TWO skids at beat 4 → the EventCount of exactly 1 fails on the FACTS.
    const { t, e } = run(TRS06, [
      { kind: "RedirectJunction", junctionId: "porterSwitch", toRouteId: "marbleSpur" },
    ]);
    expect(ringsAt(t, "galleryBell", 4)).toHaveLength(2);
    expect(obs(e, "OBS-RING")).toBe(false);
    expect(obs(e, "OBS-PORTER")).toBe(true); // its gate crossing held
    expect(out(e, "OUT-ORB")).toBe(false);
    expect(e.success).toBe(false);
  });

  it("wrong approach — cloister alone drops the count to zero", () => {
    const { e } = run(TRS06, [TRS06_DETOUR]);
    expect(out(e, "OUT-ORB")).toBe(true);
    expect(obs(e, "OBS-RING")).toBe(false);
    expect(obs(e, "OBS-ARCH")).toBe(true);
    expect(obs(e, "OBS-STAIR")).toBe(true);
  });

  it("wrong approach — closing the sprinkler alone drops the count to zero", () => {
    const { e } = run(TRS06, [TRS06_WIN_HAZARD[0]!]);
    expect(out(e, "OUT-ORB")).toBe(true);
    expect(obs(e, "OBS-RING")).toBe(false);
  });

  it("wrong approach — the annex socket rings the wrong bell", () => {
    const { e } = run(TRS06, [
      TRS06_DETOUR,
      { kind: "PlaceAndArmToy", toyId: "windUpWren", socketId: "annexSocket" },
    ]);
    expect(out(e, "OUT-ORB")).toBe(true);
    expect(obs(e, "OBS-RING")).toBe(false);
  });

  it("wrong approach — the buffer crate absorbs nothing", () => {
    const { e } = run(TRS06, [
      { kind: "RepositionProp", entityId: "bufferCrate", toLocationId: "floodedMarble" },
    ]);
    expect(e.allObservationsPass).toBe(true); // the crate was never on record
    expect(out(e, "OUT-ORB")).toBe(false);
  });

  it("wrong approach — delaying the exhibit breaks arch, ring, and staircase", () => {
    const { e } = run(TRS06, [
      { kind: "SetMechanismDelay", entityId: "exhibitCart", delayBeats: 1 },
    ]);
    expect(obs(e, "OBS-ARCH")).toBe(false);
    expect(obs(e, "OBS-RING")).toBe(false); // ring moves to beat 5
    expect(obs(e, "OBS-STAIR")).toBe(false);
    expect(out(e, "OUT-ORB")).toBe(false);
  });

  it("over-budget committed config cannot be accepted", () => {
    const eng = new TrsEngine();
    const { last } = testRun(eng, TRS06, [
      ...TRS06_WIN_TOY,
      TRS06_WIN_ABSORBER[1]!,
      { kind: "ScheduleActivation", entityId: "sprinklerHouse", beat: 2 },
    ]);
    expect(last.cost).toBe(4);
    expect(last.withinBudget).toBe(false);
  });

  it("deterministic replay: identical event log", () => {
    const a = simulate(TRS06, TRS06_WIN_ABSORBER);
    const b = simulate(TRS06, TRS06_WIN_ABSORBER);
    expect(JSON.stringify(a.beats)).toBe(JSON.stringify(b.beats));
  });
});

// ---------------------------------------------------------------- TRS-07
describe("TRS-07 The Wrong Delivery", () => {
  it("original run satisfies all four observations but both parcels arrive wrong", () => {
    const { e } = run(TRS07, []);
    expect(obs(e, "OBS-SORTING")).toBe(true);
    expect(obs(e, "OBS-POST-PLATFORM")).toBe(true);
    expect(obs(e, "OBS-LOCK")).toBe(true);
    expect(obs(e, "OBS-BARGE-PLATFORM")).toBe(true);
    expect(out(e, "OUT-MAYOR")).toBe(false); // post trolley ends at the quay
    expect(out(e, "OUT-DOCK")).toBe(false);  // barge ends at the town hall
    expect(e.success).toBe(false);
  });

  it("winning trace: two legal re-routings preserve every recorded point", () => {
    const { e } = run(TRS07, TRS07_WIN);
    expect(e.success).toBe(true);
    expect(e.allObservationsPass).toBe(true);
    expect(e.allOutcomesPass).toBe(true);
  });

  it("the repaired routes keep the recorded handoffs verbatim", () => {
    const t = simulate(TRS07, TRS07_WIN);
    expect(posAt(t, "postTrolley", 3)).toBe("sortingCross");
    expect(posAt(t, "postTrolley", 5)).toBe("handoffPlatform");
    expect(posAt(t, "bargeCart", 6)).toBe("handoffPlatform");
    expect(t.finalEntityStates["postTrolley"]?.["position"]).toBe("townHallSteps");
    expect(t.finalEntityStates["bargeCart"]?.["position"]).toBe("harborMasterQuay");
  });

  it("wrong approach — fixing only the post trolley strands the barge", () => {
    const { e } = run(TRS07, [TRS07_WIN[0]!]);
    expect(e.allObservationsPass).toBe(true);
    expect(out(e, "OUT-MAYOR")).toBe(true);
    expect(out(e, "OUT-DOCK")).toBe(false); // the other outcome is load-bearing
    expect(e.success).toBe(false);
  });

  it("wrong approach — fixing only the barge strands the post trolley", () => {
    const { e } = run(TRS07, [TRS07_WIN[1]!]);
    expect(e.allObservationsPass).toBe(true);
    expect(out(e, "OUT-DOCK")).toBe(true);
    expect(out(e, "OUT-MAYOR")).toBe(false);
  });

  it("wrong approach — the express fork skips the recorded handoff", () => {
    const { e } = run(TRS07, [
      { kind: "RedirectJunction", junctionId: "postSwitch", toRouteId: "postExpress" },
      TRS07_WIN[1]!,
    ]);
    // Both parcels reach the right recipients, but the post trolley was
    // never AT the platform at beat 5 — the archive saw it there.
    expect(out(e, "OUT-MAYOR")).toBe(true);
    expect(out(e, "OUT-DOCK")).toBe(true);
    expect(obs(e, "OBS-SORTING")).toBe(true);
    expect(obs(e, "OBS-POST-PLATFORM")).toBe(false);
    expect(e.success).toBe(false);
  });

  it("wrong approach — the post trolley on the barge's road loses its record", () => {
    const { e } = run(TRS07, [
      { kind: "RedirectJunction", junctionId: "postSwitch", toRouteId: "lockRunHarbor" },
    ]);
    expect(obs(e, "OBS-SORTING")).toBe(false);
    expect(obs(e, "OBS-POST-PLATFORM")).toBe(false); // platform at 6, not 5
    expect(obs(e, "OBS-LOCK")).toBe(true); // barge's own record is untouched
    expect(out(e, "OUT-MAYOR")).toBe(false); // post trolley ends at the quay
  });

  it("wrong approach — relabeling the parcel decal edits no cargo", () => {
    const { e } = run(TRS07, [
      { kind: "RepositionProp", entityId: "parcelDecal", toLocationId: "townHallSteps" },
    ]);
    expect(e.allObservationsPass).toBe(true);
    expect(out(e, "OUT-MAYOR")).toBe(false);
    expect(out(e, "OUT-DOCK")).toBe(false);
  });

  it("wrong approach — the platform hand bell delivers nothing", () => {
    const { e } = run(TRS07, [
      ...TRS07_WIN,
      { kind: "PlaceAndArmToy", toyId: "windUpToy", socketId: "platformSocket" },
    ]);
    // (This config is also over budget; the dove rings a bell that moves
    // no parcels — but it does not break any sealed fact.)
    expect(e.allObservationsPass).toBe(true);
    expect(e.allOutcomesPass).toBe(true);
  });

  it("wrong approach — delaying the post trolley re-times its record", () => {
    const { e } = run(TRS07, [
      { kind: "SetMechanismDelay", entityId: "postTrolley", delayBeats: 1 },
      TRS07_WIN[1]!,
    ]);
    expect(obs(e, "OBS-SORTING")).toBe(false);
    expect(obs(e, "OBS-POST-PLATFORM")).toBe(false);
    expect(out(e, "OUT-MAYOR")).toBe(false); // ends at the quay, a beat late
  });

  it("over-budget: the winning pair leaves no room for any third move", () => {
    const eng = new TrsEngine();
    const { last } = testRun(eng, TRS07, [
      ...TRS07_WIN,
      { kind: "PlaceAndArmToy", toyId: "windUpToy", socketId: "platformSocket" },
    ]);
    expect(last.evaluation.success).toBe(true); // facts are fine
    expect(last.cost).toBe(5);
    expect(last.withinBudget).toBe(false);
    expect(last.budgetNote).toContain("budget");
  });

  it("deterministic replay: identical event log", () => {
    const a = simulate(TRS07, TRS07_WIN);
    const b = simulate(TRS07, TRS07_WIN);
    expect(JSON.stringify(a.beats)).toBe(JSON.stringify(b.beats));
    expect(JSON.stringify(a.finalEntityStates)).toBe(JSON.stringify(b.finalEntityStates));
  });

  it("counterfactual: the platform facts are what make the express illegal", () => {
    const t = simulate(TRS07, [
      { kind: "RedirectJunction", junctionId: "postSwitch", toRouteId: "postExpress" },
      TRS07_WIN[1]!,
    ]);
    const e = evaluateRun(t, [], TRS07.desiredOutcomes);
    expect(e.success).toBe(true); // right docks, wrong evidence
  });
});

// ---------------------------------------------------------- engine-level
describe("session engine acceptance (TRS-05..07)", () => {
  const eng = new TrsEngine();
  it.each([
    ["TRS05-reroute", TRS05, TRS05_WIN_REROUTE],
    ["TRS05-dry", TRS05, TRS05_WIN_DRY],
    ["TRS06-toy", TRS06, TRS06_WIN_TOY],
    ["TRS06-absorber", TRS06, TRS06_WIN_ABSORBER],
    ["TRS06-hazard", TRS06, TRS06_WIN_HAZARD],
    ["TRS07", TRS07, TRS07_WIN],
  ] as const)("%s: committed winning config accepts", (_name, level, ivs) => {
    const { state, last } = testRun(eng, level, [...ivs]);
    expect(last.evaluation.success).toBe(true);
    expect(last.withinBudget).toBe(true);
    expect(eng.validateAction(level, state, { type: "AcceptResult" }).ok).toBe(true);
    const accepted = eng.applyAction(level, state, { type: "AcceptResult" }).state;
    expect(accepted.solved).toBe(true);
  });

  it("canonical hash is stable across identical sessions", () => {
    const a = testRun(new TrsEngine(), TRS07, TRS07_WIN).state;
    const b = testRun(new TrsEngine(), TRS07, TRS07_WIN).state;
    expect(eng.canonicalHash(a)).toBe(eng.canonicalHash(b));
  });
});
