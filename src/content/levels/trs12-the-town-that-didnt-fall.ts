/**
 * TRS-12 The Town That Didn't Fall (master TRS-D row 12 — finale).
 *
 * Three connected stages of one recorded day. Stage A (morning): the
 * rocket cart crossed the mill bridge at 2 and the mayor's cart crossed
 * the civic arch at 2. Stage B (midday): the rocket cart skidded the wet
 * plaza at 4 — one strike of the tower bell — and the mayor's cart
 * skidded the wet bank at 5 — one strike of the harbor bell. Stage C
 * (evening): the tower bell went quiet for the rest of the day, and the
 * green camera recorded the mayor arriving at the celebration at 7.
 * Both carts then ground their cargo — the fireworks and the signed
 * proclamation — into those two skids, and the town fell. The repair
 * must keep every stage's record while the town celebrates: both carts
 * arrive intact, the rocket cart actually reaches the green, and both
 * bells still sing at their recorded beats.
 */
import type { CaseDefinition } from "../../engine/trs/types.js";

export const TRS12: CaseDefinition = {
  levelId: "trs-12",
  title: "The Town That Didn't Fall",
  chapter: 3,
  horizonBeats: 8,

  entities: [
    {
      entityId: "__world",
      kind: "generic",
      name: "Archive Cameras",
      // The celebration camera watched the mayor arrive at the green at 7.
      initial: {
        cameraRegions: {
          greenCam: ["plazaCenter", "townSteps", "celebrationGreen"],
        },
      },
    },
    {
      entityId: "rocketCart",
      kind: "trolley",
      name: "Rocket Cart",
      initial: { fireworks: "intact", armed: true },
    },
    {
      entityId: "mayorCart",
      kind: "trolley",
      name: "Mayor's Cart",
      initial: { proclamation: "intact", armed: true },
    },
    {
      entityId: "sweeperCart",
      kind: "trolley",
      name: "Sweeper Cart",
      initial: { armed: true },
    },
    {
      entityId: "spareCart",
      kind: "trolley",
      name: "Spare Cart",
      initial: { armed: true },
    },
    {
      entityId: "stormPump",
      kind: "fountain",
      name: "Storm Pump",
      // One feed for BOTH mishap tiles — plaza and bank.
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
      entityId: "rocketSwitch",
      kind: "junction",
      name: "Rocket Switch",
      initial: { controlsRouteOf: "dawnRoad", routeId: "dawnRoad" },
    },
    {
      entityId: "mayorSwitch",
      kind: "junction",
      name: "Mayor Switch",
      initial: { controlsRouteOf: "civicLoop", routeId: "civicLoop" },
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
      entityId: "windUpFinch",
      kind: "windUpToy",
      name: "Wind-up Finch",
      initial: { armed: false },
    },
    {
      entityId: "celebrationGreen",
      kind: "destination",
      name: "Celebration Green",
      initial: {},
    },
  ],

  routes: [
    {
      // Stage A→C original: bridge at 2, plaza skid at 4 (tower bell +
      // ruined fireworks), town steps at 6, the green at 7.
      routeId: "dawnRoad",
      label: "Dawn road (wet plaza)",
      waypoints: [
        { locationId: "eastGate" },
        { locationId: "millBridge", crossingId: "millBridge" },
        { locationId: "roseRow" },
        {
          locationId: "wetPlaza",
          surface: { kind: "dynamic", sourceEntityId: "stormPump" },
          skidHazard: true,
          adjacentBellId: "towerBell",
        },
        { locationId: "plazaCenter" },
        { locationId: "townSteps", crossingId: "townSteps" },
        { locationId: "celebrationGreen", isDestination: true },
      ],
    },
    {
      // Covered arcade at 4: identical recorded beats, no skid.
      routeId: "dawnDetour",
      label: "Dawn detour (covered arcade)",
      waypoints: [
        { locationId: "eastGate" },
        { locationId: "millBridge", crossingId: "millBridge" },
        { locationId: "roseRow" },
        { locationId: "coveredArcade", surface: { kind: "dry" } },
        { locationId: "plazaCenter" },
        { locationId: "townSteps", crossingId: "townSteps" },
        { locationId: "celebrationGreen", isDestination: true },
      ],
    },
    {
      // Stage A→C original: civic arch at 2, bank skid at 5 (harbor bell +
      // ruined proclamation), town steps at 6, the green at 7.
      routeId: "civicLoop",
      label: "Civic loop (wet bank)",
      waypoints: [
        { locationId: "mayorHouse" },
        { locationId: "civicArch", crossingId: "civicArch" },
        { locationId: "bankRow" },
        { locationId: "marketTurn" },
        {
          locationId: "wetBank",
          surface: { kind: "dynamic", sourceEntityId: "stormPump" },
          skidHazard: true,
          adjacentBellId: "harborBell",
        },
        { locationId: "townSteps", crossingId: "townSteps" },
        { locationId: "celebrationGreen", isDestination: true },
      ],
    },
    {
      // Dry bank walk at 5: identical recorded beats, no skid.
      routeId: "civicDetour",
      label: "Civic detour (dry bank walk)",
      waypoints: [
        { locationId: "mayorHouse" },
        { locationId: "civicArch", crossingId: "civicArch" },
        { locationId: "bankRow" },
        { locationId: "marketTurn" },
        { locationId: "bankWalk", surface: { kind: "dry" } },
        { locationId: "townSteps", crossingId: "townSteps" },
        { locationId: "celebrationGreen", isDestination: true },
      ],
    },
    {
      // The sweeper's ordinary dry round — a movable crew, not yet
      // a consequence.
      routeId: "sweepLoop",
      label: "Sweep loop",
      waypoints: [
        { locationId: "boathouse" },
        { locationId: "canalRow" },
        { locationId: "mopLane" },
        { locationId: "sweepShed", isDestination: true },
      ],
    },
    {
      // Plaza leg: skid the wet plaza at 4 — the tower-bell substitute.
      routeId: "plazaSpur",
      label: "Plaza spur (plaza at 4)",
      waypoints: [
        { locationId: "relayYard" },
        { locationId: "gatePath" },
        { locationId: "plazaApproach" },
        {
          locationId: "wetPlaza",
          surface: { kind: "dynamic", sourceEntityId: "stormPump" },
          skidHazard: true,
          adjacentBellId: "towerBell",
        },
        { locationId: "relayDepot", isDestination: true },
      ],
    },
    {
      // Bank leg: skid the wet bank at 5 — the harbor-bell substitute.
      routeId: "bankSpur",
      label: "Bank spur (bank at 5)",
      waypoints: [
        { locationId: "relayYard" },
        { locationId: "dockPath" },
        { locationId: "bankLane" },
        { locationId: "marketTurn" },
        {
          locationId: "wetBank",
          surface: { kind: "dynamic", sourceEntityId: "stormPump" },
          skidHazard: true,
          adjacentBellId: "harborBell",
        },
        { locationId: "relayDepot", isDestination: true },
      ],
    },
    {
      // The relay: ONE cart skids the plaza at 4 AND the bank at 5 —
      // both substitute strikes on a single borrowed road.
      routeId: "relaySpur",
      label: "Relay spur (plaza at 4, bank at 5)",
      waypoints: [
        { locationId: "relayYard" },
        { locationId: "gatePath" },
        { locationId: "plazaApproach" },
        {
          locationId: "wetPlaza",
          surface: { kind: "dynamic", sourceEntityId: "stormPump" },
          skidHazard: true,
          adjacentBellId: "towerBell",
        },
        {
          locationId: "wetBank",
          surface: { kind: "dynamic", sourceEntityId: "stormPump" },
          skidHazard: true,
          adjacentBellId: "harborBell",
        },
        { locationId: "relayDepot", isDestination: true },
      ],
    },
    {
      routeId: "errandLoop",
      label: "Errand loop",
      waypoints: [
        { locationId: "garthYard" },
        { locationId: "millLane" },
        { locationId: "bakeryRow" },
        { locationId: "spareDepot", isDestination: true },
      ],
    },
  ],

  sockets: [
    {
      // Tempting and wrong: the finch strikes at 4 AND re-rings through
      // the sealed post-strike silence — OBS-QUIET kills it.
      socketId: "towerSocket",
      accepts: ["PlaceAndArmToy"],
      linkedBellId: "towerBell",
      locationId: "towerGreen",
    },
    {
      // Legal here: the harbor bell has no sealed silence, so the parked
      // finch's re-rings still cover the beat-5 strike.
      socketId: "harborSocket",
      accepts: ["PlaceAndArmToy"],
      linkedBellId: "harborBell",
      locationId: "quayWatch",
    },
  ],

  actors: [
    {
      entityId: "rocketCart",
      kind: "trolley",
      startBeat: 1,
      defaultRouteId: "dawnRoad",
      cargoField: "fireworks",
    },
    {
      entityId: "mayorCart",
      kind: "trolley",
      startBeat: 1,
      defaultRouteId: "civicLoop",
      cargoField: "proclamation",
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

  // The toy costs 2 (it is the expensive substitute); redirects are 1.
  // Budget 5 per the finale brief.
  interventionCosts: {
    RedirectJunction: 1,
    SetValve: 1,
    SetMechanismDelay: 1,
    ScheduleActivation: 1,
    RepositionProp: 1,
    PlaceAndArmToy: 2,
  },
  interventionBudget: 5,

  sealedObservations: [
    {
      // Stage A: the rocket cart crossed the mill bridge at 2.
      id: "OBS-BRIDGE",
      form: "AtCrossing",
      entityId: "rocketCart",
      crossingId: "millBridge",
      beat: 2,
    },
    {
      // Stage A: the mayor's cart crossed the civic arch at 2.
      id: "OBS-ARCH",
      form: "AtCrossing",
      entityId: "mayorCart",
      crossingId: "civicArch",
      beat: 2,
    },
    {
      // Stage B: the tower bell struck at 4.
      id: "OBS-TOWER",
      form: "EventOccurred",
      entityId: "towerBell",
      eventType: "BellRing",
      beat: 4,
    },
    {
      // Stage B: the harbor bell struck at 5.
      id: "OBS-HARBOR",
      form: "EventOccurred",
      entityId: "harborBell",
      eventType: "BellRing",
      beat: 5,
    },
    {
      // Stage C: the tower bell was silent for the rest of the day.
      id: "OBS-QUIET",
      form: "EventAbsent",
      entityId: "towerBell",
      eventType: "BellRing",
      fromBeat: 5,
      toBeat: 8,
    },
    {
      // Stage C: the green camera saw the mayor's cart arrive at 7.
      id: "OBS-GREEN",
      form: "VisibleFrom",
      entityId: "mayorCart",
      cameraRegionId: "greenCam",
      beat: 7,
    },
  ],

  desiredOutcomes: [
    {
      id: "OUT-POWDER",
      form: "EntityStateAtEnd",
      entityId: "rocketCart",
      field: "fireworks",
      value: "intact",
    },
    {
      id: "OUT-PROCLAMATION",
      form: "EntityStateAtEnd",
      entityId: "mayorCart",
      field: "proclamation",
      value: "intact",
    },
    {
      // The celebration itself: the rocket cart must actually stand on
      // the green when the day ends — intact alone is not a festival.
      id: "OUT-CEREMONY",
      form: "EntityStateAtEnd",
      entityId: "rocketCart",
      field: "position",
      value: "celebrationGreen",
    },
  ],

  hints: [
    "Three stages are sealed: the morning crossings at 2, the two bell strikes at 4 and 5, and the evening — the mayor on camera at the green while the tower bell stays silent. Both skids can vanish, but every stage's record must still read the same.",
    "Each bell needs a beat-exact substitute. The finch strikes its socket's bell at 4 — and keeps ringing, which the tower's sealed silence forbids. The harbor bell has no such silence: a parked finch still covers beat 5.",
    "The sweeper and the spare cart are both empty and movable. One borrowed road can skid the plaza at 4 and the bank at 5 — or give each crew its own leg. The storm pump feeds both tiles; closing it silences both bells.",
  ],

  designNote:
    "Finale integrating every taught mechanic in three connected stages. Stage A: two recorded morning crossings pin both carts' identities. Stage B: two skid-accidents ring two bells at beats 4 and 5 — cause substitution required twice. Stage C: a sealed post-strike silence on the tower bell (timing/interval evidence) plus the celebration camera's view of the mayor's arrival (viewpoint evidence). Resource reuse is the efficient play: ONE cart on the relay spur skids both wet tiles at their recorded beats (3/5), echoing TRS-11's single-prop interaction. The alternates are genuinely different allocations: TOY-HARBOR (5/5) pairs a crew skid with the finch parked at the harbor socket — legal only because the harbor bell has no sealed silence, deliberately inverting TRS-08's veto; TWO-CREW (4/5) splits the substitute labor across both empty carts. The tower socket is the designed trap (re-rings through the quiet); the shared storm pump is the catastrophic one (both bells die together). Outcomes complete the story: intact cargo plus the rocket cart physically standing on the celebration green.",
};

export const TRS12_CARD = {
  winningTraceSummary:
    "RELAY (3/5): dawn detour + civic detour + spareSwitch→relaySpur — one cart skids the plaza at 4 and the bank at 5. TOY-HARBOR (5/5): both detours + sweeper on the plaza spur + finch at the harbor socket (parked re-rings cover beat 5). TWO-CREW (4/5): both detours + sweeper on the plaza spur + spare on the bank spur.",
  strategySignatures: [
    "relay-single-borrowed-road: dawnDetour + civicDetour + spareSwitch→relaySpur",
    "toy-harbor-skid-tower: dawnDetour + civicDetour + sweepSwitch→plazaSpur + PlaceAndArmToy(harborSocket)",
    "two-crew-split: dawnDetour + civicDetour + sweepSwitch→plazaSpur + spareSwitch→bankSpur",
    "dual-carrier relay space: relaySpur admits either crew plus cross-assigned spur swings — 14 minimal solves, the finale's vocabulary check (policy: open)",
  ],
  wrongApproaches: [
    "The finch at the tower socket rings at 4 and keeps ringing — it breaks the sealed evening silence while looking like the obvious substitute.",
    "Closing the storm pump dries both tiles at once: fireworks and proclamation safe, both sealed strikes gone.",
    "The dawn detour alone protects the fireworks but the tower bell never strikes — and the mayor's cart still skids at 5.",
    "Sending the relay cart without the detours rings both bells correctly and still grinds both cargoes into the skids — the record was never the whole problem.",
    "Covering only the tower bell leaves the harbor silent at 5; covering only the harbor leaves the tower silent at 4.",
    "Delaying the rocket cart drags its plaza skid to beat 5 — the wrong strike, inside the sealed silence, and the bridge crossing moves too.",
  ],
  coopNote:
    "Finale four-person map: (1) stage-A evidence — verify both morning crossings survive any route change; (2) stage-B substitute ownership — one player per bell, choosing skid vs finch independently; (3) stage-C verifier — reads the quiet interval and the green camera on the repaired replay in parallel with stage-B work; (4) budget/dispatch — allocates the 5-point plan across the crew's chosen strategy and reconciles which empty cart owns which spur.",
};
