/**
 * Depth proofs (gate G3): every level's designed wrong approaches fail
 * for the RIGHT reason — a targeted predicate failure, not a generic
 * rejection — and every winning trace is load-bearing: remove any one
 * committed intervention and the run fails.
 */
import { describe, it, expect } from "vitest";
import { simulate } from "../../src/engine/trs/sim.js";
import { evaluateRun } from "../../src/engine/trs/evaluate.js";
import { LEVELS } from "../../src/content/levels/index.js";
import {
  WINNING_TRACES, committedRun, replay,
} from "../lib/winning-traces.js";
import { TrsEngine } from "../../src/engine/trs/engine.js";
import type { CaseDefinition, Intervention } from "../../src/engine/trs/types.js";

const levelDef = (id: string): CaseDefinition =>
  LEVELS.find(l => l.id === id)!.def;

const J = (junctionId: string, toRouteId: string): Intervention =>
  ({ kind: "RedirectJunction", junctionId, toRouteId });
const TOY = (toyId: string, socketId: string): Intervention =>
  ({ kind: "PlaceAndArmToy", toyId, socketId });
const VALVE = (entityId: string, running: boolean): Intervention =>
  ({ kind: "SetValve", entityId, running });
const DELAY = (entityId: string, delayBeats: number): Intervention =>
  ({ kind: "SetMechanismDelay", entityId, delayBeats });
const REPOS = (entityId: string, toLocationId: string): Intervention =>
  ({ kind: "RepositionProp", entityId, toLocationId });

/** A designed wrong approach + the exact predicate(s) it must fail. */
interface Trap {
  readonly name: string;
  readonly ivs: readonly Intervention[];
  /** Observation/outcome ids that MUST be false. */
  readonly fails: readonly string[];
  /** Predicate ids that MUST still be true (rules out generic failure). */
  readonly stillPasses?: readonly string[];
}

const TRAPS: Record<string, readonly Trap[]> = {
  "TRS-01": [
    { name: "fountain-off breaks the bell record AND the fountain fact",
      ivs: [VALVE("fountain", false)],
      fails: ["OBS-BELL", "OBS-FOUNTAIN"],
      stillPasses: ["OBS-ARCH", "OUT-CAKE"] },
    { name: "dry lane alone leaves the bell silent",
      ivs: [J("junction", "dryLane")],
      fails: ["OBS-BELL"], stillPasses: ["OBS-ARCH", "OUT-CAKE"] },
  ],
  "TRS-02": [
    { name: "blanket delay moves the earlier crossing AND the strike",
      ivs: [DELAY("lanternCart", 1)],
      fails: ["OBS-ARCH", "OBS-BELL"] },
    { name: "redirect alone drops the bell",
      ivs: [J("routeSwitch", "serviceAlley")],
      fails: ["OBS-BELL"], stillPasses: ["OBS-ARCH", "OUT-LANTERN"] },
  ],
  "TRS-03": [
    { name: "express alley is faster but misses the gate",
      ivs: [J("floatSwitch", "expressAlley")],
      fails: ["OBS-GATE"] },
    { name: "detour alone leaves the rain bell silent",
      ivs: [J("floatSwitch", "arcadeDetour")],
      fails: ["OBS-BELL"], stillPasses: ["OBS-GATE", "OUT-BANNER"] },
  ],
  "TRS-04": [
    { name: "supply skid alone: chime recorded, crystal still crushed",
      ivs: [J("supplySwitch", "grateSpur")],
      fails: ["OUT-CRYSTAL"], stillPasses: ["OBS-CHIME"] },
    { name: "toy only: signal replaced, counterweight still skids",
      ivs: [TOY("windUpToy", "belfrySocket")],
      fails: ["OUT-CRYSTAL"], stillPasses: ["OBS-CHIME"] },
  ],
  "TRS-05": [
    { name: "covering the camera changes nothing sealed",
      ivs: [REPOS("canvasScreen", "northPorch")],
      fails: ["OUT-PRISM"], stillPasses: ["OBS-N-ARCH", "OBS-S-VIS"] },
    { name: "back lane is dry but off the south camera",
      ivs: [J("routeSwitch", "backLane"), TOY("windUpToy", "squareSocket")],
      fails: ["OBS-S-VIS"], stillPasses: ["OBS-N-VIS", "OBS-S-BELL", "OUT-PRISM"] },
  ],
  "TRS-06": [
    { name: "porter alone double-rings the exhibit bell",
      ivs: [J("porterSwitch", "marbleSpur")],
      fails: ["OBS-RING"], stillPasses: ["OBS-ARCH", "OBS-PORTER"] },
    { name: "detour alone drops the one recorded ring",
      ivs: [J("exhibitSwitch", "cloisterDetour")],
      fails: ["OBS-RING"], stillPasses: ["OBS-STAIR", "OUT-ORB"] },
  ],
  "TRS-07": [
    { name: "the label edit fools nobody — positions are what matter",
      ivs: [REPOS("parcelDecal", "townHallSteps")],
      fails: ["OUT-MAYOR", "OUT-DOCK"],
      stillPasses: ["OBS-SORTING", "OBS-LOCK", "OBS-POST-PLATFORM", "OBS-BARGE-PLATFORM"] },
    { name: "express fork skips the recorded handoff",
      ivs: [J("postSwitch", "postExpress"), J("bargeSwitch", "lockRunHarbor")],
      fails: ["OBS-POST-PLATFORM"], stillPasses: ["OUT-MAYOR", "OUT-DOCK"] },
  ],
  "TRS-08": [
    { name: "the toy re-rings straight through the sealed quiet",
      ivs: [J("duskSwitch", "cloisterDetour"), TOY("windUpToy", "vesperSocket")],
      fails: ["OBS-QUIET"],
      stillPasses: ["OBS-VESPER", "OBS-CLOISTER", "OBS-GATE", "OUT-CANDLES"] },
    { name: "closing the pump silences the permitted ring",
      ivs: [VALVE("canalPump", false)],
      fails: ["OBS-VESPER"], stillPasses: ["OBS-QUIET", "OUT-CANDLES"] },
  ],
  "TRS-09": [
    { name: "quay-late spur: the right ring one beat late",
      ivs: [J("northSwitch", "northBypass"), J("southSwitch", "southBypass"),
            TOY("windUpToy", "northSocket"), J("usherSwitch", "quayLate")],
      fails: ["OBS-BELL-S"], stillPasses: ["OBS-BELL-N", "OUT-VASE-N", "OUT-VASE-S"] },
    { name: "one toy cannot cover both bells",
      ivs: [J("northSwitch", "northBypass"), J("southSwitch", "southBypass"),
            TOY("windUpToy", "northSocket")],
      fails: ["OBS-BELL-S"], stillPasses: ["OBS-BELL-N"] },
  ],
  "TRS-10": [
    { name: "moving the sweeper orphans the harbor ring",
      ivs: [J("convoySwitch", "processionDetour"), J("sweepSwitch", "towerSpur")],
      fails: ["OBS-HARBOR"],
      stillPasses: ["OBS-TOWER", "OBS-BRIDGE", "OUT-GIFT-A", "OUT-GIFT-B"] },
    { name: "detour alone drops the tower strike",
      ivs: [J("convoySwitch", "processionDetour")],
      fails: ["OBS-TOWER"], stillPasses: ["OBS-HARBOR"] },
  ],
  "TRS-11": [
    { name: "each half claiming the one spare cart is a conflict",
      ivs: [J("northSwitch", "northDetour"), J("southSwitch", "southDetour"),
            J("spareSwitch", "terraceSpur"), J("spareSwitch", "quaySpur")],
      fails: ["OBS-BELL-N"],
      stillPasses: ["OBS-BELL-S", "OUT-VASE-N", "OUT-VASE-S"] },
    { name: "arcade cut contaminates the south hall's count",
      ivs: [J("northSwitch", "arcadeCut"), J("southSwitch", "southDetour"),
            J("spareSwitch", "quaySpur"), TOY("windUpToy", "gallerySocket")],
      fails: ["OBS-BELL-S"], stillPasses: ["OBS-BELL-N", "OBS-ARCH-S"] },
  ],
  "TRS-12": [
    { name: "the finch at the tower socket rings through the silence",
      ivs: [J("rocketSwitch", "dawnDetour"), J("mayorSwitch", "civicDetour"),
            TOY("windUpFinch", "towerSocket"), J("spareSwitch", "bankSpur")],
      fails: ["OBS-QUIET"],
      stillPasses: ["OBS-TOWER", "OBS-HARBOR", "OBS-GREEN", "OUT-POWDER", "OUT-PROCLAMATION"] },
    { name: "the relay without the detours still buries the town",
      ivs: [J("spareSwitch", "relaySpur")],
      fails: ["OUT-POWDER", "OUT-PROCLAMATION"],
      stillPasses: ["OBS-BRIDGE", "OBS-TOWER", "OBS-HARBOR", "OBS-QUIET", "OBS-GREEN"] },
  ],
};

describe("depth: every designed wrong approach fails for the RIGHT reason", () => {
  for (const [id, traps] of Object.entries(TRAPS)) {
    const level = levelDef(id);
    for (const trap of traps) {
      it(`${id} — ${trap.name}`, () => {
        const t = simulate(level, [...trap.ivs]);
        const e = evaluateRun(t, level.sealedObservations, level.desiredOutcomes);
        expect(e.success).toBe(false);
        for (const pid of trap.fails) {
          const inObs = e.observations.find(o => o.predicateId === pid);
          const inOut = e.outcomes.find(o => o.predicateId === pid);
          const passed = inObs?.passed ?? inOut?.passed;
          expect(passed, `${pid} should fail`).toBe(false);
        }
        for (const pid of trap.stillPasses ?? []) {
          const inObs = e.observations.find(o => o.predicateId === pid);
          const inOut = e.outcomes.find(o => o.predicateId === pid);
          const passed = inObs?.passed ?? inOut?.passed;
          expect(passed, `${pid} should still pass`).toBe(true);
        }
      });
    }
  }
});

describe("depth: every intervention in every winning trace is load-bearing", () => {
  const eng = new TrsEngine();
  for (const [id, traces] of Object.entries(WINNING_TRACES)) {
    const level = levelDef(id);
    for (const trace of traces) {
      for (let drop = 0; drop < trace.interventions.length; drop++) {
        const partial = trace.interventions.filter((_, i) => i !== drop);
        it(`${id}/${trace.name}: removing intervention ${drop + 1}/${trace.interventions.length} breaks the run`, () => {
          const { last } = committedRun(eng, level, [...partial]);
          // Either the eval fails or the missing piece itself was needed
          // for the record — success must NOT survive a subtraction.
          const evalCheck = replay(level, partial);
          expect(
            last.evaluation.success && evalCheck.evaluation.success,
          ).toBe(false);
        });
      }
    }
  }
});
