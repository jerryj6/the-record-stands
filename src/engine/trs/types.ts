/**
 * The Record Stands — game-specific contract types (master TRS-B, TRS-C).
 * A "case" is a level: entities, routes, mechanisms, sealed observations,
 * desired outcomes, and an intervention budget.
 */
import type { Beat, EntityId } from "../contracts.js";

// ---- Routes & movement ----------------------------------------------------

/** One stop on a route; actors advance one waypoint per beat unless scheduled otherwise. */
export interface RouteWaypoint {
  locationId: string;
  /** surface condition source: 'fountain' → wet when that entity is running */
  surface?: { kind: "dry" | "wet" | "dynamic"; sourceEntityId?: EntityId };
  /** skid hazard: a moving actor skids here if the surface is wet */
  skidHazard?: boolean;
  /** an identified bell adjacent to this waypoint — a skid/strike here rings it */
  adjacentBellId?: EntityId;
  /** crossing marker for EntityAt/AtCrossing observations (arch, gate, …) */
  crossingId?: string;
  /** arrival at this waypoint triggers delivery evaluation */
  isDestination?: boolean;
}

export interface RouteDef {
  routeId: string;
  /** waypoints indexed by beat offset: waypoint[i] reached at startBeat + i */
  waypoints: RouteWaypoint[];
  /** presentation label for equal-duration checks & UI */
  label: string;
}

// ---- Entities -------------------------------------------------------------

export type EntityKind =
  | "trolley" | "fountain" | "bell" | "arch" | "junction" | "windUpToy"
  | "fixture" | "cargo" | "destination" | "generic";

export interface EntityDef {
  entityId: EntityId;
  kind: EntityKind;
  /** named noun for observation/UI identity (stable, never renamed for semantics) */
  name: string;
  /** initial fields (vary by kind); engine reads documented keys only */
  initial: Record<string, unknown>;
}

// ---- Interventions (TRS-007) ----------------------------------------------

export type Intervention =
  | { kind: "RedirectJunction"; junctionId: EntityId; toRouteId: string }
  | { kind: "SetValve"; entityId: EntityId; running: boolean }
  | { kind: "SetMechanismDelay"; entityId: EntityId; delayBeats: number }
  | { kind: "ScheduleActivation"; entityId: EntityId; beat: Beat }
  | { kind: "RepositionProp"; entityId: EntityId; toLocationId: string }
  | { kind: "PlaceAndArmToy"; toyId: EntityId; socketId: string };

export interface InterventionSocket {
  socketId: string;
  /** which intervention kinds this socket accepts */
  accepts: Intervention["kind"][];
  /** bell (or mechanism) this socket's toy will strike, if applicable */
  linkedBellId?: EntityId;
  locationId: string;
}

export interface InterventionCost {
  /** committed-configuration cost of this intervention kind (re-editing is free) */
  cost: number;
}

// ---- Observations & outcomes (TRS-002/003) ---------------------------------

export type Observation =
  | { id: string; form: "EventOccurred"; entityId: EntityId; eventType: string; beat: Beat }
  | { id: string; form: "EntityAt"; entityId: EntityId; locationId: string; beat: Beat }
  | { id: string; form: "AtCrossing"; entityId: EntityId; crossingId: string; beat: Beat }
  | { id: string; form: "StateEquals"; entityId: EntityId; field: string; value: unknown; beat: Beat }
  | { id: string; form: "EventAbsent"; entityId: EntityId; eventType: string; fromBeat: Beat; toBeat: Beat }
  | { id: string; form: "EventCount"; entityId: EntityId; eventType: string; fromBeat: Beat; toBeat: Beat; count: number }
  | { id: string; form: "VisibleFrom"; entityId: EntityId; cameraRegionId: string; beat: Beat };

export type OutcomePredicate =
  | { id: string; form: "EntityStateAtEnd"; entityId: EntityId; field: string; value: unknown }
  | { id: string; form: "EventOccurredByEnd"; entityId: EntityId; eventType: string }
  | { id: string; form: "EventNever"; entityId: EntityId; eventType: string };

// ---- Case definition --------------------------------------------------------

export interface CaseDefinition {
  levelId: string;
  title: string;
  chapter: number;
  horizonBeats: Beat;
  entities: EntityDef[];
  routes: RouteDef[];
  sockets: InterventionSocket[];
  /** actorId → initial routeId / schedule */
  actors: ActorDef[];
  interventionCosts: Partial<Record<Intervention["kind"], number>>;
  interventionBudget: number;
  sealedObservations: Observation[];
  desiredOutcomes: OutcomePredicate[];
  hints: [string, string, string];
  /** human-readable causal explanation for review (not shown as a hint) */
  designNote: string;
}

export interface ActorDef {
  entityId: EntityId;
  kind: "trolley" | "toy" | "carrier" | "generic";
  startBeat: Beat;
  /** default route when no intervention redirects it */
  defaultRouteId: string;
  /** cargo field, e.g. cake: 'intact'|'ruined' */
  cargoField?: string;
  /** route for toys: fixed step path expressed as waypoints with adjacentBellId */
  armedRouteId?: string;
}

// ---- Simulation state -------------------------------------------------------

export interface EntityRuntime {
  entityId: EntityId;
  fields: Record<string, unknown>; // position, running, cargoState, rungAt[], …
}

export interface BeatLog {
  beat: Beat;
  events: import("../contracts.js").GameEvent[];
  entityStates: Record<EntityId, Record<string, unknown>>;
}

export interface Timeline {
  seed: number;
  beats: BeatLog[]; // index 0 = beat 1 … horizon
  finalEntityStates: Record<EntityId, Record<string, unknown>>;
}
