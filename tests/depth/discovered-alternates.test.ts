/**
 * Discovered alternates (enumeration-audit regression fence).
 *
 * A full-state-space audit (coordination/tools/audit.ts, dataroom/001)
 * enumerated every conflict-free intervention config on all 12 levels and
 * found the levels hold *kept alternates* beyond the designed winning
 * traces — Hazelden-style "monolith" solutions that are interestingly
 * distinct from the intended solve, not cheaper variants of the same trick.
 *
 * This suite asserts each curated alternate still solves its level, so a
 * future content edit must decide deliberately (keep = update expectation;
 * kill = deliberate removal), rather than silently closing a discovery
 * space. The two TRS-05 "proto-monoliths" are asserted to succeed but stay
 * over budget — the budget gate is part of their design.
 */
import { describe, it, expect } from "vitest";
import { LEVELS } from "../../src/content/levels/index.js";
import { SOLUTION_POLICIES } from "../../src/content/level-cards.js";
import { committedCost, replay } from "../lib/winning-traces.js";
import type { CaseDefinition, Intervention } from "../../src/engine/trs/types.js";

const levelDef = (id: string): CaseDefinition =>
  LEVELS.find(l => l.id === id)!.def;

const J = (junctionId: string, toRouteId: string): Intervention =>
  ({ kind: "RedirectJunction", junctionId, toRouteId });
const TOY = (toyId: string, socketId: string): Intervention =>
  ({ kind: "PlaceAndArmToy", toyId, socketId });
const DELAY = (entityId: string, delayBeats: number): Intervention =>
  ({ kind: "SetMechanismDelay", entityId, delayBeats });

interface Alternate {
  readonly level: string;
  readonly name: string;
  readonly ivs: readonly Intervention[];
  /** true → must solve within budget; "monolith" → solve but stay over budget. */
  readonly mode: "solve" | "monolith";
}

const ALTERNATES: readonly Alternate[] = [
  // TRS-03 — route compression: pay +1 delay to make the "too short" express work.
  { level: "TRS-03", name: "delay-compresses-express+toy",
    ivs: [DELAY("bannerFloat", 1), J("floatSwitch", "expressAlley"), TOY("windUpToy", "rainBellSocket")],
    mode: "solve" },
  { level: "TRS-03", name: "delay-compresses-express+marshal-skid",
    ivs: [DELAY("bannerFloat", 1), J("floatSwitch", "expressAlley"), J("marshalSwitch", "hazardSpur")],
    mode: "solve" },
  // TRS-03 — inherited route: marshal re-lets the vacated main street.
  { level: "TRS-03", name: "marshal-inherits-mainStreet",
    ivs: [J("floatSwitch", "arcadeDetour"), J("marshalSwitch", "mainStreet")],
    mode: "solve" },
  // TRS-04 — hybrid: reroute the cart AND ring with the toy (not in card pair).
  { level: "TRS-04", name: "upperCircuit+toy hybrid",
    ivs: [J("cartSwitch", "upperCircuit"), TOY("windUpToy", "belfrySocket")],
    mode: "solve" },
  // TRS-05 — proto-monoliths: both succeed at 4/3; the budget gate must hold.
  { level: "TRS-05", name: "awning-wade near-miss",
    ivs: [J("routeSwitch", "arcadeDetour"), J("awningSwitch", "awningWade")],
    mode: "monolith" },
  { level: "TRS-05", name: "awning-inherits-grandTraverse near-miss",
    ivs: [J("routeSwitch", "arcadeDetour"), J("awningSwitch", "grandTraverse")],
    mode: "monolith" },
  // TRS-08 — third sweep route the card doesn't name.
  { level: "TRS-08", name: "sweeper via vesperRoad",
    ivs: [J("duskSwitch", "cloisterDetour"), J("sweepSwitch", "vesperRoad")],
    mode: "solve" },
  // TRS-09 — pure-junction double-swing (no toy) inside the 16-solution space.
  { level: "TRS-09", name: "page-quay + usher-terrace cross",
    ivs: [J("northSwitch", "northBypass"), J("pageSwitch", "quaySpur"),
          J("southSwitch", "southBypass"), J("usherSwitch", "terraceSpur")],
    mode: "solve" },
  // TRS-10 — spare inherits the vacated procession way (cheapest spare solve).
  { level: "TRS-10", name: "spare-inherits-processionWay",
    ivs: [J("convoySwitch", "processionDetour"), J("spareSwitch", "processionWay")],
    mode: "solve" },
  // TRS-11 — spare as the relay without a toy.
  { level: "TRS-11", name: "spare-relay-no-toy",
    ivs: [J("northSwitch", "northDetour"), J("southSwitch", "southDetour"),
          J("spareSwitch", "relaySpur")],
    mode: "solve" },
  // TRS-12 — second relay carrier (sweeper can hold relaySpur, not just spare).
  { level: "TRS-12", name: "sweeper-as-relay",
    ivs: [J("mayorSwitch", "civicDetour"), J("rocketSwitch", "dawnDetour"),
          J("sweepSwitch", "relaySpur")],
    mode: "solve" },
  { level: "TRS-12", name: "spare-relay variant",
    ivs: [J("mayorSwitch", "civicDetour"), J("rocketSwitch", "dawnDetour"),
          J("spareSwitch", "relaySpur")],
    mode: "solve" },
];

describe("discovered alternates stay reachable", () => {
  for (const alt of ALTERNATES) {
    it(`${alt.level} — ${alt.name}`, () => {
      const level = levelDef(alt.level);
      const { evaluation } = replay(level, alt.ivs);
      expect(evaluation.success).toBe(true);
      const within = committedCost(level, alt.ivs) <= level.interventionBudget;
      if (alt.mode === "solve") {
        expect(within).toBe(true);
      } else {
        // proto-monolith: reachable but the budget gate keeps it sealed
        expect(within).toBe(false);
      }
    });
  }
});

describe("solution policy declared per level (§3.6)", () => {
  it("every level has a declared policy", () => {
    for (const l of LEVELS) expect(SOLUTION_POLICIES[l.id]).toBeDefined();
  });
  it("unique-policy levels have exactly the designed minimal solve(s)", () => {
    // enumeration: TRS-01/02/07 have a single irreducible solution each
    for (const id of ["TRS-01", "TRS-02", "TRS-07"]) {
      expect(SOLUTION_POLICIES[id]).toBe("unique");
    }
  });
});
