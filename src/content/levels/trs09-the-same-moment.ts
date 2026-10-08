/**
 * TRS-09 The Same Moment (master TRS-D row 9).
 *
 * Lesson: several facts must hold simultaneously. Two procession carts —
 * the north and south twins — each skid at beat 4 on different wet tiles,
 * ringing different bells and ruining different vases, all on the same
 * beat. Both skids must vanish and BOTH bells must still ring at 4: two
 * substitute causes coordinated to the same beat. A substitute that fires
 * a beat early or late is a sequential near-miss — the record heard the
 * pair at 4, not a promise to ring eventually.
 */
import type { CaseDefinition } from "../../engine/trs/types.js";

export const TRS09: CaseDefinition = {
  levelId: "trs-09",
  title: "The Same Moment",
  chapter: 3,
  horizonBeats: 8,

  entities: [
    {
      entityId: "__world",
      kind: "generic",
      name: "Archive Cameras",
      // Two gallery cameras: north watches the north procession, south the
      // south one. Both saw their carts at beat 5 — on the steps each
      // route still holds after the repair.
      initial: {
        cameraRegions: {
          northCam: [
            "triumphalArch",
            "northCloister",
            "wetTerrace",
            "grandSteps",
            "unionPlaza",
            "palaceHall",
          ],
          southCam: [
            "festivalArch",
            "southGallery",
            "wetQuay",
            "harborSteps",
            "unionPlaza",
            "palaceHall",
          ],
        },
      },
    },
    {
      entityId: "carrierA",
      kind: "trolley",
      name: "North Procession Cart",
      initial: { vaseNorth: "intact", armed: true },
    },
    {
      entityId: "carrierB",
      kind: "trolley",
      name: "South Procession Cart",
      initial: { vaseSouth: "intact", armed: true },
    },
    {
      entityId: "pageCart",
      kind: "trolley",
      name: "Page Cart",
      // Empty: can take the wet-terrace skid for the north bell.
      initial: { armed: true },
    },
    {
      entityId: "usherCart",
      kind: "trolley",
      name: "Usher Cart",
      // Empty: can take the wet-quay skid for the south bell.
      initial: { armed: true },
    },
    {
      entityId: "stormMain",
      kind: "fountain",
      name: "Storm Main",
      // One feed for BOTH wet tiles: one valve silences two bells at once.
      initial: { running: true },
    },
    {
      entityId: "northBell",
      kind: "bell",
      name: "North Bell",
      initial: {},
    },
    {
      entityId: "southBell",
      kind: "bell",
      name: "South Bell",
      initial: {},
    },
    {
      entityId: "northSwitch",
      kind: "junction",
      name: "North Switch",
      initial: { controlsRouteOf: "northRoute", routeId: "northRoute" },
    },
    {
      entityId: "southSwitch",
      kind: "junction",
      name: "South Switch",
      initial: { controlsRouteOf: "southRoute", routeId: "southRoute" },
    },
    {
      entityId: "pageSwitch",
      kind: "junction",
      name: "Page Switch",
      initial: { controlsRouteOf: "pageLoop", routeId: "pageLoop" },
    },
    {
      entityId: "usherSwitch",
      kind: "junction",
      name: "Usher Switch",
      initial: { controlsRouteOf: "usherLoop", routeId: "usherLoop" },
    },
    {
      entityId: "windUpToy",
      kind: "windUpToy",
      name: "Wind-up Swallow",
      initial: { armed: false },
    },
    {
      entityId: "palaceHall",
      kind: "destination",
      name: "Palace Hall",
      initial: {},
    },
  ],

  routes: [
    {
      // North twin's original ride: arch at 3, wet-terrace skid at 4
      // (north bell + ruined vase), grand steps at 5, union at 6.
      routeId: "northRoute",
      label: "North route (wet terrace)",
      waypoints: [
        { locationId: "northGate" },
        { locationId: "northBridge" },
        { locationId: "triumphalArch", crossingId: "triumphalArch" },
        {
          locationId: "wetTerrace",
          surface: { kind: "dynamic", sourceEntityId: "stormMain" },
          skidHazard: true,
          adjacentBellId: "northBell",
        },
        { locationId: "grandSteps" },
        { locationId: "unionPlaza" },
        { locationId: "palaceHall", isDestination: true },
      ],
    },
    {
      // North bypass: same beats, dry cloister at 4.
      routeId: "northBypass",
      label: "North bypass (dry cloister)",
      waypoints: [
        { locationId: "northGate" },
        { locationId: "northBridge" },
        { locationId: "triumphalArch", crossingId: "triumphalArch" },
        { locationId: "northCloister", surface: { kind: "dry" } },
        { locationId: "grandSteps" },
        { locationId: "unionPlaza" },
        { locationId: "palaceHall", isDestination: true },
      ],
    },
    {
      // The off-camera trap: dry, on time, but the cart spends beat 5 on
      // the vault stairs — outside the north camera's region.
      routeId: "northCellar",
      label: "North cellar route (off camera)",
      waypoints: [
        { locationId: "northGate" },
        { locationId: "northBridge" },
        { locationId: "triumphalArch", crossingId: "triumphalArch" },
        { locationId: "cellarPassage", surface: { kind: "dry" } },
        { locationId: "vaultStairs" },
        { locationId: "unionPlaza" },
        { locationId: "palaceHall", isDestination: true },
      ],
    },
    {
      // South twin's original ride: festival arch at 3, wet-quay skid at 4
      // (south bell + ruined vase), harbor steps at 5, union at 6.
      routeId: "southRoute",
      label: "South route (wet quay)",
      waypoints: [
        { locationId: "southGate" },
        { locationId: "riverStairs" },
        { locationId: "festivalArch", crossingId: "festivalArch" },
        {
          locationId: "wetQuay",
          surface: { kind: "dynamic", sourceEntityId: "stormMain" },
          skidHazard: true,
          adjacentBellId: "southBell",
        },
        { locationId: "harborSteps" },
        { locationId: "unionPlaza" },
        { locationId: "palaceHall", isDestination: true },
      ],
    },
    {
      // South bypass: same beats, dry gallery at 4.
      routeId: "southBypass",
      label: "South bypass (dry gallery)",
      waypoints: [
        { locationId: "southGate" },
        { locationId: "riverStairs" },
        { locationId: "festivalArch", crossingId: "festivalArch" },
        { locationId: "southGallery", surface: { kind: "dry" } },
        { locationId: "harborSteps" },
        { locationId: "unionPlaza" },
        { locationId: "palaceHall", isDestination: true },
      ],
    },
    {
      routeId: "pageLoop",
      label: "Page loop",
      waypoints: [
        { locationId: "kennelYard" },
        { locationId: "millstone" },
        { locationId: "marketStairs" },
        { locationId: "pageDepot", isDestination: true },
      ],
    },
    {
      // Page's substitute leg: skids the wet terrace at beat 4.
      routeId: "terraceSpur",
      label: "Terrace spur (skid at 4)",
      waypoints: [
        { locationId: "kennelYard" },
        { locationId: "millstone" },
        { locationId: "terraceApproach" },
        {
          locationId: "wetTerrace",
          surface: { kind: "dynamic", sourceEntityId: "stormMain" },
          skidHazard: true,
          adjacentBellId: "northBell",
        },
        { locationId: "pageDepot", isDestination: true },
      ],
    },
    {
      // Sequential near-miss: the same skid one beat EARLY.
      routeId: "terraceEarly",
      label: "Terrace early (skid at 3)",
      waypoints: [
        { locationId: "kennelYard" },
        { locationId: "terraceApproach" },
        {
          locationId: "wetTerrace",
          surface: { kind: "dynamic", sourceEntityId: "stormMain" },
          skidHazard: true,
          adjacentBellId: "northBell",
        },
        { locationId: "pageDepot", isDestination: true },
      ],
    },
    {
      routeId: "usherLoop",
      label: "Usher loop",
      waypoints: [
        { locationId: "dockOffice" },
        { locationId: "ferryRow" },
        { locationId: "candleLane" },
        { locationId: "usherDepot", isDestination: true },
      ],
    },
    {
      // Usher's substitute leg: skids the wet quay at beat 4.
      routeId: "quaySpur",
      label: "Quay spur (skid at 4)",
      waypoints: [
        { locationId: "dockOffice" },
        { locationId: "ferryRow" },
        { locationId: "quayApproach" },
        {
          locationId: "wetQuay",
          surface: { kind: "dynamic", sourceEntityId: "stormMain" },
          skidHazard: true,
          adjacentBellId: "southBell",
        },
        { locationId: "usherDepot", isDestination: true },
      ],
    },
    {
      // Sequential near-miss: the same skid one beat LATE.
      routeId: "quayLate",
      label: "Quay late (skid at 5)",
      waypoints: [
        { locationId: "dockOffice" },
        { locationId: "ferryRow" },
        { locationId: "quayApproach" },
        { locationId: "restLanding" },
        {
          locationId: "wetQuay",
          surface: { kind: "dynamic", sourceEntityId: "stormMain" },
          skidHazard: true,
          adjacentBellId: "southBell",
        },
        { locationId: "usherDepot", isDestination: true },
      ],
    },
  ],

  sockets: [
    {
      socketId: "northSocket",
      accepts: ["PlaceAndArmToy"],
      linkedBellId: "northBell",
      locationId: "northColonnade",
    },
    {
      socketId: "southSocket",
      accepts: ["PlaceAndArmToy"],
      linkedBellId: "southBell",
      locationId: "southColonnade",
    },
  ],

  actors: [
    {
      entityId: "carrierA",
      kind: "trolley",
      startBeat: 1,
      defaultRouteId: "northRoute",
      cargoField: "vaseNorth",
    },
    {
      entityId: "carrierB",
      kind: "trolley",
      startBeat: 1,
      defaultRouteId: "southRoute",
      cargoField: "vaseSouth",
    },
    {
      entityId: "pageCart",
      kind: "carrier",
      startBeat: 1,
      defaultRouteId: "pageLoop",
    },
    {
      entityId: "usherCart",
      kind: "carrier",
      startBeat: 1,
      defaultRouteId: "usherLoop",
    },
  ],

  // Every tool costs 1 and the pair always needs exactly four moves:
  // two carrier bypasses + two beat-4 substitutes (any mix of toy strike
  // and sacrificial skid).
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
      // Same beat, fact 1: the north bell rang at 4.
      id: "OBS-BELL-N",
      form: "EventOccurred",
      entityId: "northBell",
      eventType: "BellRing",
      beat: 4,
    },
    {
      // Same beat, fact 2: the south bell rang at 4.
      id: "OBS-BELL-S",
      form: "EventOccurred",
      entityId: "southBell",
      eventType: "BellRing",
      beat: 4,
    },
    {
      id: "OBS-ARCH-N",
      form: "AtCrossing",
      entityId: "carrierA",
      crossingId: "triumphalArch",
      beat: 3,
    },
    {
      // North camera saw its cart at beat 5.
      id: "OBS-VIEW-N",
      form: "VisibleFrom",
      entityId: "carrierA",
      cameraRegionId: "northCam",
      beat: 5,
    },
    {
      // South camera saw its cart at beat 5.
      id: "OBS-VIEW-S",
      form: "VisibleFrom",
      entityId: "carrierB",
      cameraRegionId: "southCam",
      beat: 5,
    },
  ],

  desiredOutcomes: [
    {
      id: "OUT-VASE-N",
      form: "EntityStateAtEnd",
      entityId: "carrierA",
      field: "vaseNorth",
      value: "intact",
    },
    {
      id: "OUT-VASE-S",
      form: "EntityStateAtEnd",
      entityId: "carrierB",
      field: "vaseSouth",
      value: "intact",
    },
  ],

  hints: [
    "Two skids on the same beat produced two recorded rings — and broke two vases. The repair must remove both skids and still give beat 4 a north ring AND a south ring; a beat early or late is a different record.",
    "Each bell has two legal substitutes: the swallow strikes its socket's bell on the fourth step, or an empty cart can be sent to skid that tile at beat 4 — the page for the terrace, the usher for the quay.",
    "One swallow cannot cover both bells, and the page's terrace-early and the usher's quay-late routes skid off the recorded beat. The storm main feeds both tiles at once — closing it saves both vases and kills both rings.",
  ],

  designNote:
    "Simultaneity case: two carrier skids at the same beat 4 (north terrace, south quay — one shared storm main) supply two sealed rings and two ruined vases; both cameras saw the carts at beat 5. Repair always needs four moves on a budget of 4: both carrier bypasses plus two beat-4 substitute causes. Three verified allocations: toy→north bell + usher skid→south quay; toy→south + page skid→north terrace; or both sacrificial skids and no toy at all. Designed failures isolate single predicates: terrace-early and quay-late spurs produce the right ring one beat off (OBS-BELL-N / OBS-BELL-S alone fails — the sequential near-miss the brief demands); the cellar route is dry and on time but off the north camera (OBS-VIEW-N alone fails); closing the storm main saves both vases and silences both bells at once; detours without substitutes drop both ring facts.",
};

export const TRS09_CARD = {
  winningTraceSummary:
    "Bypass both carriers (northBypass, southBypass — arches at 3, camera views at 5 preserved), then coordinate two beat-4 substitutes: wind-up swallow at one colonnade socket + the opposite empty cart skidding its tile at 4 — or both sacrificial skids, no toy. Every valid plan costs exactly 4 of 4.",
  strategySignatures: [
    "toy-north+usher-skid: northBypass + southBypass + PlaceAndArmToy(northSocket) + usherSwitch→quaySpur",
    "toy-south+page-skid: northBypass + southBypass + PlaceAndArmToy(southSocket) + pageSwitch→terraceSpur",
    "two-skids-no-toy: northBypass + southBypass + pageSwitch→terraceSpur + usherSwitch→quaySpur",
  ],
  wrongApproaches: [
    "The terrace-early spur rings the north bell at 3 and the quay-late spur at 5 — right cause, wrong beat: the recorded same-beat pair fails alone.",
    "Bypasses without substitutes drop both bells — the record heard two rings at 4, not zero.",
    "One swallow covers one bell; the other stays silent.",
    "The north cellar route is dry and arrives on time, but the cart is off the north camera at beat 5 — OBS-VIEW-N fails alone.",
    "Closing the storm main dries both tiles: both vases safe, both sealed rings gone — one shared feed, two broken facts.",
  ],
  coopNote:
    "Built for four: (1) north-camera evidence owner — arch@3 + northCam view@5; (2) south-camera owner — southCam view@5 + the south bell; (3) substitute-intervention owners — one player per chain (toy socket vs sacrificial spur), each independently load-bearing; (4) parallel verifier — replays the plan per region and audits that the beat-4 pair still lands together. Every contribution type is distinct and any one of them can catch a different failure.",
};
