/**
 * TRS-05 Two Sides of the Square (master TRS-D row 5).
 *
 * Lesson: recorded viewpoints constrain different parts of the same scene.
 * Two archive cameras watched the plaza: the north terrace saw the prism
 * cart pass the square arch at beat 3, and the south arcade saw the cart
 * on the south tiles at beat 4 and heard the square bell ring then. The
 * ruin — the skid on the wet cobbles — was never recorded; only its
 * positions and its ring were. Any repair must keep BOTH camera views
 * while removing the cause nobody filmed.
 */
import type { CaseDefinition } from "../../engine/trs/types.js";

export const TRS05: CaseDefinition = {
  levelId: "trs-05",
  title: "Two Sides of the Square",
  chapter: 2,
  horizonBeats: 8,

  entities: [
    {
      // World-carried level data: VisibleFrom resolves camera regions as
      // declared location sets (evaluate.ts reads __world.cameraRegions
      // from the beat-1 snapshot). The skid itself is in NO camera region:
      // only its positions and its bell effect are on record.
      entityId: "__world",
      kind: "generic",
      name: "Archive Cameras",
      initial: {
        cameraRegions: {
          northTerrace: [
            "westSteps",
            "galleryRow",
            "squareArch",
            "northPorch",
            "terraceSteps",
          ],
          southArcade: [
            "slickCobbles",
            "arcadeCobbles",
            "arcadeFront",
            "southSteps",
          ],
        },
      },
    },
    {
      entityId: "prismCart",
      kind: "trolley",
      name: "Prism Cart",
      initial: { prismLens: "intact", armed: true },
    },
    {
      entityId: "awningCart",
      kind: "trolley",
      name: "Awning Cart",
      // Empty work cart. It can wade the slick cobbles and skid harmlessly —
      // but two junction pulls would blow the budget (see wrongApproaches).
      initial: { armed: true },
    },
    {
      entityId: "plazaFountain",
      kind: "fountain",
      name: "Plaza Fountain",
      initial: { running: true },
    },
    {
      entityId: "squareBell",
      kind: "bell",
      name: "Square Bell",
      initial: {},
    },
    {
      entityId: "squareArch",
      kind: "arch",
      name: "Square Arch",
      initial: {},
    },
    {
      // The lesson prop: dragging the canvas screen over a witness's view
      // changes a locationId nobody recorded — sealed facts don't care.
      entityId: "canvasScreen",
      kind: "fixture",
      name: "Canvas Screen",
      initial: { locationId: "arcadeWing" },
    },
    {
      entityId: "routeSwitch",
      kind: "junction",
      name: "Traverse Switch",
      initial: { controlsRouteOf: "grandTraverse", routeId: "grandTraverse" },
    },
    {
      entityId: "awningSwitch",
      kind: "junction",
      name: "Awning Switch",
      initial: { controlsRouteOf: "awningLoop", routeId: "awningLoop" },
    },
    {
      entityId: "windUpToy",
      kind: "windUpToy",
      name: "Wind-up Starling",
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
      // Original: recorded under the arch at 3, skid on the wet cobbles at 4
      // (rings the square bell, ruins the lens), exhibit hall at 7.
      routeId: "grandTraverse",
      label: "Grand traverse (slick cobbles)",
      waypoints: [
        { locationId: "westSteps" },
        { locationId: "galleryRow" },
        { locationId: "squareArch", crossingId: "squareArch" },
        {
          locationId: "slickCobbles",
          surface: { kind: "dynamic", sourceEntityId: "plazaFountain" },
          skidHazard: true,
          adjacentBellId: "squareBell",
        },
        { locationId: "arcadeFront" },
        { locationId: "eastPortico" },
        { locationId: "exhibitHall", isDestination: true },
      ],
    },
    {
      // Winning detour: same recorded beats, but beat 4 lands on the dry
      // arcade cobbles — still inside the south camera's region.
      routeId: "arcadeDetour",
      label: "Arcade detour (dry, still on camera)",
      waypoints: [
        { locationId: "westSteps" },
        { locationId: "galleryRow" },
        { locationId: "squareArch", crossingId: "squareArch" },
        { locationId: "arcadeCobbles", surface: { kind: "dry" } },
        { locationId: "arcadeFront" },
        { locationId: "eastPortico" },
        { locationId: "exhibitHall", isDestination: true },
      ],
    },
    {
      // The trap detour: dry and on time, but beat 4 happens in the
      // workshop row — outside EVERY camera region. The south archive
      // still saw the cart on its tiles at 4; this route can't explain that.
      routeId: "backLane",
      label: "Back lane (dry, off camera)",
      waypoints: [
        { locationId: "westSteps" },
        { locationId: "galleryRow" },
        { locationId: "squareArch", crossingId: "squareArch" },
        { locationId: "workshopRow", surface: { kind: "dry" } },
        { locationId: "arcadeFront" },
        { locationId: "eastPortico" },
        { locationId: "exhibitHall", isDestination: true },
      ],
    },
    {
      routeId: "awningLoop",
      label: "Awning loop",
      waypoints: [
        { locationId: "northPorch" },
        { locationId: "terraceSteps" },
        { locationId: "galleryRow" },
        { locationId: "flagstoneWalk" },
        { locationId: "awningShed", isDestination: true },
      ],
    },
    {
      // The wrong-cart trap: rerouting the awning cart changes nothing the
      // archive recorded — it was never part of the evidence.
      routeId: "awningSpur",
      label: "Awning spur (dry)",
      waypoints: [
        { locationId: "northPorch" },
        { locationId: "terraceSteps" },
        { locationId: "vendorRow" },
        { locationId: "flagstoneWalk" },
        { locationId: "awningShed", isDestination: true },
      ],
    },
    {
      // The awning cart CAN be sent through the slick cobbles to skid at 4
      // and ring the square bell — a real substitute. It is legal content,
      // but pulling two junctions costs 4 against a budget of 3.
      routeId: "awningWade",
      label: "Awning wade (through the cobbles)",
      waypoints: [
        { locationId: "northPorch" },
        { locationId: "terraceSteps" },
        { locationId: "southApproach" },
        {
          locationId: "slickCobbles",
          surface: { kind: "dynamic", sourceEntityId: "plazaFountain" },
          skidHazard: true,
          adjacentBellId: "squareBell",
        },
        { locationId: "arcadeFront" },
        { locationId: "awningShed", isDestination: true },
      ],
    },
  ],

  sockets: [
    {
      socketId: "squareSocket",
      accepts: ["PlaceAndArmToy"],
      linkedBellId: "squareBell",
      locationId: "plazaCorner",
    },
  ],

  actors: [
    {
      entityId: "prismCart",
      kind: "trolley",
      startBeat: 1,
      defaultRouteId: "grandTraverse",
      cargoField: "prismLens",
    },
    {
      entityId: "awningCart",
      kind: "carrier",
      startBeat: 1,
      defaultRouteId: "awningLoop",
    },
  ],

  // Redirect at 2 makes the reference repair land exactly on 3 — and makes
  // the two-junction 'awning absorbs the skid' plan unaffordable on purpose.
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
      // North camera: the prism cart was under the square arch at beat 3.
      id: "OBS-N-ARCH",
      form: "AtCrossing",
      entityId: "prismCart",
      crossingId: "squareArch",
      beat: 3,
    },
    {
      // North camera: geometric view of the cart at beat 3.
      id: "OBS-N-VIS",
      form: "VisibleFrom",
      entityId: "prismCart",
      cameraRegionId: "northTerrace",
      beat: 3,
    },
    {
      // South camera: the square bell rang at beat 4.
      id: "OBS-S-BELL",
      form: "EventOccurred",
      entityId: "squareBell",
      eventType: "BellRing",
      beat: 4,
    },
    {
      // South camera: the cart was on the south tiles at beat 4 — a detour
      // that leaves the arcade's view breaks this even if it stays dry.
      id: "OBS-S-VIS",
      form: "VisibleFrom",
      entityId: "prismCart",
      cameraRegionId: "southArcade",
      beat: 4,
    },
  ],

  desiredOutcomes: [
    {
      id: "OUT-PRISM",
      form: "EntityStateAtEnd",
      entityId: "prismCart",
      field: "prismLens",
      value: "intact",
    },
  ],

  hints: [
    "Neither camera filmed the skid — they recorded where the cart was and that the bell rang. You are free to change any cause the archive did not see, but both views must still come true.",
    "The dry detour must keep the cart inside the south arcade's region at beat 4: the arcade cobbles qualify, the workshop row does not. And the square bell still owes a ring at 4.",
    "The wind-up starling strikes the bell beside its launch socket on the fourth step — the plaza-corner socket is tied to the square bell. A screen across a camera's view changes nothing the archive sealed.",
  ],

  designNote:
    "First case to use VisibleFrom: two declared camera regions pin WHERE the prism cart was seen (north terrace at 3, south arcade at 4) while AtCrossing and the bell pin what happened there. The ruin's cause — the wet skid — was never on camera, so it is the one thing free to change. Reference repair: redirect onto the arcade detour (beat-4 tile stays in the south region, arch beat-3 prefix identical) plus the starling striking the square bell at 4 — cost exactly 3. Second valid chain: close the fountain (slick cobbles go dry, every position is unchanged so both camera views hold trivially) plus the starling. Designed failures: the canvas screen moved over a view fools nobody — every sealed fact still passes and the lens still breaks; the back lane is dry and on time yet fails the south view at beat 4; sending the awning cart through the cobbles rings the bell for real but two junctions cost 4 > 3; delaying the prism cart re-times both camera facts; the valve alone drops the recorded ring.",
};

export const TRS05_CARD = {
  winningTraceSummary:
    "Redirect the prism cart onto the arcade detour (arch still at 3, dry cobbles at 4 inside the south view) and arm the wind-up starling at the plaza-corner socket to ring the square bell at beat 4. Cost: 3 of 3.",
  strategySignatures: [
    "reroute: RedirectJunction(routeSwitch→arcadeDetour) + PlaceAndArmToy(squareSocket)",
    "dry-in-place: SetValve(plazaFountain,false) + PlaceAndArmToy(squareSocket)",
  ],
  wrongApproaches: [
    "Dragging the canvas screen over a camera's view changes nothing — the sealed facts are logical positions, not rendered pixels; all four observations still pass and the lens still breaks.",
    "The back lane is dry and still crosses the arch at 3, but beat 4 happens on the workshop row — outside the south arcade's region, so the recorded view fails even though the route 'works'.",
    "Sending the empty awning cart through the cobbles does ring the square bell at 4, but pulling two junctions costs 4 — the archive rejects the plan on budget, not on facts.",
    "Closing the fountain alone dries the skid but removes the bell ring the south camera recorded.",
    "Delaying the cart shifts the arch crossing to beat 4 — the north camera's record and the bell's beat both break.",
  ],
  coopNote:
    "Natural split: one player audits the north terrace facts, one the south arcade facts, one owns the substitute bell trigger, one watches the budget — the awning-cart plan is exactly the kind of expensive near-miss a budget owner catches.",
};
