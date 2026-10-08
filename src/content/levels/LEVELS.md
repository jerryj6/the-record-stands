# TRS-02 / TRS-03 / TRS-04 — level design rationale

Author: level-designer + engineer work package, per `DEVIN-CLOUD-MASTER-HANDOFF.md`
(Part II, TRS-D rows 2–4; TRS-001..010; CONTENT-PRODUCTION; IV.5).
Engine is untouched — all content is authored within the frozen sim's exact
vocabulary (`src/engine/trs/{types,sim,evaluate,engine}.ts`, unmodified).

## Reading the sim (what was actually verified, not assumed)

Verified by running the shipped engine (`npx vitest run`, 46/46 green) and by
dumping real event timelines:

- Actors advance one waypoint per beat from `startBeat` along their assigned
  route. A skid does **not** stop movement — a float can be ruined at beat 4
  and still be recorded crossing a gate at beat 6 ("on time but soaked").
- A skid requires `skidHazard` + wet surface; `adjacentBellId` gates the
  `BellRing`, and `cargoField` gates the ruin. An actor with no `cargoField`
  skids harmlessly — this is the engine's supported "sacrificial skid" idiom.
- `RedirectJunction` swaps the *whole* route of every actor whose
  `defaultRouteId` equals the junction's `controlsRouteOf`. Diverge-and-rejoin
  is authored by giving two `RouteDef`s shared `locationId`/`crossingId`
  waypoints at the shared beats.
- `SetMechanismDelay` only works on entities with `armed: true`; it is a
  one-shot start delay (`delayedUntil = triggerBeat + delayBeats`). All carts
  are authored `armed: true` precisely so the "depart late" trap exists.
- `PlaceAndArmToy` sets the toy's fixed 4-step path from its socket;
  it strikes `socket.linkedBellId` in the contact phase of beat 4.
  **Engine caveat observed:** a parked toy re-emits `BellRing`+`ToyStrike`
  every beat ≥ 4 (it remains adjacent to the bell). `EventOccurred` is
  unaffected (TRS-003: no unstated exclusivity), but an `EventAbsent`
  observation on that bell is incompatible with a toy left at its socket —
  TRS-08's quiet-interval design must account for this.
- `BellRing` can only be produced by a skid or a toy strike; a removed bell
  trigger therefore has exactly two substitute causes (toy@4, or another
  actor's skid timed to the same beat).
- `RepositionProp` only sets `locationId` (readable via `StateEquals`);
  it does not gate any mechanism. Not used as load-bearing anywhere here.
- `ScheduleActivation` emits `Activated` on the named entity at one beat —
  used only as a decoy/cost item; no observation depends on it.

## trs01 reconstruction notice

`src/content/levels/trs01-grand-opening.ts` was **absent** from
`trs-ref.tar.gz`, though `tests/unit/trs01-acceptance.test.ts` imports it.
I reconstructed it verbatim from the locked master TRS-C specification
(same observations `OBS-BELL`/`OBS-ARCH`/`OBS-FOUNTAIN`, `OUT-CAKE`,
budget 2, wet/dry equal-duration lanes, `junction`, `bellSocket`).
The shipped acceptance matrix passes against the reconstruction.
If a canonical trs01 exists in the real repo, diff before merging.

---

## TRS-02 The Late Lantern (`trs-02`, chapter 1, budget 3, horizon 8)

**Causal puzzle.** The lantern cart rides `paradeLane`: recorded river-arch
crossing at beat 3, then a skid on the fountain-wet cobbles at beat 4 that
both rings the signal bell (sealed) and ruins the lantern (outcome).
The fountain's running state at beat 8 is also sealed.

**Intended insight.** "Timing can change after a required observation has
occurred." The repair must hold beat 3 fixed while removing beat 4 — so a
*route* fix, not a *schedule* fix. `serviceAlley` shares the route's first
three waypoints exactly (arch crossing preserved) and is the same length
(equal-duration rule carried forward from TRS-01); the removed bell ring is
re-supplied by the wind-up sparrow at the plaza socket (strike at beat 4).

**Wrong approaches (all tested, each failing on a named predicate).**
1. `SetMechanismDelay(lanternCart,1)` — the blanket delay: arch moves to
   beat 4 (**OBS-ARCH fails**), skid to beat 5 (OBS-BELL fails), lantern
   still ruined. The card's required visible violation.
2. `SetValve(fountain,false)` — saves the lantern but falsifies
   **OBS-FOUNTAIN** and **OBS-BELL** (two sealed facts die to save one prop).
3. Toy alone — bell still rings at 4 (strike + skid; TRS-003 tolerates the
   duplicate) but **OUT-LANTERN fails**: a second ringer doesn't unload the cart.
4. Redirect alone — lantern safe, but **OBS-BELL fails**: the repair removed
   the trigger and replaced nothing.

**Pricing note.** `RedirectJunction` costs 2 here (whole-route surgery is the
level's heavy move), toy costs 1 → reference repair lands exactly on the
budget of 3; any fourth tool tips it over (tested).

---

## TRS-03 Rain on the Parade (`trs-03`, chapter 1, budget 3, horizon 8)

**Causal puzzle.** The banner float rides `mainStreet`: the open boulevard
is a rain-wet skid hazard at beat 4 (banner ruined, rain bell rings —
both sealed), and the float is recorded at the parade gate at beat 6.
The rain front itself is sealed running at beat 8.

**Intended insight.** "A route can diverge and rejoin while preserving a
recorded crossing" — and *a shorter route is not automatically on time*.
`arcadeDetour` diverges after the bandstand and rejoins at `gateApproach`,
matching `mainStreet`'s beat count so the gate crossing stays on beat 6.

**Two strategically distinct solutions (GME-005), both verified:**
- **Toy substitute** (2/3): `arcadeDetour` + `PlaceAndArmToy(rainBellSocket)`
  → the bell's beat-4 ring is re-supplied mechanically.
- **Sacrificial skid** (2/3): `arcadeDetour` + `RedirectJunction(marshalSwitch
  →hazardSpur)` → the marshal's *empty* cart (no cargoField) takes the same
  wet boulevard waypoint at beat 4, skids, and rings the same bell — a
  different causal substitution for the same fact. Test asserts the ring's
  `cause` field differs (`windUpToy:strike` vs `marshalCart:skid`).

**Wrong approaches.**
1. `expressAlley` — dry and shorter: gate crossing lands at beat 5,
   **OBS-GATE fails** (the card's required "faster ≠ on time" trap).
2. `SetValve(weatherFront,false)` — banner saved, **OBS-RAIN + OBS-BELL fail**
   (weather is sealed).
3. `bandstandSocket` — toy rings the *bandstand* bell at 4; **OBS-BELL fails**
   on entity identity (TRS-004).
4. `SetMechanismDelay(bannerFloat,1)` — gate moves to 7, skid to 5:
   **OBS-GATE, OBS-BELL, OUT-BANNER all fail**.
5. Marshal spur alone — restores the bell but leaves the banner ruined
   (**OUT-BANNER fails**); the record never said the marshal was fragile.

---

## TRS-04 The Shared Counterweight (`trs-04`, chapter 2, budget 3, horizon 8)

**Causal puzzle.** One movable resource — the counterweight cart — is recorded
doing three jobs on a single ride of `lowerCircuit`: lift plate at beat 3,
belfry chime at beat 4 (the slick-grate skid that also ruins its crystal
load), yard gate at beat 7. The lift plate and the belfry are two fixtures
sharing one prop at two different times. A fourth sealed fact pins the
supply cart's independent toll-bridge crossing at beat 2.

**Two substantively different repairs (card requirement), both verified:**
- **KEEP — reuse the counterweight** (2/3): `SetValve(cistern,false)` +
  `PlaceAndArmToy(belfrySocket)`. The counterweight keeps its *entire*
  recorded route — every duty survives untouched — because drying the grate
  removes the skid's damage while the toy replaces only the strike.
- **SPLIT — reassign one trigger** (2/3): `RedirectJunction(cartSwitch→
  upperCircuit)` + `RedirectJunction(supplySwitch→grateSpur)`. The
  counterweight takes the dry viaduct (plate@3 and gate@7 preserved; chime
  job removed); the supply cart inherits the chime job by skidding the same
  grate at beat 4 — and its own sealed bridge crossing survives because
  `grateSpur` shares `marketLoop`'s first two waypoints (reuses the TRS-03
  diverge-rejoin rule).
- Test asserts both pass *and* differ causally: chime cause
  `windUpToy:strike` vs `supplyCart:skid`, and the counterweight's beat-4
  position differs (`slickGrate` vs `viaductWalk`).

**Wrong approaches.**
1. Cistern alone — crystal safe, **OBS-CHIME fails** (the record heard it).
2. Viaduct alone — crystal safe, **OBS-CHIME fails** (rerouting silences the bell).
3. Toy alone — **OUT-CRYSTAL fails** (the skid still happens; a second
   striker doesn't unload the counterweight).
4. `chapelSocket` decoy — **OBS-CHIME fails** on bell identity.
5. `SetMechanismDelay(ballastCart,1)` — one prop, three broken duties:
   plate@4, chime@5, gate@8 (**all three crossing/bell obs fail**).
6. Supply-cart redirect alone — adds a second ringer, **OUT-CRYSTAL fails**.

---

## LevelCard coverage vs. CONTENT-PRODUCTION

Each level file exports `TRSxx_CARD` with `winningTraceSummary`,
`wrongApproaches[]`, `strategySignatures` (where alternates exist), and
`coopNote`. TRS-02..04 are not in the required four-person set (TRS-09..12);
coopNotes still name useful role splits for 2–3 players. Hints follow
GME-009 tiers: relationship → tool → partial move; no hint plays the level.

## Test inventory (`tests/unit/trs02-04.test.ts`, 36 tests)

- Per level: original-run validity (all obs pass, outcome fails — TRS-006);
  winning trace passes all obs + outcomes + budget via the real
  `TrsEngine` session path (`SetIntervention`→`TestRun`→`AcceptResult`).
- Every designed wrong approach asserts *which* predicate fails.
- Over-budget committed configs rejected with the engine's budget note.
- Deterministic replay: identical committed config → identical beat log and
  canonical hash.
- Two-solution levels (TRS-03, TRS-04): both strategies asserted passing
  with different causal signatures.
- Counterfactual spot-check: stripping sealed observations makes a partial
  repair "win" — proving the sealed facts are load-bearing (TRS-F spirit).
