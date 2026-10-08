/**
 * winning-traces.ts — the single registry of verified winning repairs for
 * all 12 TRS cases, shared by the campaign-completeness suite, the depth
 * proofs, and the performance benchmark. Every trace listed here is
 * asserted to actually solve its level — this file is the witness table.
 */
import { simulate } from "../../src/engine/trs/sim.js";
import { evaluateRun } from "../../src/engine/trs/evaluate.js";
import { TrsEngine } from "../../src/engine/trs/engine.js";
import type { CaseDefinition, Intervention, Timeline } from "../../src/engine/trs/types.js";

export interface WinningTrace {
  /** Strategy label — matches the card's strategySignatures. */
  readonly name: string;
  readonly interventions: readonly Intervention[];
}

const J = (junctionId: string, toRouteId: string): Intervention => ({
  kind: "RedirectJunction", junctionId, toRouteId,
});
const TOY = (toyId: string, socketId: string): Intervention => ({
  kind: "PlaceAndArmToy", toyId, socketId,
});
const VALVE = (entityId: string, running: boolean): Intervention => ({
  kind: "SetValve", entityId, running,
});
const DELAY = (entityId: string, delayBeats: number): Intervention => ({
  kind: "SetMechanismDelay", entityId, delayBeats,
});

export const WINNING_TRACES: Record<string, readonly WinningTrace[]> = {
  "TRS-01": [
    { name: "dry-lane+toy", interventions: [J("junction", "dryLane"), TOY("windUpToy", "bellSocket")] },
  ],
  "TRS-02": [
    { name: "dry-alley+toy", interventions: [J("routeSwitch", "serviceAlley"), TOY("windUpToy", "bellSocket")] },
  ],
  "TRS-03": [
    { name: "detour+toy", interventions: [J("floatSwitch", "arcadeDetour"), TOY("windUpToy", "rainBellSocket")] },
    { name: "detour+marshal-skid", interventions: [J("floatSwitch", "arcadeDetour"), J("marshalSwitch", "hazardSpur")] },
  ],
  "TRS-04": [
    { name: "keep-dry+toy", interventions: [VALVE("cistern", false), TOY("windUpToy", "belfrySocket")] },
    { name: "split-viaduct+supply-skid", interventions: [J("cartSwitch", "upperCircuit"), J("supplySwitch", "grateSpur")] },
  ],
  "TRS-05": [
    { name: "reroute+toy", interventions: [J("routeSwitch", "arcadeDetour"), TOY("windUpToy", "squareSocket")] },
    { name: "dry-in-place+toy", interventions: [VALVE("plazaFountain", false), TOY("windUpToy", "squareSocket")] },
  ],
  "TRS-06": [
    { name: "cloister+toy", interventions: [J("exhibitSwitch", "cloisterDetour"), TOY("windUpWren", "gallerySocket")] },
    { name: "cloister+porter-skid", interventions: [J("exhibitSwitch", "cloisterDetour"), J("porterSwitch", "marbleSpur")] },
    { name: "dry-hazard+toy", interventions: [VALVE("sprinklerHouse", false), TOY("windUpWren", "gallerySocket")] },
  ],
  "TRS-07": [
    { name: "civic-post+harbor-barge", interventions: [J("postSwitch", "postRoadCivic"), J("bargeSwitch", "lockRunHarbor")] },
  ],
  "TRS-08": [
    { name: "reroute-sweeper", interventions: [J("duskSwitch", "cloisterDetour"), J("sweepSwitch", "vesperSpur")] },
    { name: "retime-sweeper", interventions: [J("duskSwitch", "cloisterDetour"), DELAY("sweepCart", 1)] },
  ],
  "TRS-09": [
    { name: "toy-north+usher-skid", interventions: [
      J("northSwitch", "northBypass"), J("southSwitch", "southBypass"),
      TOY("windUpToy", "northSocket"), J("usherSwitch", "quaySpur"),
    ] },
    { name: "toy-south+page-skid", interventions: [
      J("northSwitch", "northBypass"), J("southSwitch", "southBypass"),
      TOY("windUpToy", "southSocket"), J("pageSwitch", "terraceSpur"),
    ] },
    { name: "two-skids-no-toy", interventions: [
      J("northSwitch", "northBypass"), J("southSwitch", "southBypass"),
      J("pageSwitch", "terraceSpur"), J("usherSwitch", "quaySpur"),
    ] },
  ],
  "TRS-10": [
    { name: "best-reuse-consequence", interventions: [J("convoySwitch", "processionDetour"), J("spareSwitch", "towerSpur")] },
    { name: "spawn-the-toy", interventions: [J("convoySwitch", "processionDetour"), TOY("windUpBird", "towerSocket")] },
    { name: "reshuffle-both-carts", interventions: [
      J("convoySwitch", "processionDetour"), J("sweepSwitch", "towerSpur"), J("spareSwitch", "quayShift"),
    ] },
  ],
  "TRS-11": [
    { name: "relay-one-cart-two-skids", interventions: [
      J("northSwitch", "northDetour"), J("southSwitch", "southDetour"), J("spareSwitch", "relaySpur"),
    ] },
    { name: "split-toy-north-skid-south", interventions: [
      J("northSwitch", "northDetour"), J("southSwitch", "southDetour"),
      TOY("windUpToy", "gallerySocket"), J("spareSwitch", "quaySpur"),
    ] },
  ],
  "TRS-12": [
    { name: "relay-single-borrowed-road", interventions: [
      J("rocketSwitch", "dawnDetour"), J("mayorSwitch", "civicDetour"), J("spareSwitch", "relaySpur"),
    ] },
    { name: "toy-harbor-skid-tower", interventions: [
      J("rocketSwitch", "dawnDetour"), J("mayorSwitch", "civicDetour"),
      J("sweepSwitch", "plazaSpur"), TOY("windUpFinch", "harborSocket"),
    ] },
    { name: "two-crew-split", interventions: [
      J("rocketSwitch", "dawnDetour"), J("mayorSwitch", "civicDetour"),
      J("sweepSwitch", "plazaSpur"), J("spareSwitch", "bankSpur"),
    ] },
  ],
};

/** Committed-config cost as the session engine computes it. */
export function committedCost(level: CaseDefinition, ivs: readonly Intervention[]): number {
  return ivs.reduce((sum, iv) => sum + (level.interventionCosts[iv.kind] ?? 1), 0);
}

/** Simulate + evaluate — the fast path used by benchmarks and proofs. */
export function replay(level: CaseDefinition, ivs: readonly Intervention[]) {
  const timeline = simulate(level, [...ivs]);
  return { timeline, evaluation: evaluateRun(timeline, level.sealedObservations, level.desiredOutcomes) };
}

/** Full session-engine path: commit each intervention, TestRun. */
export function committedRun(eng: TrsEngine, level: CaseDefinition, ivs: readonly Intervention[]) {
  let s = eng.createInitialState(level);
  ivs.forEach((iv, i) => {
    s = eng.applyAction(level, s, { type: "SetIntervention", slotKey: `s${i}`, intervention: iv }).state;
  });
  s = eng.applyAction(level, s, { type: "TestRun" }).state;
  return { state: s, last: s.runs[s.runs.length - 1]! };
}

export function obsResult(e: ReturnType<typeof evaluateRun>, id: string) {
  return e.observations.find(o => o.predicateId === id)!.passed;
}
export function outResult(e: ReturnType<typeof evaluateRun>, id: string) {
  return e.outcomes.find(o => o.predicateId === id)!.passed;
}
export function positionAt(t: Timeline, entityId: string, beat: number) {
  return t.beats.find(b => b.beat === beat)?.entityStates[entityId]?.["position"];
}
export function bellRingBeats(t: Timeline, bellId: string) {
  return t.beats.flatMap(b => b.events)
    .filter(ev => ev.type === "BellRing" && ev.entityId === bellId)
    .map(ev => ev.beat);
}
