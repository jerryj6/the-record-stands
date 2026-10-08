/**
 * TRS-02 The Late Lantern (master TRS-D row 2).
 *
 * Lesson: timing can change AFTER a required observation has occurred.
 * The lantern cart's beat-3 river-arch crossing is sealed; the ruin happens
 * later, on the wet fountain cobbles at beat 4, where the skid also rings
 * the signal bell. Repair must keep the early passage, avoid the late
 * collision, and replace the bell trigger the repair removes.
 */
import type { CaseDefinition } from "../../engine/trs/types.js";

export const TRS02: CaseDefinition = {
  levelId: "trs-02",
  title: "The Late Lantern",
  chapter: 1,
  horizonBeats: 8,

  entities: [
    {
      entityId: "lanternCart",
      kind: "trolley",
      name: "Lantern Cart",
      // armed: the cart is wound for a scheduled departure, so
      // SetMechanismDelay can (incorrectly) postpone its whole route.
      initial: { lantern: "intact", armed: true },
    },
    {
      entityId: "fountain",
      kind: "fountain",
      name: "North Fountain",
      initial: { running: true },
    },
    {
      entityId: "signalBell",
      kind: "bell",
      name: "Signal Bell",
      initial: {},
    },
    {
      entityId: "riverArch",
      kind: "arch",
      name: "River Arch",
      initial: {},
    },
    {
      entityId: "routeSwitch",
      kind: "junction",
      name: "Depot Switch",
      initial: { controlsRouteOf: "paradeLane", routeId: "paradeLane" },
    },
    {
      entityId: "windUpToy",
      kind: "windUpToy",
      name: "Wind-up Sparrow",
      initial: { armed: false },
    },
    {
      entityId: "deliveryDock",
      kind: "destination",
      name: "Delivery Dock",
      initial: {},
    },
  ],

  routes: [
    {
      // Original route: arch at beat 3, wet skid + bell + ruined lantern at 4.
      routeId: "paradeLane",
      label: "Parade lane (fountain cobbles)",
      waypoints: [
        { locationId: "townGate" },
        { locationId: "riverWalk" },
        { locationId: "riverArch", crossingId: "riverArch" },
        {
          locationId: "fountainCobbles",
          surface: { kind: "dynamic", sourceEntityId: "fountain" },
          skidHazard: true,
          adjacentBellId: "signalBell",
        },
        { locationId: "depotRamp" },
        { locationId: "dockApproach" },
        { locationId: "deliveryDock", isDestination: true },
      ],
    },
    {
      // Dry detour: identical through the recorded arch, then a dry tail of
      // the same length — the lantern still reaches the dock on beat 7.
      routeId: "serviceAlley",
      label: "Service alley (dry, same duration)",
      waypoints: [
        { locationId: "townGate" },
        { locationId: "riverWalk" },
        { locationId: "riverArch", crossingId: "riverArch" },
        { locationId: "alleyCobbles", surface: { kind: "dry" } },
        { locationId: "alleyNorth" },
        { locationId: "dockApproach" },
        { locationId: "deliveryDock", isDestination: true },
      ],
    },
  ],

  sockets: [
    {
      socketId: "bellSocket",
      accepts: ["PlaceAndArmToy"],
      linkedBellId: "signalBell",
      locationId: "plaza",
    },
  ],

  actors: [
    {
      entityId: "lanternCart",
      kind: "trolley",
      startBeat: 1,
      defaultRouteId: "paradeLane",
      cargoField: "lantern",
    },
  ],

  // Redirecting a whole route is the heavy move this level teaches;
  // priced at 2 so the reference repair lands exactly on budget.
  interventionCosts: {
    RedirectJunction: 2,
    SetValve: 1,
    SetMechanismDelay: 1,
    ScheduleActivation: 1,
    RepositionProp: 1,
    PlaceAndArmToy: 1,
  },
  interventionBudget: 3,

  sealedObservations: [
    {
      // The earlier passage: the lantern crossed the river arch at beat 3.
      id: "OBS-ARCH",
      form: "AtCrossing",
      entityId: "lanternCart",
      crossingId: "riverArch",
      beat: 3,
    },
    {
      // The later mechanism event: the signal bell rang at beat 4.
      id: "OBS-BELL",
      form: "EventOccurred",
      entityId: "signalBell",
      eventType: "BellRing",
      beat: 4,
    },
    {
      // The final state: the fountain was still running at beat 8.
      id: "OBS-FOUNTAIN",
      form: "StateEquals",
      entityId: "fountain",
      field: "running",
      value: true,
      beat: 8,
    },
  ],

  desiredOutcomes: [
    {
      id: "OUT-LANTERN",
      form: "EntityStateAtEnd",
      entityId: "lanternCart",
      field: "lantern",
      value: "intact",
    },
  ],

  hints: [
    "The archive keeps the river-arch crossing at beat 3 — the lantern cart must still pass it on time. The breaking happens one beat later, on the wet fountain cobbles.",
    "The depot switch sends the cart down the dry service alley, which shares the parade lane's first three beats. But the signal bell at beat 4 is a sealed fact: something must still ring it.",
    "The wind-up sparrow strikes the bell beside its launch socket on the fourth step of its armed path — the plaza socket is tied to the signal bell.",
  ],

  designNote:
    "Same skid-both-effects pattern as TRS-01, but the observed bell and the recorded crossing pin different beats of the SAME route. The dry service alley duplicates the route's first three waypoints so the beat-3 arch crossing survives while the beat-4 wet hazard is bypassed; the removed bell ring is re-supplied by the toy strike at beat 4. Designed traps: SetMechanismDelay postpones the whole route and visibly violates the earlier crossing (and re-times the skid); cutting the fountain falsifies the beat-8 running observation and silences the bell; arming the toy alone leaves the lantern ruined — a second ringer does not unload the cart.",
};

export const TRS02_CARD = {
  winningTraceSummary:
    "Redirect the lantern cart at the depot switch onto the dry service alley — the arch crossing still lands on beat 3, the wet cobbles at beat 4 are skipped — and arm the wind-up sparrow at the plaza socket so it strikes the signal bell on beat 4. Cost: 3 of 3.",
  wrongApproaches: [
    "Blanket-delaying the cart (SetMechanismDelay) moves the arch crossing to beat 4 — the sealed earlier passage visibly breaks, and the skid just happens one beat later.",
    "Cutting the fountain dries the cobbles and saves the lantern, but falsifies two sealed facts: 'fountain running at 8' and 'signal bell rang at 4'.",
    "Arming the toy without rerouting rings the bell at 4 while the cart still skids there — the record is satisfied and the lantern still breaks.",
    "Redirecting onto the dry alley alone protects the lantern but removes the beat-4 ring the archive heard.",
  ],
  coopNote:
    "Natural split: one player owns route timing (verify the arch stays at 3), another owns the substitute bell trigger; a third can audit the budget.",
};
