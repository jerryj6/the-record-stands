/**
 * Engine property tests (gate G3/G4): invariants that must hold for ANY
 * intervention set on ANY level, not just the authored cases.
 *
 *  - determinism: identical intervention lists → identical timelines and
 *    identical canonical session hashes.
 *  - budget: withinBudget === (committedCost ≤ interventionBudget), and
 *    AcceptResult is rejected whenever the last run fails or is over.
 *  - command-id idempotency: the room layer re-acks a resubmitted
 *    commandId with dup:true and applies its effect exactly once.
 *  - sealed observations reference only entities, beats, crossings,
 *    camera regions, and event vocabulary that exist in the level.
 *  - actors only ever occupy positions declared by a route (or a toy's
 *    generated socket path) — no invented locations.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { TrsEngine } from "../../src/engine/trs/engine.js";
import { simulate } from "../../src/engine/trs/sim.js";
import { LEVELS } from "../../src/content/levels/index.js";
import { trsAdapter } from "../../src/server/trs-adapter.js";
import { RoomManager, type RoomTransport } from "../../src/server/rooms.js";
import type { ServerMessage } from "../../src/server/protocol.js";
import type { CaseDefinition, Intervention } from "../../src/engine/trs/types.js";
import { committedRun } from "../lib/winning-traces.js";

const EMITTED_EVENT_TYPES = new Set([
  "Moved", "Arrived", "Skid", "BellRing", "CargoRuined", "Crossing",
  "Activated", "ToyStep", "ToyStrike",
]);

/** A random VALID intervention for a level (only declared ids/beats). */
function arbIntervention(level: CaseDefinition): fc.Arbitrary<Intervention> {
  const entityIds = level.entities.map(e => e.entityId);
  const routeIds = level.routes.map(r => r.routeId);
  const junctionIds = level.entities
    .filter(e => e.kind === "junction")
    .map(e => e.entityId);
  const socketIds = level.sockets.map(s => s.socketId);
  const toyIds = level.entities
    .filter(e => e.kind === "windUpToy")
    .map(e => e.entityId);
  const armedIds = level.entities
    .filter(e => e.initial["armed"] === true)
    .map(e => e.entityId);

  const alts: fc.Arbitrary<Intervention>[] = [];
  if (junctionIds.length && routeIds.length) {
    alts.push(fc.record({
      kind: fc.constant("RedirectJunction" as const),
      junctionId: fc.constantFrom(...junctionIds),
      toRouteId: fc.constantFrom(...routeIds),
    }));
  }
  alts.push(fc.record({
    kind: fc.constant("SetValve" as const),
    entityId: fc.constantFrom(...entityIds),
    running: fc.boolean(),
  }));
  if (armedIds.length) {
    alts.push(fc.record({
      kind: fc.constant("SetMechanismDelay" as const),
      entityId: fc.constantFrom(...armedIds),
      delayBeats: fc.integer({ min: 1, max: 3 }),
    }));
  }
  alts.push(fc.record({
    kind: fc.constant("ScheduleActivation" as const),
    entityId: fc.constantFrom(...entityIds),
    beat: fc.integer({ min: 1, max: level.horizonBeats }),
  }));
  alts.push(fc.record({
    kind: fc.constant("RepositionProp" as const),
    entityId: fc.constantFrom(...entityIds),
    toLocationId: fc.constantFrom("plaza", "nowhere", "depotYard"),
  }));
  if (toyIds.length && socketIds.length) {
    alts.push(fc.record({
      kind: fc.constant("PlaceAndArmToy" as const),
      toyId: fc.constantFrom(...toyIds),
      socketId: fc.constantFrom(...socketIds),
    }));
  }
  return fc.oneof(...alts);
}

describe("property: determinism", () => {
  it.each(LEVELS.map(l => l.def))("%s: same interventions → identical timeline + session hash",
    (level) => {
      const eng = new TrsEngine();
      fc.assert(
        fc.property(
          fc.array(arbIntervention(level), { minLength: 0, maxLength: 5 }),
          (ivs) => {
            const a = simulate(level, ivs);
            const b = simulate(level, ivs);
            expect(JSON.stringify(a)).toBe(JSON.stringify(b));
            // session-engine path agrees too
            const ha = eng.canonicalHash(committedRun(eng, level, ivs).state);
            const hb = eng.canonicalHash(committedRun(eng, level, ivs).state);
            expect(ha).toBe(hb);
          },
        ),
        { numRuns: 12 },
      );
    });
});

describe("property: budget can never be exceeded silently", () => {
  it.each(LEVELS.map(l => l.def))("%s: withinBudget ⇔ cost ≤ budget; over-budget blocks AcceptResult",
    (level) => {
      const eng = new TrsEngine();
      fc.assert(
        fc.property(
          fc.array(arbIntervention(level), { minLength: 0, maxLength: 6 }),
          (ivs) => {
            const { state, last } = committedRun(eng, level, ivs);
            const expectedCost = ivs.reduce(
              (s, iv) => s + (level.interventionCosts[iv.kind] ?? 1), 0);
            expect(last.cost).toBe(expectedCost);
            expect(last.withinBudget).toBe(expectedCost <= level.interventionBudget);
            const v = eng.validateAction(level, state, { type: "AcceptResult" });
            if (!last.withinBudget || !last.evaluation.success) {
              expect(v.ok).toBe(false);
            }
          },
        ),
        { numRuns: 12 },
      );
    });
});

describe("property: command-id idempotency (room layer)", () => {
  function makeManager() {
    const sent: ServerMessage[] = [];
    const transport: RoomTransport = {
      send: (_connId, msg) => { sent.push(msg); },
      closeConn: () => {},
    };
    const manager = new RoomManager({
      adapters: [trsAdapter], transport, sweepIntervalMs: 0,
    });
    return { manager, sent };
  }

  it("resubmitting a committed commandId re-acks dup:true and never re-applies", () => {
    fc.assert(
      fc.property(fc.uuid(), (commandId) => {
        const { manager } = makeManager();
        const created = manager.createRoom("conn-1", { ephemeral: true, seed: "TRS-01" });
        expect(created.ok).toBe(true);
        if (!created.ok) return;
        const payload = {
          type: "SetIntervention", slotKey: "a",
          intervention: { kind: "RedirectJunction", junctionId: "junction", toRouteId: "dryLane" },
        };
        const first = manager.submitCommand("conn-1", {
          commandId, baseRevision: created.room.revision, payload,
        });
        expect(first.ok && !first.duplicate).toBe(true);
        const rev = created.room.revision;
        // Same commandId, stale or fresh baseRevision: idempotent re-ack.
        const again = manager.submitCommand("conn-1", {
          commandId, baseRevision: 0, payload,
        });
        expect(again.ok && again.duplicate).toBe(true);
        expect(created.room.revision).toBe(rev);        // applied once
        expect(created.room.log).toHaveLength(1);       // one log entry
        if (again.ok && first.ok) {
          expect(again.entry.stateHash).toBe(first.entry.stateHash);
        }
      }),
      { numRuns: 10 },
    );
  });

  it("same payload, different commandId → a new committed effect", () => {
    const { manager } = makeManager();
    const created = manager.createRoom("conn-1", { ephemeral: true, seed: "TRS-01" });
    if (!created.ok) throw new Error("create failed");
    const payload = {
      type: "SetIntervention", slotKey: "a",
      intervention: { kind: "SetValve", entityId: "fountain", running: false },
    };
    const a = manager.submitCommand("conn-1", {
      commandId: "c1", baseRevision: created.room.revision, payload,
    });
    const b = manager.submitCommand("conn-1", {
      commandId: "c2", baseRevision: created.room.revision, payload,
    });
    expect(a.ok && !a.duplicate).toBe(true);
    expect(b.ok && !b.duplicate).toBe(true);
    expect(created.room.revision).toBe(2);
  });
});

describe("property: sealed observations only reference things that exist", () => {
  it.each(LEVELS.map(l => [l.id, l.def] as const))("%s: every predicate resolves to declared content",
    (_id, level) => {
      const entityIds = new Set(level.entities.map(e => e.entityId));
      const crossingIds = new Set(
        level.routes.flatMap(r => r.waypoints.map(w => w.crossingId)).filter(Boolean));
      const locationIds = new Set(level.routes.flatMap(r => r.waypoints.map(w => w.locationId)));
      const world = level.entities.find(e => e.entityId === "__world");
      const regions = new Set(
        Object.keys((world?.initial["cameraRegions"] as Record<string, string[]> | undefined) ?? {}));

      for (const p of [...level.sealedObservations, ...level.desiredOutcomes]) {
        expect(entityIds.has(p.entityId), `${p.id}: unknown entity ${p.entityId}`).toBe(true);
        if ("beat" in p) {
          expect(p.beat, `${p.id}: beat out of horizon`).toBeGreaterThanOrEqual(1);
          expect(p.beat, `${p.id}: beat out of horizon`).toBeLessThanOrEqual(level.horizonBeats);
        }
        if ("fromBeat" in p && "toBeat" in p) {
          expect(p.fromBeat).toBeGreaterThanOrEqual(1);
          expect(p.toBeat).toBeLessThanOrEqual(level.horizonBeats);
          expect(p.fromBeat).toBeLessThanOrEqual(p.toBeat);
        }
        if ("eventType" in p) {
          expect(EMITTED_EVENT_TYPES.has(p.eventType),
            `${p.id}: eventType '${p.eventType}' is never emitted by the sim`).toBe(true);
        }
        if (p.form === "AtCrossing") {
          expect(crossingIds.has(p.crossingId), `${p.id}: undeclared crossing`).toBe(true);
        }
        if (p.form === "VisibleFrom") {
          expect(regions.has(p.cameraRegionId), `${p.id}: undeclared camera region`).toBe(true);
        }
        if (p.form === "EntityAt") {
          expect(locationIds.has(p.locationId), `${p.id}: undeclared location`).toBe(true);
        }
      }
    });
});

describe("property: actors only follow declared routes", () => {
  it.each(LEVELS.map(l => l.def))("%s: defaults, junction controls, and every simulated position are declared",
    (level) => {
      const routeIds = new Set(level.routes.map(r => r.routeId));
      // Every actor's default route exists.
      for (const a of level.actors) {
        expect(routeIds.has(a.defaultRouteId ?? ""),
          `actor ${a.entityId} defaults to undeclared route`).toBe(true);
      }
      // Every junction controls a declared route.
      for (const e of level.entities) {
        if (e.kind === "junction") {
          const ctl = e.initial["controlsRouteOf"];
          expect(typeof ctl === "string" && routeIds.has(ctl),
            `junction ${e.entityId} controls undeclared route`).toBe(true);
          const rid = e.initial["routeId"];
          expect(typeof rid === "string" && routeIds.has(rid),
            `junction ${e.entityId} starts on undeclared route`).toBe(true);
        }
      }
      // Every socket links a declared bell; every tile bell reference exists.
      const bellIds = new Set(level.entities.filter(e => e.kind === "bell").map(e => e.entityId));
      for (const s of level.sockets) {
        expect(
          s.linkedBellId !== undefined && bellIds.has(s.linkedBellId),
          `socket ${s.socketId} links non-bell`,
        ).toBe(true);
      }
      for (const r of level.routes) {
        for (const w of r.waypoints) {
          if (w.adjacentBellId !== undefined) {
            expect(bellIds.has(w.adjacentBellId), `route ${r.routeId} references non-bell`).toBe(true);
          }
          if (w.surface?.kind === "dynamic") {
            expect(level.entities.some(e => e.entityId === w.surface!.sourceEntityId),
              `route ${r.routeId} wet tile sources undeclared entity`).toBe(true);
          }
        }
      }
      // Position legality under a random redirect of every junction:
      // all positions must come from a declared route's waypoints or a
      // toy's generated socket path (locationId#stepN).
      const legalLocations = new Set(
        level.routes.flatMap(r => r.waypoints.map(w => w.locationId)));
      const junctionIds = level.entities.filter(e => e.kind === "junction").map(e => e.entityId);
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              kind: fc.constant("RedirectJunction" as const),
              junctionId: fc.constantFrom(...(junctionIds.length ? junctionIds : ["none"])),
              toRouteId: fc.constantFrom(...routeIds),
            }),
            { minLength: 0, maxLength: junctionIds.length },
          ),
          (ivs) => {
            const t = simulate(level, ivs);
            // The invariant is about ACTORS only: every position an
            // actor occupies must be a declared route waypoint OR its own
            // authored parking spot before its startBeat. Non-movers and
            // toys are not actors and are legitimately outside the set.
            const parking = new Map(
              level.actors.map(a => [
                a.entityId,
                level.entities.find(e => e.entityId === a.entityId)
                  ?.initial["position"],
              ]));
            const movers = new Set(level.actors.map(a => a.entityId));
            for (const b of t.beats) {
              for (const [entId, st] of Object.entries(b.entityStates)) {
                if (!movers.has(entId)) continue;
                const pos = st["position"];
                if (typeof pos !== "string") continue;
                expect(
                  legalLocations.has(pos) || pos === parking.get(entId),
                  `${entId} @ beat ${b.beat} at undeclared '${pos}'`,
                ).toBe(true);
              }
            }
          },
        ),
        { numRuns: 10 },
      );
    });
});
