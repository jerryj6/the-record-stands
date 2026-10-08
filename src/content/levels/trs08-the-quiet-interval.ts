/**
 * TRS-08 The Quiet Interval (master TRS-D row 8).
 *
 * Lesson: absence and time intervals can be explicit evidence.
 * The archive heard the vesper bell ring at beat 4 — and then recorded
 * SILENCE from beat 5 onward. The dusk cart's skid on the wet flagstones
 * produced that ring (and ruined the candle shipment). A parked wind-up
 * toy would ring the bell at 4… and at 5, 6, 7, 8, breaking the sealed
 * quiet. Only a one-shot skid — a sacrificial cart timed to beat 4 —
 * can stand in for the signal without lying about the silence.
 */
import type { CaseDefinition } from "../../engine/trs/types.js";

export const TRS08: CaseDefinition = {
  levelId: "trs-08",
  title: "The Quiet Interval",
  chapter: 3,
  horizonBeats: 8,

  entities: [
    {
      entityId: "duskCart",
      kind: "trolley",
      name: "Dusk Cart",
      initial: { candleShipment: "intact", armed: true },
    },
    {
      entityId: "sweepCart",
      kind: "trolley",
      name: "Sweep Cart",
      // Empty: sloshes the wet flagstones daily at beat 3 on its own loop —
      // a skid it can be retimed or rerouted to land on the permitted beat.
      initial: { armed: true },
    },
    {
      entityId: "canalPump",
      kind: "fountain",
      name: "Canal Pump",
      initial: { running: true },
    },
    {
      entityId: "vesperBell",
      kind: "bell",
      name: "Vesper Bell",
      initial: {},
    },
    {
      entityId: "chapelGate",
      kind: "fixture",
      name: "Chapel Gate",
      initial: {},
    },
    {
      entityId: "duskSwitch",
      kind: "junction",
      name: "Dusk Switch",
      initial: { controlsRouteOf: "vesperRoad", routeId: "vesperRoad" },
    },
    {
      entityId: "sweepSwitch",
      kind: "junction",
      name: "Sweep Switch",
      initial: { controlsRouteOf: "sweepLoop", routeId: "sweepLoop" },
    },
    {
      entityId: "windUpToy",
      kind: "windUpToy",
      name: "Wind-up Nightjar",
      initial: { armed: false },
    },
    {
      entityId: "chapterHouse",
      kind: "destination",
      name: "Chapter House",
      initial: {},
    },
  ],

  routes: [
    {
      // Original: skid on the wet flagstones at 4 (vesper bell + ruined
      // candles), cloister at 5, recorded chapel gate at 6, house at 7.
      routeId: "vesperRoad",
      label: "Vesper road (wet flagstones)",
      waypoints: [
        { locationId: "gatehouse" },
        { locationId: "riverside" },
        { locationId: "bellTower" },
        {
          locationId: "wetFlagstones",
          surface: { kind: "dynamic", sourceEntityId: "canalPump" },
          skidHazard: true,
          adjacentBellId: "vesperBell",
        },
        { locationId: "cloisterWalk" },
        { locationId: "chapelGate", crossingId: "chapelGate" },
        { locationId: "chapterHouse", isDestination: true },
      ],
    },
    {
      // Dry cloister route: identical prefix and tail — cloister at 5 and
      // the recorded gate at 6 hold; only the flagstones at 4 are skipped.
      routeId: "cloisterDetour",
      label: "Cloister detour (dry)",
      waypoints: [
        { locationId: "gatehouse" },
        { locationId: "riverside" },
        { locationId: "bellTower" },
        { locationId: "herbPath", surface: { kind: "dry" } },
        { locationId: "cloisterWalk" },
        { locationId: "chapelGate", crossingId: "chapelGate" },
        { locationId: "chapterHouse", isDestination: true },
      ],
    },
    {
      // Sweeper's own loop already crosses the wet flagstones — at beat 3.
      // Delaying its start by one beat lands the skid on the permitted 4.
      routeId: "sweepLoop",
      label: "Sweep loop (flagstones at 3)",
      waypoints: [
        { locationId: "curfewYard" },
        { locationId: "millpond" },
        {
          locationId: "wetFlagstones",
          surface: { kind: "dynamic", sourceEntityId: "canalPump" },
          skidHazard: true,
          adjacentBellId: "vesperBell",
        },
        { locationId: "vicarLane" },
        { locationId: "sweepDepot", isDestination: true },
      ],
    },
    {
      // Sweeper's alternate: times the same flagstone skid to beat 4.
      routeId: "vesperSpur",
      label: "Vesper spur (flagstones at 4)",
      waypoints: [
        { locationId: "curfewYard" },
        { locationId: "millpond" },
        { locationId: "towerGreen" },
        {
          locationId: "wetFlagstones",
          surface: { kind: "dynamic", sourceEntityId: "canalPump" },
          skidHazard: true,
          adjacentBellId: "vesperBell",
        },
        { locationId: "sweepDepot", isDestination: true },
      ],
    },
  ],

  sockets: [
    {
      // Legal but WRONG for this case: a parked nightjar rings at 4 and
      // keeps ringing every later beat — straight through the sealed quiet.
      socketId: "vesperSocket",
      accepts: ["PlaceAndArmToy"],
      linkedBellId: "vesperBell",
      locationId: "towerFoot",
    },
  ],

  actors: [
    {
      entityId: "duskCart",
      kind: "trolley",
      startBeat: 1,
      defaultRouteId: "vesperRoad",
      cargoField: "candleShipment",
    },
    {
      entityId: "sweepCart",
      kind: "carrier",
      startBeat: 1,
      defaultRouteId: "sweepLoop",
    },
  ],

  // Junctions cost 2: the canonical repair (two legal re-routings) is 4/4;
  // the retimed sweeper variant is the 3/4 mastery path.
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
      // The vesper bell rang at beat 4 — the permitted time.
      id: "OBS-VESPER",
      form: "EventOccurred",
      entityId: "vesperBell",
      eventType: "BellRing",
      beat: 4,
    },
    {
      // And then the archive heard SILENCE: no bell event in [5,8].
      id: "OBS-QUIET",
      form: "EventAbsent",
      entityId: "vesperBell",
      eventType: "BellRing",
      fromBeat: 5,
      toBeat: 8,
    },
    {
      // The dusk cart was on the cloister walk at beat 5.
      id: "OBS-CLOISTER",
      form: "EntityAt",
      entityId: "duskCart",
      locationId: "cloisterWalk",
      beat: 5,
    },
    {
      // The dusk cart crossed the chapel gate at beat 6.
      id: "OBS-GATE",
      form: "AtCrossing",
      entityId: "duskCart",
      crossingId: "chapelGate",
      beat: 6,
    },
  ],

  desiredOutcomes: [
    {
      id: "OUT-CANDLES",
      form: "EntityStateAtEnd",
      entityId: "duskCart",
      field: "candleShipment",
      value: "intact",
    },
  ],

  hints: [
    "The record holds a ring at beat 4 and silence after it. The substitute signal must fire at the permitted beat and then STOP — a cause that keeps ringing contradicts the quiet.",
    "The wind-up nightjar is the wrong tool for a bell with a sealed silence: it strikes at 4 and keeps striking every later beat. Only a one-shot cause — a real skid on the flagstones — rings once and is done.",
    "The empty sweep cart already sloshes the flagstones on its own loop at beat 3. Retime its start one beat later, or reroute it onto the vesper spur, and its skid lands on the recorded 4 — while the dusk cart takes the dry cloister route.",
  ],

  designNote:
    "The first case where a cause's PATTERN matters, not just its presence: EventAbsent(vesperBell, 5–8) makes the repeating toy a designed trap — armed at the tower socket it rings at 4 and keeps ringing every beat through the sealed quiet (asserted failing on OBS-QUIET alone while OBS-VESPER and the outcome pass). Only a one-shot skid substitutes: reroute the dusk cart onto the dry cloister (cloister@5 and gate@6 preserved) and supply the ring by rerouting the empty sweep cart onto the vesper spur — skid at 4, silence after (4/4). A second, cheaper chain retimes instead of reroutes: delay the sweeper's start one beat so its own flagstone crossing moves from 3 to 4 (3/4). Traps: valve-off silences the permitted ring; a second ringer without the detour leaves the candles ruined; delaying the DUSK cart drags its skid to beat 5 — inside the quiet — breaking OBS-QUIET, OBS-VESPER, and OBS-GATE at once. Merely causing all possible events (the toy's ring-every-beat) fails on the facts.",
};

export const TRS08_CARD = {
  winningTraceSummary:
    "Reroute: duskSwitch→cloisterDetour (dry, gate still at 6) + sweepSwitch→vesperSpur so the empty sweeper skids the flagstones at beat 4 — one ring, then silence. Retime: same detour + SetMechanismDelay(sweepCart,1) moving its own flagstone skid from 3 to 4. Costs 4 and 3 of 4.",
  strategySignatures: [
    "reroute-the-sweeper: RedirectJunction(duskSwitch→cloisterDetour) + RedirectJunction(sweepSwitch→vesperSpur)",
    "retime-the-sweeper: RedirectJunction(duskSwitch→cloisterDetour) + SetMechanismDelay(sweepCart,1)",
  ],
  wrongApproaches: [
    "Arming the nightjar rings the vesper bell at 4 — and at 5, 6, 7, 8: OBS-QUIET fails while the permitted ring and the outcome both hold. A repeating cause cannot testify to a silence.",
    "Closing the canal pump dries the flagstones and saves the candles, but the permitted beat-4 ring never happens.",
    "Rerouting the sweeper (or arming the toy) without the cloister detour supplies the ring but leaves the candle shipment on the skid.",
    "Delaying the dusk cart drags its own skid to beat 5 — a ring inside the quiet interval, no ring at 4, and the gate late.",
    "The detour alone keeps every recorded passage but deletes the vesper ring the archive heard.",
  ],
  coopNote:
    "One player can own the silence interval (scrub 5–8 and verify nothing rings), one the permitted-beat substitute (reroute vs retime the sweeper), one the dusk cart's recorded route.",
};
