/**
 * TRS-04 The Shared Counterweight (master TRS-D row 4).
 *
 * Lesson: one prop can be needed by two causes at different times.
 * The counterweight cart is recorded doing three jobs on one ride:
 * crossing the lift plate at beat 3, ringing the belfry chime at beat 4
 * (the slick-grate skid — which also ruins the crystal it carries), and
 * exiting the yard gate at beat 7. Two fixtures — the lift plate and the
 * belfry — share this single moving resource. The repair must protect
 * the crystal while every recorded duty still happens.
 */
import type { CaseDefinition } from "../../engine/trs/types.js";

export const TRS04: CaseDefinition = {
  levelId: "trs-04",
  title: "The Shared Counterweight",
  chapter: 2,
  horizonBeats: 8,

  entities: [
    {
      entityId: "ballastCart",
      kind: "trolley",
      name: "Counterweight Cart",
      // The movable resource: carries the crystal AND serves the lift
      // plate crossing and the belfry strike on one schedule.
      initial: { crystalLoad: "intact", armed: true },
    },
    {
      entityId: "supplyCart",
      kind: "trolley",
      name: "Supply Cart",
      // Empty cart — it can take the grate skid without breaking cargo.
      initial: { armed: true },
    },
    {
      entityId: "cistern",
      kind: "fountain",
      name: "Roof Cistern",
      initial: { running: true },
    },
    {
      entityId: "belfryChime",
      kind: "bell",
      name: "Belfry Chime",
      initial: {},
    },
    {
      entityId: "chapelBell",
      kind: "bell",
      name: "Chapel Bell",
      initial: {},
    },
    {
      entityId: "liftPlate",
      kind: "fixture",
      name: "Lift Plate",
      initial: {},
    },
    {
      entityId: "yardGate",
      kind: "arch",
      name: "Yard Gate",
      initial: {},
    },
    {
      entityId: "tollBridge",
      kind: "fixture",
      name: "Toll Bridge",
      initial: {},
    },
    {
      entityId: "cartSwitch",
      kind: "junction",
      name: "Cart Switch",
      initial: { controlsRouteOf: "lowerCircuit", routeId: "lowerCircuit" },
    },
    {
      entityId: "supplySwitch",
      kind: "junction",
      name: "Supply Switch",
      initial: { controlsRouteOf: "marketLoop", routeId: "marketLoop" },
    },
    {
      entityId: "windUpToy",
      kind: "windUpToy",
      name: "Wind-up Beetle",
      initial: { armed: false },
    },
    {
      entityId: "chapelTerminus",
      kind: "destination",
      name: "Chapel Terminus",
      initial: {},
    },
  ],

  routes: [
    {
      // Counterweight's original circuit: plate at 3, wet grate skid + chime
      // at 4 (crystal ruined), yard gate at 7, terminus at 8.
      routeId: "lowerCircuit",
      label: "Lower circuit (via the slick grate)",
      waypoints: [
        { locationId: "counterweightDepot" },
        { locationId: "hoistRamp" },
        { locationId: "liftPlate", crossingId: "liftPlate" },
        {
          locationId: "slickGrate",
          surface: { kind: "dynamic", sourceEntityId: "cistern" },
          skidHazard: true,
          adjacentBellId: "belfryChime",
        },
        { locationId: "causeway" },
        { locationId: "gateApproach" },
        { locationId: "yardGate", crossingId: "yardGate" },
        { locationId: "chapelTerminus", isDestination: true },
      ],
    },
    {
      // Dry viaduct: keeps the plate and gate crossings, skips the grate.
      routeId: "upperCircuit",
      label: "Upper circuit (dry viaduct)",
      waypoints: [
        { locationId: "counterweightDepot" },
        { locationId: "hoistRamp" },
        { locationId: "liftPlate", crossingId: "liftPlate" },
        { locationId: "viaductWalk", surface: { kind: "dry" } },
        { locationId: "causeway" },
        { locationId: "gateApproach" },
        { locationId: "yardGate", crossingId: "yardGate" },
        { locationId: "chapelTerminus", isDestination: true },
      ],
    },
    {
      routeId: "marketLoop",
      label: "Market loop",
      waypoints: [
        { locationId: "supplyYard" },
        { locationId: "tollBridge", crossingId: "tollBridge" },
        { locationId: "marketRow" },
        { locationId: "marketSteps" },
        { locationId: "stallAlley" },
        { locationId: "supplyDepot", isDestination: true },
      ],
    },
    {
      // Supply's alternate: shares the toll-bridge opening, then crosses
      // the same slick grate at beat 4.
      routeId: "grateSpur",
      label: "Grate spur (wet)",
      waypoints: [
        { locationId: "supplyYard" },
        { locationId: "tollBridge", crossingId: "tollBridge" },
        { locationId: "grateApproach" },
        {
          locationId: "slickGrate",
          surface: { kind: "dynamic", sourceEntityId: "cistern" },
          skidHazard: true,
          adjacentBellId: "belfryChime",
        },
        { locationId: "runoffRow" },
        { locationId: "supplyDepot", isDestination: true },
      ],
    },
  ],

  sockets: [
    {
      socketId: "belfrySocket",
      accepts: ["PlaceAndArmToy"],
      linkedBellId: "belfryChime",
      locationId: "belfryFoot",
    },
    {
      // Decoy: the chapel bell is not the chime the archive heard.
      socketId: "chapelSocket",
      accepts: ["PlaceAndArmToy"],
      linkedBellId: "chapelBell",
      locationId: "chapelSteps",
    },
  ],

  actors: [
    {
      entityId: "ballastCart",
      kind: "trolley",
      startBeat: 1,
      defaultRouteId: "lowerCircuit",
      cargoField: "crystalLoad",
    },
    {
      entityId: "supplyCart",
      kind: "carrier",
      startBeat: 1,
      defaultRouteId: "marketLoop",
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
      // Duty 1 (beat 3): the counterweight crossed the lift plate.
      id: "OBS-PLATE",
      form: "AtCrossing",
      entityId: "ballastCart",
      crossingId: "liftPlate",
      beat: 3,
    },
    {
      // Duty 2 (beat 4): the belfry chime rang.
      id: "OBS-CHIME",
      form: "EventOccurred",
      entityId: "belfryChime",
      eventType: "BellRing",
      beat: 4,
    },
    {
      // Duty 3 (beat 7): the counterweight exited the yard gate.
      id: "OBS-GATE",
      form: "AtCrossing",
      entityId: "ballastCart",
      crossingId: "yardGate",
      beat: 7,
    },
    {
      // Independent witness: the supply cart crossed the toll bridge at 2.
      id: "OBS-BRIDGE",
      form: "AtCrossing",
      entityId: "supplyCart",
      crossingId: "tollBridge",
      beat: 2,
    },
  ],

  desiredOutcomes: [
    {
      id: "OUT-CRYSTAL",
      form: "EntityStateAtEnd",
      entityId: "ballastCart",
      field: "crystalLoad",
      value: "intact",
    },
  ],

  hints: [
    "The counterweight cart does every recorded job on one ride: the lift plate at beat 3, the belfry chime at beat 4, the yard gate at 7. The slick grate both rings the chime and ruins the crystal.",
    "You can keep the cart's whole recorded route if the grate is dry — the roof cistern feeds that slick. Or take the dry viaduct, but then the chime still owes a strike at beat 4.",
    "The chime does not care who strikes it — only the beat and the bell. The wind-up beetle rings it from the belfry socket, or the empty supply cart can be sent across the grate to skid at 4.",
  ],

  designNote:
    "Two fixtures share one moving resource: the lift plate and the belfry both depend on the same counterweight cart's schedule (beats 3 and 4), while its fragile crystal load rides along. Two substantively different repairs are verified. KEEP the counterweight on duty: close the roof cistern so the grate is dry (route, plate and gate untouched — the prop is reused for all its jobs) and replace the chime strike with the toy at the belfry socket. SPLIT the jobs: send the counterweight over the dry viaduct (plate and gate preserved) and give the chime job to the empty supply cart, redirected onto the grate spur so it skids at beat 4 — a different causal substitution for the same fact. Traps: drying the cistern alone or taking the viaduct alone each silences the chime (single-predicate failure); arming the toy alone leaves the skid that ruins the crystal; the chapel socket rings the wrong bell; delaying the counterweight breaks all three of its recorded duties at once.",
};

export const TRS04_CARD = {
  winningTraceSummary:
    "Keep: close the roof cistern (dry grate, whole recorded circuit intact) + arm the wind-up beetle at the belfry socket so it strikes the chime at beat 4. Split: redirect the counterweight onto the dry upper circuit (plate@3 and gate@7 preserved) + redirect the supply cart onto the grate spur so its skid rings the chime at beat 4. Both cost 2 of 3.",
  strategySignatures: [
    "keep-the-counterweight: SetValve(cistern,false) + PlaceAndArmToy(belfrySocket)",
    "split-the-jobs: RedirectJunction(cartSwitch→upperCircuit) + RedirectJunction(supplySwitch→grateSpur)",
  ],
  wrongApproaches: [
    "Closing the cistern alone dries the skid but silences the belfry chime at beat 4 — the record still heard it.",
    "Rerouting the counterweight onto the viaduct alone protects the crystal but removes the chime strike entirely.",
    "Arming the beetle alone rings the chime at 4 while the cart still skids there — the crystal is ruined by the same grate the record praises.",
    "Placing the beetle at the chapel socket rings the chapel bell, not the belfry chime — bell identity matters.",
    "Delaying the counterweight's departure moves the plate crossing to 4, the chime to 5, and the gate off the record — one prop, three broken duties.",
    "Redirecting only the supply cart onto the grate spur adds a second ringer but never unloads the crystal.",
  ],
  coopNote:
    "Rich co-op case: the keep-vs-split decision is a genuine argument; one player can own the counterweight's schedule, another the substitute strike, a third the supply cart's preserved bridge crossing.",
};
