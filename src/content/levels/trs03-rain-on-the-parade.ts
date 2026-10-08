/**
 * TRS-03 Rain on the Parade (master TRS-D row 3).
 *
 * Lesson: a route can diverge and rejoin while preserving a recorded
 * crossing. The banner float is ruined on the open boulevard at beat 4,
 * yet the archive still has it crossing the parade gate at beat 6 — on
 * time but soaked. The covered arcade detour takes the same number of
 * beats and rejoins the route before the gate; a shorter express alley
 * reaches the gate a beat early and falsifies the record.
 */
import type { CaseDefinition } from "../../engine/trs/types.js";

export const TRS03: CaseDefinition = {
  levelId: "trs-03",
  title: "Rain on the Parade",
  chapter: 1,
  horizonBeats: 8,

  entities: [
    {
      entityId: "bannerFloat",
      kind: "trolley",
      name: "Banner Float",
      initial: { banner: "intact", armed: true },
    },
    {
      entityId: "marshalCart",
      kind: "trolley",
      name: "Marshal's Cart",
      // Empty escort cart: it can skid without breaking anything.
      initial: { armed: true },
    },
    {
      entityId: "weatherFront",
      kind: "fixture",
      name: "Rain Front",
      initial: { running: true },
    },
    {
      entityId: "rainBell",
      kind: "bell",
      name: "Rain Bell",
      initial: {},
    },
    {
      entityId: "bandstandBell",
      kind: "bell",
      name: "Bandstand Bell",
      initial: {},
    },
    {
      entityId: "paradeGate",
      kind: "arch",
      name: "Parade Gate",
      initial: {},
    },
    {
      entityId: "bandstand",
      kind: "fixture",
      name: "Bandstand",
      initial: {},
    },
    {
      entityId: "floatSwitch",
      kind: "junction",
      name: "Float Switch",
      initial: { controlsRouteOf: "mainStreet", routeId: "mainStreet" },
    },
    {
      entityId: "marshalSwitch",
      kind: "junction",
      name: "Marshal Switch",
      initial: { controlsRouteOf: "marshalLoop", routeId: "marshalLoop" },
    },
    {
      entityId: "windUpToy",
      kind: "windUpToy",
      name: "Wind-up Finch",
      initial: { armed: false },
    },
    {
      entityId: "reviewStand",
      kind: "destination",
      name: "Review Stand",
      initial: {},
    },
  ],

  routes: [
    {
      // Original route: wet boulevard at beat 4 (skid + rain bell + ruined
      // banner), parade-gate crossing still recorded on time at beat 6.
      routeId: "mainStreet",
      label: "Main street (exposed boulevard)",
      waypoints: [
        { locationId: "assemblyYard" },
        { locationId: "bandStand", crossingId: "bandstand" },
        { locationId: "boulevardSouth" },
        {
          locationId: "openBoulevard",
          surface: { kind: "dynamic", sourceEntityId: "weatherFront" },
          skidHazard: true,
          adjacentBellId: "rainBell",
        },
        { locationId: "gateApproach" },
        { locationId: "paradeGate", crossingId: "paradeGate" },
        { locationId: "reviewStand", isDestination: true },
      ],
    },
    {
      // Dry detour: diverges after the bandstand, rejoins at the gate
      // approach — same 7-beat duration, so the beat-6 gate holds.
      routeId: "arcadeDetour",
      label: "Covered arcade detour (dry, same duration)",
      waypoints: [
        { locationId: "assemblyYard" },
        { locationId: "bandStand", crossingId: "bandstand" },
        { locationId: "arcadeEast", surface: { kind: "dry" } },
        { locationId: "arcadeRoof", surface: { kind: "dry" } },
        { locationId: "gateApproach" },
        { locationId: "paradeGate", crossingId: "paradeGate" },
        { locationId: "reviewStand", isDestination: true },
      ],
    },
    {
      // Tempting trap: shorter route — dry, but reaches the gate at beat 5.
      routeId: "expressAlley",
      label: "Express alley (shorter)",
      waypoints: [
        { locationId: "assemblyYard" },
        { locationId: "cutLane" },
        { locationId: "cutCourt" },
        { locationId: "serviceRamp" },
        { locationId: "paradeGate", crossingId: "paradeGate" },
        { locationId: "reviewStand", isDestination: true },
      ],
    },
    {
      routeId: "marshalLoop",
      label: "Marshal's market loop",
      waypoints: [
        { locationId: "musterYard" },
        { locationId: "tollBridge", crossingId: "tollBridge" },
        { locationId: "marketRow" },
        { locationId: "marketSteps" },
        { locationId: "stallAlley" },
        { locationId: "marshalPostEnd", isDestination: true },
      ],
    },
    {
      // Marshal's alternate spur: crosses the same wet boulevard waypoint
      // at beat 4 — an empty cart can take the skid the banner must avoid.
      routeId: "hazardSpur",
      label: "Boulevard spur (wet)",
      waypoints: [
        { locationId: "musterYard" },
        { locationId: "tollBridge", crossingId: "tollBridge" },
        { locationId: "boulevardEdge" },
        {
          locationId: "openBoulevard",
          surface: { kind: "dynamic", sourceEntityId: "weatherFront" },
          skidHazard: true,
          adjacentBellId: "rainBell",
        },
        { locationId: "drainageRow" },
        { locationId: "marshalPostEnd", isDestination: true },
      ],
    },
  ],

  sockets: [
    {
      socketId: "rainBellSocket",
      accepts: ["PlaceAndArmToy"],
      linkedBellId: "rainBell",
      locationId: "boulevardEdge",
    },
    {
      // Decoy socket: the toy rings whichever bell its socket is tied to —
      // the bandstand bell is not the bell the archive heard.
      socketId: "bandstandSocket",
      accepts: ["PlaceAndArmToy"],
      linkedBellId: "bandstandBell",
      locationId: "bandstand",
    },
  ],

  actors: [
    {
      entityId: "bannerFloat",
      kind: "trolley",
      startBeat: 1,
      defaultRouteId: "mainStreet",
      cargoField: "banner",
    },
    {
      entityId: "marshalCart",
      kind: "carrier",
      startBeat: 1,
      defaultRouteId: "marshalLoop",
    },
  ],

  interventionCosts: {
    RedirectJunction: 1,
    SetValve: 1,
    SetMechanismDelay: 1,
    ScheduleActivation: 1,
    RepositionProp: 1,
    PlaceAndArmToy: 1,
  },
  interventionBudget: 3,

  sealedObservations: [
    {
      // The recorded crossing: the banner float at the parade gate, beat 6.
      id: "OBS-GATE",
      form: "AtCrossing",
      entityId: "bannerFloat",
      crossingId: "paradeGate",
      beat: 6,
    },
    {
      // The rain bell rang at beat 4 — the skid's sound, not its cause.
      id: "OBS-BELL",
      form: "EventOccurred",
      entityId: "rainBell",
      eventType: "BellRing",
      beat: 4,
    },
    {
      // Rain/fountain activity is fixed: the front stayed running.
      id: "OBS-RAIN",
      form: "StateEquals",
      entityId: "weatherFront",
      field: "running",
      value: true,
      beat: 8,
    },
  ],

  desiredOutcomes: [
    {
      id: "OUT-BANNER",
      form: "EntityStateAtEnd",
      entityId: "bannerFloat",
      field: "banner",
      value: "intact",
    },
  ],

  hints: [
    "The banner is ruined on the open boulevard at beat 4, but the float is still recorded crossing the parade gate at beat 6. Dry pavement will not help if the gate timing changes.",
    "The float switch offers two detours. The covered arcade has the same beat count as main street and rejoins before the gate; the express alley is shorter — and the archive does not forgive shorter.",
    "After rerouting, the rain bell is still owed a ring at beat 4. The marshal's empty cart can take the wet boulevard itself, or the wind-up finch can strike the right bell from its socket.",
  ],

  designNote:
    "Diverge-and-rejoin: the arcade detour shares main street's first two waypoints and its last three, so the recorded bandstand and beat-6 gate crossings survive while the wet boulevard beat is skipped. The removed skid ring is re-supplied two different ways — the toy strike (mechanical substitute) or the empty marshal cart's own skid on the shared boulevard hazard at beat 4 (physical substitute) — giving two strategically distinct repairs. Traps: the express alley is dry but one beat short, so the float crosses the gate at 5 and the pinned beat-6 crossing fails; stopping the rain front falsifies the fixed weather observation and silences the bell; the bandstand socket rings the wrong bell (entity identity); delaying the float re-times the gate and the skid together.",
};

export const TRS03_CARD = {
  winningTraceSummary:
    "Redirect the banner float at the float switch onto the covered arcade detour — diverges after the bandstand, rejoins at the gate approach, still crosses the parade gate at beat 6 — then re-supply the beat-4 rain bell either by arming the wind-up finch at the boulevard-edge socket, or by redirecting the marshal's empty cart onto the boulevard spur so it skids there at beat 4. Cost: 2 of 3.",
  strategySignatures: [
    "toy-substitute: arcadeDetour + PlaceAndArmToy(rainBellSocket)",
    "sacrificial-skid: arcadeDetour + RedirectJunction(marshalSwitch→hazardSpur)",
  ],
  wrongApproaches: [
    "Taking the express alley is dry but shorter — the float reaches the parade gate at beat 5, falsifying the recorded beat-6 crossing.",
    "Stopping the rain front dries the boulevard and saves the banner, but falsifies 'rain running at 8' and removes the beat-4 bell.",
    "Arming the toy at the bandstand socket rings the bandstand bell at 4 — a different bell does not satisfy the rain-bell record.",
    "Delaying the float pushes the gate crossing to beat 7 and merely moves the skid to beat 5.",
    "Sending only the marshal's cart onto the spur restores the bell but leaves the banner ruined — the record never said the marshal was fragile.",
  ],
  coopNote:
    "One player can own the float's detour timing, another the bell substitution choice (toy vs. marshal skid) — the two solutions are a good co-op argument to have.",
};
