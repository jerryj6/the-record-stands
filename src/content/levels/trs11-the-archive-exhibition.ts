/**
 * TRS-11 The Archive Exhibition (master TRS-D row 11).
 *
 * Lesson: repairs in neighboring subscenes affect one another. The
 * archive staged two halls on one recorded morning — the North Gallery,
 * whose exhibit cart skidded the wet terrace at 4 (gallery bell + ruined
 * vase), and the South Court, whose court cart skidded the wet quay at 5
 * (ONE strike of the harbor bell + ruined vase). One canal pump feeds
 * both tiles; one spare cart and one wind-up toy serve both halls.
 * Fixing each half with its own claim on the same prop is a conflict —
 * the spare cart cannot drive two roads, and the cheaper north detour
 * wades the south court's tile and adds an unrecorded second strike.
 */
import type { CaseDefinition } from "../../engine/trs/types.js";

export const TRS11: CaseDefinition = {
  levelId: "trs-11",
  title: "The Archive Exhibition",
  chapter: 3,
  horizonBeats: 8,

  entities: [
    {
      entityId: "exhibitCart",
      kind: "trolley",
      name: "North Gallery Cart",
      initial: { vaseN: "intact", armed: true },
    },
    {
      entityId: "courtCart",
      kind: "trolley",
      name: "South Court Cart",
      initial: { vaseS: "intact", armed: true },
    },
    {
      entityId: "spareCart",
      kind: "trolley",
      name: "Spare Cart",
      // The contested prop: the only empty cart that can take either
      // subscene's substitute skid — or, on the relay road, both.
      initial: { armed: true },
    },
    {
      entityId: "canalPump",
      kind: "fountain",
      name: "Canal Pump",
      // One feed for the terrace AND the quay: the two subscenes share it.
      initial: { running: true },
    },
    {
      entityId: "galleryBell",
      kind: "bell",
      name: "Gallery Bell",
      initial: {},
    },
    {
      entityId: "harborBell",
      kind: "bell",
      name: "Harbor Bell",
      initial: {},
    },
    {
      entityId: "northSwitch",
      kind: "junction",
      name: "North Switch",
      initial: { controlsRouteOf: "northWay", routeId: "northWay" },
    },
    {
      entityId: "southSwitch",
      kind: "junction",
      name: "South Switch",
      initial: { controlsRouteOf: "southWay", routeId: "southWay" },
    },
    {
      entityId: "spareSwitch",
      kind: "junction",
      name: "Spare Switch",
      // Every RedirectJunction on this switch reassigns the SAME cart —
      // committing two spurs is not two plans, it is one overwritten plan.
      initial: { controlsRouteOf: "errandLoop", routeId: "errandLoop" },
    },
    {
      entityId: "windUpToy",
      kind: "windUpToy",
      name: "Wind-up Nightjar",
      initial: { armed: false },
    },
    {
      entityId: "exhibitHall",
      kind: "destination",
      name: "Exhibit Hall",
      initial: {},
    },
  ],

  routes: [
    {
      // North half of the record: rose arch at 3, terrace skid at 4
      // (gallery bell + ruined vase), east stairs at 6.
      routeId: "northWay",
      label: "North gallery way (wet terrace)",
      waypoints: [
        { locationId: "northGate" },
        { locationId: "northBridge" },
        { locationId: "roseArch", crossingId: "roseArch" },
        {
          locationId: "wetTerrace",
          surface: { kind: "dynamic", sourceEntityId: "canalPump" },
          skidHazard: true,
          adjacentBellId: "galleryBell",
        },
        { locationId: "plazaCenter" },
        { locationId: "eastStairs" },
        { locationId: "exhibitHall", isDestination: true },
      ],
    },
    {
      // Dry cloister at the same beats — the clean north repair.
      routeId: "northDetour",
      label: "North detour (dry cloister)",
      waypoints: [
        { locationId: "northGate" },
        { locationId: "northBridge" },
        { locationId: "roseArch", crossingId: "roseArch" },
        { locationId: "cloisterWalk", surface: { kind: "dry" } },
        { locationId: "plazaCenter" },
        { locationId: "eastStairs" },
        { locationId: "exhibitHall", isDestination: true },
      ],
    },
    {
      // The neighboring-subscene trap: dry for the vase, but beat 5 wades
      // the south court's wet quay — a second, unrecorded harbor strike.
      routeId: "arcadeCut",
      label: "Arcade cut (through the south quay)",
      waypoints: [
        { locationId: "northGate" },
        { locationId: "northBridge" },
        { locationId: "roseArch", crossingId: "roseArch" },
        { locationId: "oldLane", surface: { kind: "dry" } },
        {
          locationId: "wetQuay",
          surface: { kind: "dynamic", sourceEntityId: "canalPump" },
          skidHazard: true,
          adjacentBellId: "harborBell",
        },
        { locationId: "eastStairs" },
        { locationId: "exhibitHall", isDestination: true },
      ],
    },
    {
      // South half of the record: festival arch at 3, quay skid at 5
      // (one harbor strike + ruined vase), harbor stairs at 6.
      routeId: "southWay",
      label: "South court way (wet quay)",
      waypoints: [
        { locationId: "southGate" },
        { locationId: "ferrySteps" },
        { locationId: "festivalArch", crossingId: "festivalArch" },
        { locationId: "riverRow" },
        {
          locationId: "wetQuay",
          surface: { kind: "dynamic", sourceEntityId: "canalPump" },
          skidHazard: true,
          adjacentBellId: "harborBell",
        },
        { locationId: "harborStairs" },
        { locationId: "annexHall", isDestination: true },
      ],
    },
    {
      // Dry bank walk at the same beats — the clean south repair.
      routeId: "southDetour",
      label: "South detour (dry bank walk)",
      waypoints: [
        { locationId: "southGate" },
        { locationId: "ferrySteps" },
        { locationId: "festivalArch", crossingId: "festivalArch" },
        { locationId: "riverRow" },
        { locationId: "bankWalk", surface: { kind: "dry" } },
        { locationId: "harborStairs" },
        { locationId: "annexHall", isDestination: true },
      ],
    },
    {
      routeId: "errandLoop",
      label: "Errand loop",
      waypoints: [
        { locationId: "depotYard" },
        { locationId: "millstone" },
        { locationId: "bakeryRow" },
        { locationId: "spareDepot", isDestination: true },
      ],
    },
    {
      // Terrace leg: the spare cart skids the north tile at 4.
      routeId: "terraceSpur",
      label: "Terrace spur (skid at 4)",
      waypoints: [
        { locationId: "depotYard" },
        { locationId: "towerPath" },
        { locationId: "terraceApproach" },
        {
          locationId: "wetTerrace",
          surface: { kind: "dynamic", sourceEntityId: "canalPump" },
          skidHazard: true,
          adjacentBellId: "galleryBell",
        },
        { locationId: "spareDepot", isDestination: true },
      ],
    },
    {
      // Quay leg: the spare cart skids the south tile at 5.
      routeId: "quaySpur",
      label: "Quay spur (skid at 5)",
      waypoints: [
        { locationId: "depotYard" },
        { locationId: "towerPath" },
        { locationId: "dockPath" },
        { locationId: "quayNorth" },
        {
          locationId: "wetQuay",
          surface: { kind: "dynamic", sourceEntityId: "canalPump" },
          skidHazard: true,
          adjacentBellId: "harborBell",
        },
        { locationId: "spareDepot", isDestination: true },
      ],
    },
    {
      // THE interaction-aware repair: one cart, two recorded skids —
      // terrace at 4, quay at 5 — serving both bells on a single road.
      routeId: "relaySpur",
      label: "Relay spur (terrace at 4, quay at 5)",
      waypoints: [
        { locationId: "depotYard" },
        { locationId: "towerPath" },
        { locationId: "terraceApproach" },
        {
          locationId: "wetTerrace",
          surface: { kind: "dynamic", sourceEntityId: "canalPump" },
          skidHazard: true,
          adjacentBellId: "galleryBell",
        },
        {
          locationId: "wetQuay",
          surface: { kind: "dynamic", sourceEntityId: "canalPump" },
          skidHazard: true,
          adjacentBellId: "harborBell",
        },
        { locationId: "spareDepot", isDestination: true },
      ],
    },
  ],

  sockets: [
    {
      socketId: "gallerySocket",
      accepts: ["PlaceAndArmToy"],
      linkedBellId: "galleryBell",
      locationId: "galleryGreen",
    },
    // The nightjar strikes at beat 4 only — the harbor bell's beat-5 fact
    // cannot be covered by a toy; that bell needs a real skid. Asymmetric
    // substitute menus are the lesson's other half.
  ],

  actors: [
    {
      entityId: "exhibitCart",
      kind: "trolley",
      startBeat: 1,
      defaultRouteId: "northWay",
      cargoField: "vaseN",
    },
    {
      entityId: "courtCart",
      kind: "trolley",
      startBeat: 1,
      defaultRouteId: "southWay",
      cargoField: "vaseS",
    },
    {
      entityId: "spareCart",
      kind: "carrier",
      startBeat: 1,
      defaultRouteId: "errandLoop",
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
  interventionBudget: 4,

  sealedObservations: [
    {
      id: "OBS-ARCH-N",
      form: "AtCrossing",
      entityId: "exhibitCart",
      crossingId: "roseArch",
      beat: 3,
    },
    {
      // North hall: the gallery bell rang at 4.
      id: "OBS-BELL-N",
      form: "EventOccurred",
      entityId: "galleryBell",
      eventType: "BellRing",
      beat: 4,
    },
    {
      id: "OBS-ARCH-S",
      form: "AtCrossing",
      entityId: "courtCart",
      crossingId: "festivalArch",
      beat: 3,
    },
    {
      // South hall: the harbor bell struck EXACTLY ONCE at 5 — a second
      // strike is a new event, not the record.
      id: "OBS-BELL-S",
      form: "EventCount",
      entityId: "harborBell",
      eventType: "BellRing",
      fromBeat: 5,
      toBeat: 5,
      count: 1,
    },
    {
      id: "OBS-ANNEX",
      form: "EntityAt",
      entityId: "courtCart",
      locationId: "harborStairs",
      beat: 6,
    },
  ],

  desiredOutcomes: [
    {
      id: "OUT-VASE-N",
      form: "EntityStateAtEnd",
      entityId: "exhibitCart",
      field: "vaseN",
      value: "intact",
    },
    {
      id: "OUT-VASE-S",
      form: "EntityStateAtEnd",
      entityId: "courtCart",
      field: "vaseS",
      value: "intact",
    },
  ],

  hints: [
    "Each hall's accident can be dried out or detoured — but the bells still rang. The gallery ring is at 4 and the harbor strike at 5, and the archive counted exactly one strike at 5.",
    "The spare cart is the only empty mover: two half-plans that both assign it a road collapse into whichever road was committed last. One road exists that visits the terrace at 4 and the quay at 5.",
    "The arcade cut looks like a cheap north detour, but beat 5 wades the south court's quay — a second harbor strike the record never counted. The nightjar only ever strikes at 4; beat 5 needs a skid.",
  ],

  designNote:
    "Interaction case: two subscenes share one pump (both tiles), one spare cart (both substitute skids), and one hazard tile (the quay is reachable from the north road). Independently fixing each half produces two understandable conflicts: (a) resource — each half wants spareSwitch committed to a different spur, and RedirectJunction is last-wins so the first substitute silently never runs; (b) event — the cheap north detour wades the south tile at 5, doubling the harbor bell's single recorded strike. The compensating repairs: RELAY (3/4) sends the one spare cart through BOTH wet tiles at their recorded beats; SPLIT (4/4) parks the nightjar at the gallery socket (strike@4) and gives the spare cart the quay spur (skid@5). The asymmetry is deliberate: the toy can only cover the beat-4 bell, so at least one skid must survive in every valid plan.",
};

export const TRS11_CARD = {
  winningTraceSummary:
    "RELAY (3/4): northSwitch→northDetour + southSwitch→southDetour + spareSwitch→relaySpur — one spare cart skids the terrace at 4 and the quay at 5. Or SPLIT (4/4): both detours + nightjar at the gallery socket + spareSwitch→quaySpur.",
  strategySignatures: [
    "relay-one-cart-two-skids: northDetour + southDetour + spareSwitch→relaySpur",
    "split-toy-north-skid-south: northDetour + southDetour + PlaceAndArmToy(gallerySocket) + spareSwitch→quaySpur",
  ],
  wrongApproaches: [
    "Fixing each half with its own claim on the spare cart collapses: two RedirectJunctions on spareSwitch are last-wins — one bell never gets its substitute.",
    "The arcade cut repairs the north vase but wades the south quay at 5 — a second harbor strike, and the archive counted exactly one.",
    "Closing the shared canal pump dries both tiles at once: both vases safe, both bells silent.",
    "Both detours with no substitutes save the vases and silence both bells.",
    "The nightjar cannot cover the harbor bell — it only ever strikes at 4 and the record needs 5.",
    "Detour plus terrace spur with no south repair: the court cart still skids at 5 and its vase still breaks.",
  ],
  coopNote:
    "Four jobs: north-hall evidence (rose arch + gallery bell), south-hall evidence (festival arch + the ONE-strike count + annex timing), substitute allocation across the shared prop (who gets the spare cart, who gets the nightjar), and interaction audit — does either half's repair touch the other hall's sealed events?",
};
