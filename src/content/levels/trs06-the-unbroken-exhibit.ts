/**
 * TRS-06 The Unbroken Exhibit (master TRS-D row 6).
 *
 * Lesson: familiar tools can offer more than one causal substitute.
 * The exhibit cart's ride was recorded four ways: the museum-arch
 * crossing at 3, EXACTLY ONE gallery-bell ring at 4, the grand-staircase
 * position at 5, and the porter cart's service-gate crossing at 2. The
 * flooded marble both supplies that single ring (a skid) and ruins the
 * porcelain orb. Two different fixtures can stand in for the lost cause:
 * the wind-up wren can strike the bell, or the empty porter cart can be
 * sent to absorb the skid — either way the record still hears ONE ring.
 */
import type { CaseDefinition } from "../../engine/trs/types.js";

export const TRS06: CaseDefinition = {
  levelId: "trs-06",
  title: "The Unbroken Exhibit",
  chapter: 2,
  horizonBeats: 8,

  entities: [
    {
      entityId: "exhibitCart",
      kind: "trolley",
      name: "Exhibit Cart",
      initial: { porcelainOrb: "intact", armed: true },
    },
    {
      entityId: "porterCart",
      kind: "trolley",
      name: "Porter Cart",
      // Empty: it can absorb the flooded-marble skid with no cargo to ruin.
      initial: { armed: true },
    },
    {
      entityId: "sprinklerHouse",
      kind: "fountain",
      name: "Sprinkler House",
      initial: { running: true },
    },
    {
      entityId: "galleryBell",
      kind: "bell",
      name: "Gallery Bell",
      initial: {},
    },
    {
      // Decoy bell: the annex bell is not the bell the archive counted.
      entityId: "annexBell",
      kind: "bell",
      name: "Annex Bell",
      initial: {},
    },
    {
      entityId: "museumArch",
      kind: "arch",
      name: "Museum Arch",
      initial: {},
    },
    {
      entityId: "grandStaircase",
      kind: "fixture",
      name: "Grand Staircase",
      initial: {},
    },
    {
      entityId: "serviceGate",
      kind: "fixture",
      name: "Service Gate",
      initial: {},
    },
    {
      // The lesson prop: shoving a crate onto the marble 'to soak up the
      // impact' moves a locationId — props absorb nothing in the record.
      entityId: "bufferCrate",
      kind: "fixture",
      name: "Buffer Crate",
      initial: { locationId: "crateBay" },
    },
    {
      entityId: "exhibitSwitch",
      kind: "junction",
      name: "Exhibit Switch",
      initial: { controlsRouteOf: "galleryRoute", routeId: "galleryRoute" },
    },
    {
      entityId: "porterSwitch",
      kind: "junction",
      name: "Porter Switch",
      initial: { controlsRouteOf: "serviceLoop", routeId: "serviceLoop" },
    },
    {
      entityId: "windUpWren",
      kind: "windUpToy",
      name: "Wind-up Wren",
      initial: { armed: false },
    },
    {
      entityId: "galleryNave",
      kind: "destination",
      name: "Gallery Nave",
      initial: {},
    },
  ],

  routes: [
    {
      // Original: arch at 3, wet-marble skid + the one recorded ring + the
      // ruined orb at 4, grand staircase at 5, nave at 7.
      routeId: "galleryRoute",
      label: "Gallery route (flooded marble)",
      waypoints: [
        { locationId: "convoyYard" },
        { locationId: "colonnadeWest" },
        { locationId: "museumArch", crossingId: "museumArch" },
        {
          locationId: "floodedMarble",
          surface: { kind: "dynamic", sourceEntityId: "sprinklerHouse" },
          skidHazard: true,
          adjacentBellId: "galleryBell",
        },
        { locationId: "grandStaircase" },
        { locationId: "exhibitLobby" },
        { locationId: "galleryNave", isDestination: true },
      ],
    },
    {
      // Dry cloister: same prefix through the arch, rejoins at the
      // staircase by beat 5, same destination on the same beat.
      routeId: "cloisterDetour",
      label: "Cloister detour (dry)",
      waypoints: [
        { locationId: "convoyYard" },
        { locationId: "colonnadeWest" },
        { locationId: "museumArch", crossingId: "museumArch" },
        { locationId: "cloisterPath", surface: { kind: "dry" } },
        { locationId: "grandStaircase" },
        { locationId: "exhibitLobby" },
        { locationId: "galleryNave", isDestination: true },
      ],
    },
    {
      routeId: "serviceLoop",
      label: "Service loop",
      waypoints: [
        { locationId: "depotYard" },
        { locationId: "serviceGate", crossingId: "serviceGate" },
        { locationId: "kitchenHall" },
        { locationId: "laundryCourt" },
        { locationId: "cellarRamp" },
        { locationId: "porterDepot", isDestination: true },
      ],
    },
    {
      // Porter's alternate: keeps the recorded gate crossing at 2, then
      // crosses the flooded marble at beat 4 — taking the skid itself.
      routeId: "marbleSpur",
      label: "Marble spur (wet)",
      waypoints: [
        { locationId: "depotYard" },
        { locationId: "serviceGate", crossingId: "serviceGate" },
        { locationId: "marbleApproach" },
        {
          locationId: "floodedMarble",
          surface: { kind: "dynamic", sourceEntityId: "sprinklerHouse" },
          skidHazard: true,
          adjacentBellId: "galleryBell",
        },
        { locationId: "runoffWalk" },
        { locationId: "porterDepot", isDestination: true },
      ],
    },
  ],

  sockets: [
    {
      socketId: "gallerySocket",
      accepts: ["PlaceAndArmToy"],
      linkedBellId: "galleryBell",
      locationId: "gallerySteps",
    },
    {
      // Decoy: strikes the annex bell, which the record never counted.
      socketId: "annexSocket",
      accepts: ["PlaceAndArmToy"],
      linkedBellId: "annexBell",
      locationId: "annexCourt",
    },
  ],

  actors: [
    {
      entityId: "exhibitCart",
      kind: "trolley",
      startBeat: 1,
      defaultRouteId: "galleryRoute",
      cargoField: "porcelainOrb",
    },
    {
      entityId: "porterCart",
      kind: "carrier",
      startBeat: 1,
      defaultRouteId: "serviceLoop",
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
      // Beat 3: the exhibit cart crossed the museum arch.
      id: "OBS-ARCH",
      form: "AtCrossing",
      entityId: "exhibitCart",
      crossingId: "museumArch",
      beat: 3,
    },
    {
      // Beat 4: the gallery bell rang EXACTLY ONCE. Two simultaneous
      // strikes are not the recorded ring — a second absorber who joins
      // the exhibit's skid falsifies the count.
      id: "OBS-RING",
      form: "EventCount",
      entityId: "galleryBell",
      eventType: "BellRing",
      fromBeat: 4,
      toBeat: 4,
      count: 1,
    },
    {
      // Beat 5: the cart was already climbing the grand staircase — a
      // detour must rejoin by 5, not merely arrive eventually.
      id: "OBS-STAIR",
      form: "EntityAt",
      entityId: "exhibitCart",
      locationId: "grandStaircase",
      beat: 5,
    },
    {
      // Independent witness: the porter crossed the service gate at 2 —
      // its substitute route must keep that recorded opening.
      id: "OBS-PORTER",
      form: "AtCrossing",
      entityId: "porterCart",
      crossingId: "serviceGate",
      beat: 2,
    },
  ],

  desiredOutcomes: [
    {
      id: "OUT-ORB",
      form: "EntityStateAtEnd",
      entityId: "exhibitCart",
      field: "porcelainOrb",
      value: "intact",
    },
  ],

  hints: [
    "The flooded marble gives the record its single beat-4 ring and takes the orb in exchange. The bell does not care whose cause produced it — but the record counted exactly one ring.",
    "Two substitutes are legal: the wind-up wren strikes the bell beside the gallery socket on its fourth step, or the empty porter cart can be sent over the marble spur to skid at 4 — nothing onboard to ruin.",
    "Do not send the porter AND leave the exhibit on the marble: two skids ring the bell twice, and the record heard one. The crate cannot soak up a skid — it only changes where the crate is.",
  ],

  designNote:
    "One damaging cause (the flooded-marble skid) with TWO distinct substitutes, plus a third for mastery. (a) Redirect the impact: exhibit cart takes the dry cloister — arch@3 and staircase@5 both preserved — and the wind-up wren recreates the signal, striking the gallery bell once at 4. (b) Change what absorbs it: same cloister redirect, but the empty porter cart takes the marble spur and skids at 4 — a real skid produces the recorded single ring while the orb never touches water. (c) Remove the hazard: close the sprinkler house; the exhibit keeps its whole recorded route (every position identical) and the wren supplies the ring. OBS-RING is an EventCount of exactly 1 at beat 4 — so 'porter spur alone' fails on the FACTS (two skids ring twice) before it even fails the orb. Traps: detour or valve alone drops the count to zero; the annex socket rings the wrong bell; the buffer crate changes only its own locationId; delaying the exhibit breaks arch, ring, and staircase in one move.",
};

export const TRS06_CARD = {
  winningTraceSummary:
    "Substitute the ring: redirect the exhibit onto the dry cloister (arch@3, staircase@5 intact) + wind-up wren at the gallery socket strikes the bell once at 4. OR swap the absorber: cloister redirect + porter onto the marble spur so its skid rings the bell at 4. Both cost 2 of 3.",
  strategySignatures: [
    "toy-substitute: RedirectJunction(exhibitSwitch→cloisterDetour) + PlaceAndArmToy(gallerySocket)",
    "swap-the-absorber: RedirectJunction(exhibitSwitch→cloisterDetour) + RedirectJunction(porterSwitch→marbleSpur)",
    "remove-the-hazard: SetValve(sprinklerHouse,false) + PlaceAndArmToy(gallerySocket)",
  ],
  wrongApproaches: [
    "Sending the porter down the marble spur while the exhibit still rides the gallery route produces TWO skid-rings at beat 4 — the record counted exactly one; the fact fails before the orb does.",
    "The cloister detour alone or the closed sprinkler alone each dry the marble but drop the ring count to zero.",
    "The wind-up wren at the annex socket rings the annex bell — the gallery count stays zero.",
    "The buffer crate repositioned onto the marble soaks up nothing: every sealed fact still holds and the orb still breaks.",
    "Delaying the exhibit cart re-times the arch, the ring, and the staircase at once.",
  ],
  coopNote:
    "The toy-vs-porter argument is the level: one player prices the substitute striker, one audits the porter's preserved gate crossing, one verifies the ring count is exactly one, one owns the exhibit's rejoin by beat 5.",
};
