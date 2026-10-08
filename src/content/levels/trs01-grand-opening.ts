import type { CaseDefinition } from "../../engine/trs/types.js";

/**
 * TRS-01 The Grand Opening (master TRS-C — mandatory first case).
 * Wet route: fountain wets lane → trolley skids → strikes brass bell (beat 4) →
 * cake ruined → crosses arch (5) → fountain still running (6).
 * Repair: junction → equal-duration dry route + wind-up toy strikes bell at beat 4.
 */
export const TRS01: CaseDefinition = {
  levelId: "TRS-01",
  title: "The Grand Opening",
  chapter: 1,
  horizonBeats: 7,
  entities: [
    { entityId: "redTrolley", kind: "trolley", name: "Red cake trolley",
      initial: { position: "start", cargoState: "intact" } },
    { entityId: "fountain", kind: "fountain", name: "Fountain",
      initial: { running: true, position: "squareCenter" } },
    { entityId: "brassBell", kind: "bell", name: "Brass bell",
      initial: { rungAt: [], position: "bellCorner" } },
    { entityId: "arch", kind: "arch", name: "Celebration arch",
      initial: { position: "arch" } },
    { entityId: "junction", kind: "junction", name: "Square junction",
      initial: { routeId: "wetLane", controlsRouteOf: "wetLane" } },
    { entityId: "windUpToy", kind: "windUpToy", name: "Wind-up toy drummer",
      initial: { armed: false, position: "tray" } },
    { entityId: "bakery", kind: "destination", name: "Grand opening table",
      initial: { position: "destination" } },
  ],
  routes: [
    {
      routeId: "wetLane", label: "Fountain lane (wet)",
      waypoints: [
        { locationId: "laneWest", surface: { kind: "dry" } },                       // beat 2
        { locationId: "fountainEdge", surface: { kind: "dynamic", sourceEntityId: "fountain" } }, // beat 3
        { locationId: "bellCorner", surface: { kind: "dynamic", sourceEntityId: "fountain" }, skidHazard: true, adjacentBellId: "brassBell" }, // beat 4
        { locationId: "arch", crossingId: "arch", surface: { kind: "dry" } },       // beat 5
        { locationId: "destination", isDestination: true, surface: { kind: "dry" } }, // beat 6
      ],
    },
    {
      routeId: "dryLane", label: "Arcade lane (dry, equal length)",
      waypoints: [
        { locationId: "arcadeWest", surface: { kind: "dry" } },
        { locationId: "arcadeMid", surface: { kind: "dry" } },
        { locationId: "arcadeEast", surface: { kind: "dry" } },                     // beat 4 — no bell adjacency, no hazard
        { locationId: "arch", crossingId: "arch", surface: { kind: "dry" } },
        { locationId: "destination", isDestination: true, surface: { kind: "dry" } },
      ],
    },
  ],
  sockets: [
    { socketId: "bellSocket", accepts: ["PlaceAndArmToy"], linkedBellId: "brassBell", locationId: "bellCorner" },
  ],
  actors: [
    { entityId: "redTrolley", kind: "trolley", startBeat: 2, defaultRouteId: "wetLane", cargoField: "cargoState" },
  ],
  interventionCosts: {
    RedirectJunction: 1,
    SetValve: 1,
    SetMechanismDelay: 1,
    ScheduleActivation: 1,
    RepositionProp: 1,
    PlaceAndArmToy: 1,
  },
  interventionBudget: 2,
  sealedObservations: [
    { id: "OBS-BELL", form: "EventOccurred", entityId: "brassBell", eventType: "BellRing", beat: 4 },
    { id: "OBS-ARCH", form: "AtCrossing", entityId: "redTrolley", crossingId: "arch", beat: 5 },
    { id: "OBS-FOUNTAIN", form: "StateEquals", entityId: "fountain", field: "running", value: true, beat: 6 },
  ],
  desiredOutcomes: [
    { id: "OUT-CAKE", form: "EntityStateAtEnd", entityId: "redTrolley", field: "cargoState", value: "intact" },
  ],
  hints: [
    "Something made the trolley hit the bell. Find what the wet lane did to the cake.",
    "The dry arcade lane is just as long. The archive never said the trolley rang the bell.",
    "Redirect the junction to the dry lane, then set the wind-up toy at the bell's marked socket — it strikes at beat four.",
  ],
  designNote:
    "Teaches that observations fix events, not causes. The fountain fix saves the cake but breaks two facts; " +
    "the dry route preserves cake+arch+fountain but breaks the bell; the toy re-causes the bell event.",
};
