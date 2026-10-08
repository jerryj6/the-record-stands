/**
 * TRS-07 The Wrong Delivery (master TRS-D row 7).
 *
 * Lesson: a recorded carrier route need not determine its unrecorded
 * cargo history. The archive logged WHERE the two carriers went —
 * the post trolley over the sorting cross at 3 and through the handoff
 * platform at 5; the barge over the lock gate at 2 and through the same
 * platform at 6. It never logged what each carried. Both parcels were
 * aboard the right carriers all along; the routes were crossed at the
 * final junction. The legal fix moves carriers, never labels.
 */
import type { CaseDefinition } from "../../engine/trs/types.js";

export const TRS07: CaseDefinition = {
  levelId: "trs-07",
  title: "The Wrong Delivery",
  chapter: 3,
  horizonBeats: 8,

  entities: [
    {
      entityId: "postTrolley",
      kind: "trolley",
      name: "Post Trolley",
      // Carries the mayor's parcel. Identity stays put for the whole case —
      // nobody may relabel or swap cargo to fake the delivery.
      initial: { mayorParcel: "intact", armed: true },
    },
    {
      entityId: "bargeCart",
      kind: "trolley",
      name: "Barge Cart",
      // Carries the harbor parcel. Same rule: the parcel rides this cart.
      initial: { dockParcel: "intact", armed: true },
    },
    {
      entityId: "sortingBridge",
      kind: "fixture",
      name: "Sorting Bridge",
      initial: {},
    },
    {
      entityId: "lockGate",
      kind: "fixture",
      name: "Lock Gate",
      initial: {},
    },
    {
      entityId: "handoffPlatform",
      kind: "fixture",
      name: "Handoff Platform",
      initial: {},
    },
    {
      // The relabel trap: moving the parcel decal to the town hall steps
      // is exactly the 'edit the label' non-solution the case forbids.
      entityId: "parcelDecal",
      kind: "fixture",
      name: "Parcel Decal",
      initial: { locationId: "relayOffice" },
    },
    {
      entityId: "postSwitch",
      kind: "junction",
      name: "Post Switch",
      initial: { controlsRouteOf: "oldPostRoad", routeId: "oldPostRoad" },
    },
    {
      entityId: "bargeSwitch",
      kind: "junction",
      name: "Barge Switch",
      initial: { controlsRouteOf: "lockRun", routeId: "lockRun" },
    },
    {
      // Pure decoy: ringing the platform hand bell moves no parcels.
      entityId: "handBell",
      kind: "bell",
      name: "Platform Hand Bell",
      initial: {},
    },
    {
      entityId: "windUpToy",
      kind: "windUpToy",
      name: "Wind-up Dove",
      initial: { armed: false },
    },
    {
      entityId: "townHallSteps",
      kind: "destination",
      name: "Town Hall Steps",
      initial: {},
    },
    {
      entityId: "harborMasterQuay",
      kind: "destination",
      name: "Harbormaster's Quay",
      initial: {},
    },
  ],

  routes: [
    {
      // Original post route: recorded over the sorting cross at 3 and AT
      // the handoff platform at 5 — then wrongly ends at the quay at 7.
      routeId: "oldPostRoad",
      label: "Old post road (to the quay)",
      waypoints: [
        { locationId: "relayOffice" },
        { locationId: "canalWalk" },
        { locationId: "sortingCross", crossingId: "sortingCross" },
        { locationId: "millRow" },
        { locationId: "handoffPlatform" },
        { locationId: "harborLane" },
        { locationId: "harborMasterQuay", isDestination: true },
      ],
    },
    {
      // Civic fork: identical through the recorded platform at 5, then
      // the last leg swings to the town hall — where the parcel belongs.
      routeId: "postRoadCivic",
      label: "Post road, civic fork",
      waypoints: [
        { locationId: "relayOffice" },
        { locationId: "canalWalk" },
        { locationId: "sortingCross", crossingId: "sortingCross" },
        { locationId: "millRow" },
        { locationId: "handoffPlatform" },
        { locationId: "civicLane" },
        { locationId: "townHallSteps", isDestination: true },
      ],
    },
    {
      // The express fork: reaches the town hall — but skips the recorded
      // platform handoff entirely. Faster is not legal: the archive saw
      // the trolley AT the platform at beat 5.
      routeId: "postExpress",
      label: "Post express (skips the platform)",
      waypoints: [
        { locationId: "relayOffice" },
        { locationId: "canalWalk" },
        { locationId: "sortingCross", crossingId: "sortingCross" },
        { locationId: "bypassRamp" },
        { locationId: "civicLane" },
        { locationId: "townHallSteps", isDestination: true },
      ],
    },
    {
      // Original barge run: recorded over the lock gate at 2 and AT the
      // handoff platform at 6 — then wrongly ends at the town hall at 7.
      routeId: "lockRun",
      label: "Lock run (to the town hall)",
      waypoints: [
        { locationId: "boatYard" },
        { locationId: "lockGate", crossingId: "lockGate" },
        { locationId: "fishmarketRow" },
        { locationId: "pierFour" },
        { locationId: "customsPoint" },
        { locationId: "handoffPlatform" },
        { locationId: "townHallSteps", isDestination: true },
      ],
    },
    {
      // Harbor fork: identical through the recorded platform at 6, then
      // the last leg swings to the quay — where the dock parcel belongs.
      routeId: "lockRunHarbor",
      label: "Lock run, harbor fork",
      waypoints: [
        { locationId: "boatYard" },
        { locationId: "lockGate", crossingId: "lockGate" },
        { locationId: "fishmarketRow" },
        { locationId: "pierFour" },
        { locationId: "customsPoint" },
        { locationId: "handoffPlatform" },
        { locationId: "harborMasterQuay", isDestination: true },
      ],
    },
  ],

  sockets: [
    {
      socketId: "platformSocket",
      accepts: ["PlaceAndArmToy"],
      linkedBellId: "handBell",
      locationId: "platformEdge",
    },
  ],

  actors: [
    {
      entityId: "postTrolley",
      kind: "trolley",
      startBeat: 1,
      defaultRouteId: "oldPostRoad",
      cargoField: "mayorParcel",
    },
    {
      entityId: "bargeCart",
      kind: "carrier",
      startBeat: 1,
      defaultRouteId: "lockRun",
      cargoField: "dockParcel",
    },
  ],

  // Junctions cost 2: the repair is exactly two legal re-routings = 4/4.
  // Any spend on bells, screens, or delays makes the required pair unpayable.
  interventionCosts: {
    RedirectJunction: 2,
    SetValve: 1,
    SetMechanismDelay: 1,
    ScheduleActivation: 1,
    RepositionProp: 1,
    PlaceAndArmToy: 1,
  },
  interventionBudget: 4,

  sealedObservations: [
    {
      // The post trolley was recorded over the sorting cross at beat 3.
      id: "OBS-SORTING",
      form: "AtCrossing",
      entityId: "postTrolley",
      crossingId: "sortingCross",
      beat: 3,
    },
    {
      // The post trolley was physically AT the handoff platform at beat 5 —
      // the recorded handoff point, after its recorded crossing.
      id: "OBS-POST-PLATFORM",
      form: "EntityAt",
      entityId: "postTrolley",
      locationId: "handoffPlatform",
      beat: 5,
    },
    {
      // The barge was recorded through the lock gate at beat 2.
      id: "OBS-LOCK",
      form: "AtCrossing",
      entityId: "bargeCart",
      crossingId: "lockGate",
      beat: 2,
    },
    {
      // The barge was physically AT the same handoff platform at beat 6.
      id: "OBS-BARGE-PLATFORM",
      form: "EntityAt",
      entityId: "bargeCart",
      locationId: "handoffPlatform",
      beat: 6,
    },
  ],

  desiredOutcomes: [
    {
      // The mayor's parcel must reach its named recipient: the post
      // trolley ends the day at the town hall steps.
      id: "OUT-MAYOR",
      form: "EntityStateAtEnd",
      entityId: "postTrolley",
      field: "position",
      value: "townHallSteps",
    },
    {
      // The harbor parcel must reach its named recipient: the barge ends
      // the day at the harbormaster's quay.
      id: "OUT-DOCK",
      form: "EntityStateAtEnd",
      entityId: "bargeCart",
      field: "position",
      value: "harborMasterQuay",
    },
  ],

  hints: [
    "The archive recorded the carriers' routes, not their cargo. Both parcels were on the right carriers the whole time — the wrongness is only in where each route finished.",
    "A legal handoff must stay physically visible: the post trolley was AT the handoff platform at beat 5 and the barge at beat 6. Any route that skips the platform — however direct — contradicts the record.",
    "Neither parcel needs relabeling. Each carrier needs its final junction: the post switch to the civic fork after the platform, the barge switch to the harbor fork after the platform. Two junctions, four cost, nothing spare.",
  ],

  designNote:
    "The first case whose failed outcome is a DESTINATION, not a ruined cargo: the original run satisfies every recorded fact while both parcels arrive at the wrong recipients — the record constrains routes and handoffs, never cargo history. The repair is exactly two legal re-routings: postTrolley takes the civic fork (identical through the recorded sorting cross@3 and platform@5, then town hall) and bargeCart takes the harbor fork (identical through lockGate@2 and platform@6, then the quay) — cost exactly 4 of 4. Traps: the express fork reaches the right dock but skips the platform the archive recorded; putting the post trolley on the barge's road loses BOTH of its recorded facts; moving the parcel decal is the forbidden label-edit — all observations still pass and both outcomes still fail; ringing the platform hand bell delivers nothing; one junction alone fixes one recipient and leaves the other wrong; delaying either carrier re-times its crossing and its platform.",
};

export const TRS07_CARD = {
  winningTraceSummary:
    "Two junctions: postSwitch → postRoadCivic (post trolley keeps sorting cross@3 and the platform@5, finishes at the town hall steps) and bargeSwitch → lockRunHarbor (barge keeps lock gate@2 and the platform@6, finishes at the harbormaster's quay). Cost: 4 of 4 — nothing else is payable.",
  wrongApproaches: [
    "The post express reaches the town hall a beat early but never touches the handoff platform — the archive recorded the trolley there at beat 5.",
    "Redirecting the post trolley onto the barge's harbor road erases BOTH of its recorded facts — no sorting cross, no platform at 5.",
    "Moving the parcel decal to the town hall is a label edit: every observation still passes, both parcels still arrive wrong.",
    "Fixing only one junction delivers one parcel and strands the other — both outcomes are independently load-bearing.",
    "Arming the dove at the platform socket rings the hand bell, which moves no parcels.",
    "Delaying either carrier shifts its recorded crossing and its platform beat.",
  ],
  coopNote:
    "Four real jobs under a 4-cost budget: post-route evidence (sorting cross + platform@5), barge-route evidence (lock gate + platform@6), destination audit (which dock each carrier legally ends at), and budget discipline — any bell or decal spend kills the required pair.",
};
