/**
 * TRS deterministic scene simulator (master TRS-008).
 * Fixed per-beat order:
 *   1. scheduled interventions/actuators
 *   2. logical movement
 *   3. collision/contact and triggered mechanisms
 *   4. bounded deterministic propagation (cycle-safe)
 *   5. observation samples recorded
 *   6. outcome evaluation is a separate pass over the Timeline
 * Rendering never determines contact; integer beats only.
 */
import type { GameEvent } from "../contracts.js";
import type {
  BeatLog, CaseDefinition, EntityRuntime, Intervention,
  RouteDef, RouteWaypoint, Timeline,
} from "./types.js";

export class ContentError extends Error {}

interface SimCtx {
  level: CaseDefinition;
  entities: Map<string, EntityRuntime>;
  events: GameEvent[];
  beats: BeatLog[];
  /** actorId → active route */
  actorRoute: Map<string, RouteDef>;
  /** actorId → current waypoint index (-1 = not started) */
  actorPos: Map<string, number>;
  /** toyId → armed path waypoints */
  toyRoute: Map<string, RouteWaypoint[]>;
}

function field<T>(ctx: SimCtx, id: string, key: string): T | undefined {
  return ctx.entities.get(id)?.fields[key] as T | undefined;
}
function setField(ctx: SimCtx, id: string, key: string, value: unknown): void {
  const e = ctx.entities.get(id);
  if (!e) throw new ContentError(`setField: unknown entity ${id}`);
  e.fields[key] = value;
}
function emit(ctx: SimCtx, beat: number, type: string, entityId?: string, data?: Record<string, unknown>): void {
  ctx.events.push({ beat, type, ...(entityId !== undefined ? { entityId } : {}), ...(data ? { data } : {}) });
}

/** Snapshotted gameplay-relevant fields of every entity (ordered). */
function snapshotFields(ctx: SimCtx): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const id of [...ctx.entities.keys()].sort()) {
    out[id] = { ...ctx.entities.get(id)!.fields };
  }
  return out;
}

function surfaceIsWet(ctx: SimCtx, wp: RouteWaypoint): boolean {
  const s = wp.surface;
  if (!s || s.kind === "dry") return false;
  if (s.kind === "wet") return true;
  if (s.kind === "dynamic" && s.sourceEntityId) {
    return field<boolean>(ctx, s.sourceEntityId, "running") === true;
  }
  return false;
}

export function applyInterventionsToSetup(
  ctx: SimCtx, interventions: Intervention[]
): void {
  for (const iv of interventions) {
    switch (iv.kind) {
      case "RedirectJunction": {
        const junction = ctx.entities.get(iv.junctionId);
        if (!junction) throw new ContentError(`RedirectJunction: no junction ${iv.junctionId}`);
        const route = ctx.level.routes.find(r => r.routeId === iv.toRouteId);
        if (!route) throw new ContentError(`RedirectJunction: no route ${iv.toRouteId}`);
        setField(ctx, iv.junctionId, "routeId", iv.toRouteId);
        // actors whose default route flows through this junction follow it
        for (const actor of ctx.level.actors) {
          if (actor.defaultRouteId !== undefined && actor.defaultRouteId === junction.fields["controlsRouteOf"]) {
            ctx.actorRoute.set(actor.entityId, route);
          }
        }
        break;
      }
      case "SetValve":
        setField(ctx, iv.entityId, "running", iv.running);
        break;
      case "SetMechanismDelay":
        setField(ctx, iv.entityId, "delayBeats", iv.delayBeats);
        break;
      case "ScheduleActivation":
        setField(ctx, iv.entityId, "scheduledBeat", iv.beat);
        break;
      case "RepositionProp":
        setField(ctx, iv.entityId, "locationId", iv.toLocationId);
        break;
      case "PlaceAndArmToy": {
        const socket = ctx.level.sockets.find(s => s.socketId === iv.socketId);
        if (!socket) throw new ContentError(`PlaceAndArmToy: no socket ${iv.socketId}`);
        if (!socket.accepts.includes("PlaceAndArmToy")) {
          throw new ContentError(`PlaceAndArmToy: socket ${iv.socketId} rejects toy`);
        }
        // The toy travels a marked four-step route ending adjacent to the linked bell.
        const steps: RouteWaypoint[] = [];
        for (let i = 1; i <= 4; i++) {
          steps.push({
            locationId: `${socket.locationId}#step${i}`,
            ...(i === 4 && socket.linkedBellId ? { adjacentBellId: socket.linkedBellId } : {}),
          });
        }
        ctx.toyRoute.set(iv.toyId, steps);
        ctx.actorPos.set(iv.toyId, -1);
        // Spawn the toy runtime entity if the level doesn't predeclare one —
        // a socket arms a generic wind-up toy unless content says otherwise.
        if (!ctx.entities.has(iv.toyId)) {
          ctx.entities.set(iv.toyId, { entityId: iv.toyId, fields: { kind: "windUpToy", position: socket.locationId } });
        }
        setField(ctx, iv.toyId, "armed", true);
        setField(ctx, iv.toyId, "socketId", iv.socketId);
        break;
      }
    }
  }
}

/** Run the full timeline deterministically. Interventions mutate setup only. */
export function simulate(level: CaseDefinition, interventions: Intervention[], seed = 0): Timeline {
  const ctx: SimCtx = {
    level,
    entities: new Map(),
    events: [],
    beats: [],
    actorRoute: new Map(),
    actorPos: new Map(),
    toyRoute: new Map(),
  };
  for (const e of level.entities) {
    ctx.entities.set(e.entityId, { entityId: e.entityId, fields: { ...e.initial } });
  }
  for (const actor of level.actors) {
    const r = level.routes.find(rt => rt.routeId === actor.defaultRouteId);
    if (!r) throw new ContentError(`actor ${actor.entityId}: missing route ${actor.defaultRouteId}`);
    ctx.actorRoute.set(actor.entityId, r);
    ctx.actorPos.set(actor.entityId, -1);
  }
  applyInterventionsToSetup(ctx, interventions);

  for (let beat = 1; beat <= level.horizonBeats; beat++) {
    const beatEventsBefore = ctx.events.length;

    // Phase 1: scheduled actuators
    for (const [id, ent] of ctx.entities) {
      const sb = ent.fields["scheduledBeat"];
      if (typeof sb === "number" && sb === beat) {
        emit(ctx, beat, "Activated", id);
        ent.fields["activated"] = true;
      }
      const delay = ent.fields["delayBeats"];
      if (typeof delay === "number" && delay > 0 && ent.fields["armed"] === true) {
        ent.fields["armed"] = false;
        ent.fields["delayedUntil"] = beat + delay;
      }
    }

    // Phase 2: logical movement — actors advance one waypoint/beat from startBeat
    for (const actor of level.actors) {
      if (beat < actor.startBeat) continue;
      const delayedUntil = field<number>(ctx, actor.entityId, "delayedUntil");
      if (typeof delayedUntil === "number" && beat < delayedUntil) continue;
      const route = ctx.actorRoute.get(actor.entityId)!;
      const idx = ctx.actorPos.get(actor.entityId)! + 1;
      if (idx >= route.waypoints.length) continue; // finished
      ctx.actorPos.set(actor.entityId, idx);
      const wp = route.waypoints[idx]!;
      setField(ctx, actor.entityId, "position", wp.locationId);
      emit(ctx, beat, "Moved", actor.entityId, { to: wp.locationId });
      if (wp.crossingId) emit(ctx, beat, "Crossing", actor.entityId, { crossingId: wp.crossingId });
      if (wp.isDestination) emit(ctx, beat, "Arrived", actor.entityId, { at: wp.locationId });
    }
    // Armed toys travel their marked step path
    for (const [toyId, steps] of ctx.toyRoute) {
      const idx = ctx.actorPos.get(toyId)! + 1;
      if (idx >= steps.length) continue;
      ctx.actorPos.set(toyId, idx);
      setField(ctx, toyId, "position", steps[idx]!.locationId);
      emit(ctx, beat, "ToyStep", toyId, { to: steps[idx]!.locationId, step: idx + 1 });
    }

    // Phase 3: contact/collision + triggered mechanisms
    for (const actor of level.actors) {
      const idx = ctx.actorPos.get(actor.entityId)!;
      if (idx < 0) continue;
      const route = ctx.actorRoute.get(actor.entityId)!;
      if (idx >= route.waypoints.length) continue;
      const wp = route.waypoints[idx]!;
      if (wp.skidHazard && surfaceIsWet(ctx, wp)) {
        emit(ctx, beat, "Skid", actor.entityId, { at: wp.locationId });
        if (wp.adjacentBellId) {
          emit(ctx, beat, "BellRing", wp.adjacentBellId, { cause: `${actor.entityId}:skid` });
          const rung = (field<number[]>(ctx, wp.adjacentBellId, "rungAt") ?? []).concat(beat);
          setField(ctx, wp.adjacentBellId, "rungAt", rung);
        }
        if (actor.cargoField) {
          setField(ctx, actor.entityId, actor.cargoField, "ruined");
          emit(ctx, beat, "CargoRuined", actor.entityId);
        }
      }
    }
    for (const [toyId, steps] of ctx.toyRoute) {
      const idx = ctx.actorPos.get(toyId)!;
      if (idx < 0 || idx >= steps.length) continue;
      const wp = steps[idx]!;
      if (wp.adjacentBellId) {
        emit(ctx, beat, "BellRing", wp.adjacentBellId, { cause: `${toyId}:strike` });
        const rung = (field<number[]>(ctx, wp.adjacentBellId, "rungAt") ?? []).concat(beat);
        setField(ctx, wp.adjacentBellId, "rungAt", rung);
        emit(ctx, beat, "ToyStrike", toyId, { bellId: wp.adjacentBellId });
      }
    }

    // Phase 4: bounded deterministic propagation — triggered mechanisms, max 16 hops
    let propagated = 0;
    let changed = true;
    const queued: Array<() => void> = [];
    void queued;
    while (changed && propagated < 16) {
      changed = false;
      propagated++;
      // (mechanism chains are declared via entity 'triggers' in later levels)
    }
    if (propagated >= 16) throw new ContentError("propagation did not terminate (cyclic trigger)");

    ctx.beats.push({
      beat,
      events: ctx.events.slice(beatEventsBefore),
      entityStates: snapshotFields(ctx),
    });
  }

  return { seed, beats: ctx.beats, finalEntityStates: snapshotFields(ctx) };
}
