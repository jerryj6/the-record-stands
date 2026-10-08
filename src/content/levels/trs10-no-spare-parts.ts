/**
 * TRS-10 No Spare Parts (master TRS-D row 10).
 *
 * Lesson: scarcity creates alternate uses for familiar props.
 * Two gift carts ride the SAME procession route — one junction pull moves
 * them both — and skid together on the wet cobbles at 4, ringing the
 * tower bell and ruining both gift sets. Across town the sweeper already
 * sloshes the wet quay at 6 every day, ringing the harbor bell: an
 * existing consequence the archive also recorded. Substitutes are scarce:
 * one toy, one spare cart, one sweeper. The best plan borrows the
 * sweeper's road for the spare cart and leaves the existing ring alone —
 * it never spawns a tool it doesn't need.
 */
import type { CaseDefinition } from "../../engine/trs/types.js";

export const TRS10: CaseDefinition = {
  levelId: "trs-10",
  title: "No Spare Parts",
  chapter: 3,
  horizonBeats: 8,

  entities: [
    {
      entityId: "giftCartA",
      kind: "trolley",
      name: "Gift Cart A",
      initial: { giftSetA: "intact", armed: true },
    },
    {
      entityId: "giftCartB",
      kind: "trolley",
      name: "Gift Cart B",
      initial: { giftSetB: "intact", armed: true },
    },
    {
      entityId: "sweeperCart",
      kind: "trolley",
      name: "Sweeper Cart",
      // The existing consequence: sloshes the wet quay at beat 6 every day,
      // ringing the harbor bell for free. Move it and the harbor goes silent.
      initial: { armed: true },
    },
    {
      entityId: "spareCart",
      kind: "trolley",
      name: "Spare Cart",
      // Empty: the one movable substitute — it can borrow the sweeper's
      // tower-spur road and skid the cobbles at 4.
      initial: { armed: true },
    },
    {
      entityId: "canalPump",
      kind: "fountain",
      name: "Canal Pump",
      // One feed for both wet tiles: closing it dries the cobbles AND the
      // quay — one valve, two dead bells.
      initial: { running: true },
    },
    {
      entityId: "towerBell",
      kind: "bell",
      name: "Tower Bell",
      initial: {},
    },
    {
      entityId: "harborBell",
      kind: "bell",
      name: "Harbor Bell",
      initial: {},
    },
    {
      entityId: "festivalGate",
      kind: "fixture",
      name: "Festival Gate",
      initial: {},
    },
    {
      entityId: "convoySwitch",
      kind: "junction",
      name: "Convoy Switch",
      // Scarce by construction: BOTH gift carts default to processionWay,
      // so this one pull reroutes the whole convoy.
      initial: { controlsRouteOf: "processionWay", routeId: "processionWay" },
    },
    {
      entityId: "sweepSwitch",
      kind: "junction",
      name: "Sweep Switch",
      initial: { controlsRouteOf: "sweepLoop", routeId: "sweepLoop" },
    },
    {
      entityId: "spareSwitch",
      kind: "junction",
      name: "Spare Switch",
      initial: { controlsRouteOf: "errandLoop", routeId: "errandLoop" },
    },
    {
      entityId: "windUpBird",
      kind: "windUpToy",
      name: "Wind-up Bird",
      initial: { armed: false },
    },
    {
      entityId: "palaceYard",
      kind: "destination",
      name: "Palace Yard",
      initial: {},
    },
  ],

  routes: [
    {
      // Shared convoy route: both carts cross the festival gate at 5 and
      // the grandstand at 6 — and both skid the cobbles at 4.
      routeId: "processionWay",
      label: "Procession way (wet cobbles)",
      waypoints: [
        { locationId: "townSq" },
        { locationId: "bandstand" },
        { locationId: "archRow" },
        {
          locationId: "wetCobbles",
          surface: { kind: "dynamic", sourceEntityId: "canalPump" },
          skidHazard: true,
          adjacentBellId: "towerBell",
        },
        { locationId: "festivalGate", crossingId: "festivalGate" },
        { locationId: "grandStand" },
        { locationId: "palaceYard", isDestination: true },
      ],
    },
    {
      // Covered walk: identical recorded beats, dry at 4.
      routeId: "processionDetour",
      label: "Procession detour (covered walk)",
      waypoints: [
        { locationId: "townSq" },
        { locationId: "bandstand" },
        { locationId: "archRow" },
        { locationId: "coveredWalk", surface: { kind: "dry" } },
        { locationId: "festivalGate", crossingId: "festivalGate" },
        { locationId: "grandStand" },
        { locationId: "palaceYard", isDestination: true },
      ],
    },
    {
      // The sweeper's daily round — including its recorded bridge at 2
      // and its consequence: the wet-quay skid at 6.
      routeId: "sweepLoop",
      label: "Sweep loop (quay at 6)",
      waypoints: [
        { locationId: "lockHouse" },
        { locationId: "sweepBridge", crossingId: "sweepBridge" },
        { locationId: "quayNorth" },
        { locationId: "quayLower" },
        { locationId: "runoffRow" },
        {
          locationId: "wetQuay",
          surface: { kind: "dynamic", sourceEntityId: "canalPump" },
          skidHazard: true,
          adjacentBellId: "harborBell",
        },
        { locationId: "mopShed", isDestination: true },
      ],
    },
    {
      // Tower spur: keeps the sweeper's recorded bridge at 2, then skids
      // the cobbles at 4. The spare cart can borrow the same road.
      routeId: "towerSpur",
      label: "Tower spur (cobbles at 4)",
      waypoints: [
        { locationId: "lockHouse" },
        { locationId: "sweepBridge", crossingId: "sweepBridge" },
        { locationId: "towerApproach" },
        {
          locationId: "wetCobbles",
          surface: { kind: "dynamic", sourceEntityId: "canalPump" },
          skidHazard: true,
          adjacentBellId: "towerBell",
        },
        { locationId: "runoffRow" },
        { locationId: "mopShed", isDestination: true },
      ],
    },
    {
      routeId: "errandLoop",
      label: "Errand loop",
      waypoints: [
        { locationId: "garthYard" },
        { locationId: "millLane" },
        { locationId: "bakeryRow" },
        { locationId: "fishStairs" },
        { locationId: "errandDepot", isDestination: true },
      ],
    },
    {
      // Quay shift: the spare cart covering the sweeper's own consequence —
      // skids the wet quay at 6, ringing the harbor bell itself.
      routeId: "quayShift",
      label: "Quay shift (quay at 6)",
      waypoints: [
        { locationId: "garthYard" },
        { locationId: "millLane" },
        { locationId: "quayNorth" },
        { locationId: "quayLower" },
        { locationId: "runoffRow" },
        {
          locationId: "wetQuay",
          surface: { kind: "dynamic", sourceEntityId: "canalPump" },
          skidHazard: true,
          adjacentBellId: "harborBell",
        },
        { locationId: "errandDepot", isDestination: true },
      ],
    },
  ],

  sockets: [
    {
      socketId: "towerSocket",
      accepts: ["PlaceAndArmToy"],
      linkedBellId: "towerBell",
      locationId: "towerGreen",
    },
    {
      // Only useful because the parked bird re-rings every beat ≥4 — it
      // covers the harbor bell's beat-6 fact the expensive way (cost 2).
      socketId: "harborSocket",
      accepts: ["PlaceAndArmToy"],
      linkedBellId: "harborBell",
      locationId: "quayWatch",
    },
  ],

  actors: [
    {
      entityId: "giftCartA",
      kind: "trolley",
      startBeat: 1,
      defaultRouteId: "processionWay",
      cargoField: "giftSetA",
    },
    {
      entityId: "giftCartB",
      kind: "trolley",
      startBeat: 1,
      defaultRouteId: "processionWay",
      cargoField: "giftSetB",
    },
    {
      entityId: "sweeperCart",
      kind: "carrier",
      startBeat: 1,
      defaultRouteId: "sweepLoop",
    },
    {
      entityId: "spareCart",
      kind: "carrier",
      startBeat: 1,
      defaultRouteId: "errandLoop",
    },
  ],

  // The toy costs 2 — spawning it is the expensive option. The best plan
  // costs 2 of 4: one convoy pull plus one borrowed road.
  interventionCosts: {
    RedirectJunction: 1,
    SetValve: 1,
    SetMechanismDelay: 1,
    ScheduleActivation: 1,
    RepositionProp: 1,
    PlaceAndArmToy: 2,
  },
  interventionBudget: 4,

  sealedObservations: [
    {
      // The tower bell rang at beat 4.
      id: "OBS-TOWER",
      form: "EventOccurred",
      entityId: "towerBell",
      eventType: "BellRing",
      beat: 4,
    },
    {
      // The harbor bell rang at beat 6 — the sweeper's daily consequence.
      id: "OBS-HARBOR",
      form: "EventOccurred",
      entityId: "harborBell",
      eventType: "BellRing",
      beat: 6,
    },
    {
      // Gift cart A crossed the festival gate at beat 5.
      id: "OBS-GATE-A",
      form: "AtCrossing",
      entityId: "giftCartA",
      crossingId: "festivalGate",
      beat: 5,
    },
    {
      // Gift cart B was at the grandstand at beat 6.
      id: "OBS-STAND-B",
      form: "EntityAt",
      entityId: "giftCartB",
      locationId: "grandStand",
      beat: 6,
    },
    {
      // The sweeper crossed its recorded bridge at beat 2 — its rerouted
      // road must keep this opening.
      id: "OBS-BRIDGE",
      form: "AtCrossing",
      entityId: "sweeperCart",
      crossingId: "sweepBridge",
      beat: 2,
    },
  ],

  desiredOutcomes: [
    {
      id: "OUT-GIFT-A",
      form: "EntityStateAtEnd",
      entityId: "giftCartA",
      field: "giftSetA",
      value: "intact",
    },
    {
      id: "OUT-GIFT-B",
      form: "EntityStateAtEnd",
      entityId: "giftCartB",
      field: "giftSetB",
      value: "intact",
    },
  ],

  hints: [
    "One convoy pull protects both carts — they share the procession route. But the tower bell's beat-4 ring came from their skid; the harbor bell's beat-6 ring comes from the sweeper and does not need to be rebuilt.",
    "The tower bell has substitutes: the bird at the tower socket, or an empty cart skidding the cobbles at 4. The spare cart can borrow the sweeper's tower-spur road and keep its bridge crossing.",
    "Do not move the sweeper to the cobbles unless someone else covers the quay — it cannot be in two places, and the harbor bell's beat-6 ring is also sealed. Closing the canal pump dries both tiles: two bells dead to save one stretch of road.",
  ],

  designNote:
    "Scarcity case, no new verbs. The convoy shares one route so ONE junction pull protects both gift carts — then only the tower-bell ring needs a substitute, because the harbor ring is an existing consequence the repair should leave alone. Three verified repairs allocate the scarce props differently: BEST (2/4) borrows the tower spur for the spare cart — reusing the sweeper's whole quay consequence and spawning nothing; TOY (3/4) parks the bird at the tower socket; RESHUFFLE (3/4) moves the sweeper to the tower spur AND covers its abandoned quay duty with the spare cart's quay shift. The orphaning trap is the lesson's sharp edge: moving the sweeper to the cobbles without covering the quay passes every fact except OBS-HARBOR — you cannot spend one prop twice. The harbor socket is only viable because the parked bird re-rings through beat 6; pricing the toy at 2 makes reuse strictly cheaper than spawning (the brief's 'best plan' requirement). One canal pump feeds both tiles — a single valve kills both bells.",
};

export const TRS10_CARD = {
  winningTraceSummary:
    "Best (2/4): convoySwitch→processionDetour (one pull moves both gift carts) + spareSwitch→towerSpur — the spare cart skids the cobbles at 4 while the sweeper's existing quay skid still rings the harbor bell at 6. Alternates: toy at the tower socket (3/4), or reassign both carts — sweeper to the tower spur, spare to the quay shift (3/4).",
  strategySignatures: [
    "best—reuse-the-consequence: convoySwitch→processionDetour + spareSwitch→towerSpur",
    "spawn-the-toy: convoySwitch→processionDetour + PlaceAndArmToy(towerSocket)",
    "reshuffle-both-carts: convoySwitch→processionDetour + sweepSwitch→towerSpur + spareSwitch→quayShift",
  ],
  wrongApproaches: [
    "Moving the sweeper to the tower spur rings the tower bell at 4 but orphans the harbor: OBS-HARBOR fails alone — one prop cannot stand in two places.",
    "The detour alone protects both gifts and drops the tower ring entirely.",
    "Closing the canal pump dries the cobbles AND the quay — one shared feed, both sealed rings gone (OBS-TOWER and OBS-HARBOR fail together).",
    "Parking the bird at the harbor socket while leaving the tower bell uncovered protects the harbor ring at 6 but OBS-TOWER still fails.",
    "Arming the bird at the tower socket AND sending the sweeper up the same spur double-covers beat 4 while the harbor bell goes silent.",
    "Delaying a gift cart shifts its gate crossing and its skid — the record heard it at 5 and 4, not later.",
  ],
  coopNote:
    "Four real jobs: convoy-route evidence (gate + grandstand), sweeper-consequence audit (is the harbor ring still supplied?), substitute allocation (bird vs spare vs sweeper), and budget arithmetic — the best plan spends 2, the wasteful ones spend 4.",
};
