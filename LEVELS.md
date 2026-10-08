# TRS-02 … TRS-12 — level design rationale

Author: level-designer + engineer work package, per `DEVIN-CLOUD-MASTER-HANDOFF.md`
(Part II, TRS-D rows 2–12; TRS-001..010; CONTENT-PRODUCTION; IV.5).
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
  it does not gate any mechanism. TRS-05/06/07 weaponize this as a trap:
  the "cover the camera" / "pad the skid" / "relabel the parcel" props all
  move a `locationId` no observation reads — every sealed fact still passes
  and the outcome still fails.
- `ScheduleActivation` emits `Activated` on the named entity at one beat —
  used only as a decoy/cost item; no observation depends on it.
- `VisibleFrom(entity, cameraRegionId, beat)` resolves the entity's
  `position` field at that beat against `__world.cameraRegions` — a level-
  declared entity (`entityId: "__world"`, kind `generic`) whose
  `initial.cameraRegions` maps region ids to location-id lists. Only
  actors/armed toys ever get a `position` field, so the form applies to
  movers only. The `pos.startsWith(regionId+":")` branch in evaluate.ts is
  dead code; membership in the declared list is the whole check.
- `EventCount(entity, eventType, from, to, count)` counts matching events in
  the inclusive window — it is how "the record heard exactly ONE ring" is
  sealed. Scope the window tightly ([4,4], not [4,8]): a parked toy re-rings
  every beat ≥ 4, so a wide count window is unsatisfiable with a toy.
- `EntityAt`/`EntityStateAtEnd` on `position` read the actor's current
  waypoint — a destination outcome ("the parcel ends at the town hall
  steps") is expressible without any skid machinery at all (TRS-07).
- `EventAbsent(entity, eventType, from, to)` enforces silence inside an
  inclusive window — the parked-toy re-ring (every beat ≥ 4) makes the toy
  a designed failure whenever the window covers later beats (TRS-08). A
  one-shot skid is the only single-beat bell substitute.
- `RedirectJunction` moves EVERY actor whose `defaultRouteId` matches the
  junction — two carts sharing a route are one convoy pull (TRS-10), and a
  `RouteDef` is reusable across actors (the spare cart can "borrow" the
  sweeper's spur — routes are shared resources, not owned paths).
- Redirects apply in list order and are **last-wins** per junction: two
  RedirectJunctions on one switch do not run both routes — the second
  silently overwrites the first (TRS-11's naive-fix conflict).
- A cart's skid does not stop movement, so ONE cart can chain skids —
  wet tile at 4 then another at 5 — serving two different bells on a
  single road (TRS-11/12 relay spur).

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

## TRS-05 Two Sides of the Square (`trs-05`, chapter 2, budget 3, horizon 8)

**Causal puzzle.** First case to use `VisibleFrom`: two declared camera
regions watch the plaza. The north terrace recorded the prism cart under
the square arch at beat 3 (`AtCrossing` + `VisibleFrom(northTerrace,3)`);
the south arcade recorded the cart on its tiles at beat 4 and heard the
square bell ring then (`VisibleFrom(southArcade,4)` + `EventOccurred`
bell@4). The ruin's cause — the wet-cobbles skid — is the one thing no
camera filmed.

**Intended insight.** "Recorded viewpoints constrain different parts of the
same scene." The repair must change the unrecorded cause while keeping BOTH
views true: `arcadeDetour` shares the arch prefix and puts beat 4 on the
dry `arcadeCobbles` — still inside `southArcade`. `backLane` is equally dry
and equally on time, but `workshopRow` is in no camera region at all, so
**OBS-S-VIS** fails — both cameras constrain the geometry, not just the
timing.

**Two verified chains + one priced-out near-miss:**
- **REROUTE** (3/3): `routeSwitch→arcadeDetour` + toy at `squareSocket`.
- **DRY-IN-PLACE** (2/3): `SetValve(plazaFountain,false)` + toy — every
  recorded position is identical because the original route is untouched.
- **AWNING WADE** (4/3 — rejected): the empty awning cart can be sent
  through the cobbles to skid-ring the bell for real, but two junction
  pulls cost 4. Verified: `evaluation.success` is true and `withinBudget`
  is false — the archive refuses on price, not facts.

**The screen lesson (card requirement).** `RepositionProp(canvasScreen,
southArcade)` "covers the witness's view" — all four observations still
pass and the lens still breaks. Camera facts are logical set-membership,
not line of sight.

---

## TRS-06 The Unbroken Exhibit (`trs-06`, chapter 2, budget 3, horizon 8)

**Causal puzzle.** The exhibit cart's ride was recorded four ways: museum
arch at 3, **exactly one** gallery-bell ring at 4 (`EventCount` [4,4] = 1),
grand-staircase position at 5, and the porter cart's service-gate crossing
at 2. The flooded marble supplies the single ring via a skid — and takes
the porcelain orb in exchange.

**Three verified causal chains** (card asks for ≥2; the third is the
mastery path):
- **Toy substitute** (2/3): `cloisterDetour` + wren at `gallerySocket` —
  redirect the impact, recreate the signal mechanically.
- **Swap the absorber** (2/3): `cloisterDetour` + `porterSwitch→marbleSpur`
  — the empty porter takes the skid at beat 4; a real skid produces the
  recorded ring and nothing fragile is aboard.
- **Remove the hazard** (2/3): `SetValve(sprinklerHouse,false)` + wren —
  the exhibit keeps its whole recorded route; only the strike is replaced.
- Test asserts the ring's `cause` differs (`windUpWren:strike` vs
  `porterCart:skid`) and that A vs C differ in where the exhibit spends
  beat 4 (`cloisterPath` vs `floodedMarble`).

**Wrong approaches.**
1. Porter spur alone — porter AND exhibit both skid at 4: **OBS-RING
   fails on the facts** (count 2 ≠ 1) before OUT-ORB fails. "The record
   heard one ring" is the level's sharpest trap.
2. Cloister alone / valve alone — **OBS-RING = 0**.
3. `annexSocket` decoy — **OBS-RING fails** on bell identity.
4. `bufferCrate` onto the marble — absorbs nothing: obs pass,
   **OUT-ORB fails**.
5. `SetMechanismDelay(exhibitCart,1)` — arch, ring, staircase all fail.

---

## TRS-07 The Wrong Delivery (`trs-07`, chapter 3, budget 4, horizon 8)

**Causal puzzle.** First case whose failed outcome is a *destination*, not
ruined cargo. Four observations pin both carriers' routes and the recorded
handoff points: post trolley over the sorting cross@3 and AT the handoff
platform@5 (`EntityAt`); barge over the lock gate@2 and AT the same
platform@6. Both parcels rode the right carriers all along — the routes
were crossed at the final junction (post ends at the quay, barge at the
town hall).

**Intended insight.** "A recorded carrier route need not determine its
unrecorded cargo history" — and the fix moves *carriers*, never labels.
Two legal re-routings: `postSwitch→postRoadCivic` (identical through the
platform@5, then town hall) + `bargeSwitch→lockRunHarbor` (identical
through the platform@6, then the quay). Junctions cost 2 → exactly 4/4;
any bell, decal, or delay spend makes the required pair unpayable.

**Wrong approaches.**
1. `postExpress` — reaches the right dock *early* but skips the platform:
   both outcomes pass, **OBS-POST-PLATFORM fails** (faster ≠ legal, and
   the handoff must stay physically visible).
2. `postSwitch→lockRunHarbor` — the post trolley on the barge's road
   loses **both** its recorded facts (**OBS-SORTING**, **OBS-POST-PLATFORM**).
3. `RepositionProp(parcelDecal, townHallSteps)` — the forbidden
   label-edit: all obs pass, **both outcomes fail**.
4. Platform hand-bell toy — rings a bell that moves no parcels.
5. One junction alone — delivers one parcel, strands the other (each
   outcome independently load-bearing).
6. `SetMechanismDelay(postTrolley,1)` — re-times its crossing AND its
   platform.

---

---

## TRS-08 The Quiet Interval (`trs-08`, chapter 3, budget 4, horizon 8)

**Causal puzzle.** First `EventAbsent` case: the archive heard the vesper
bell at beat 4 and recorded silence across [5,8]. The dusk cart's
flagstone skid produced the ring (and ruined the candles); the sweeper's
own loop skids the same stones at beat 3, harmlessly unrecorded.

**Intended insight.** A cause's *pattern* is evidence, not just its
presence. The wind-up nightjar is the designed trap: it strikes at 4 and
keeps re-ringing through the sealed quiet — asserted failing on
**OBS-QUIET alone** while the ring and the candles both hold. Only a
one-shot skid can substitute: two verified chains —
- **REROUTE** (4/4): dusk → dry cloister + sweeper → `vesperSpur` (skid@4).
- **RETIME** (3/4): same detour + `SetMechanismDelay(sweepCart,1)` — the
  sweeper's own flagstone skid moves from beat 3 to 4. Verified distinct:
  sweeper position@3 differs (`towerGreen` vs `millpond`).

**Wrong approaches.** Toy (fails quiet only); valve-off (permitted ring
dies, quiet holds vacuously); sweeper-substitute without the detour
(candles still ruined); delaying the DUSK cart drags its skid to beat 5 —
inside the quiet — breaking OBS-VESPER + OBS-QUIET + OBS-GATE at once;
detour alone deletes the ring.

---

## TRS-09 The Same Moment (`trs-09`, chapter 3, budget 4, horizon 8)

**Causal puzzle.** Two procession carts skid at the SAME beat 4 on
different wet tiles (one shared storm main), ringing two bells and ruining
two vases; both cameras saw their carts at beat 5 (`VisibleFrom` ×2).
Five observations: bell-N@4, bell-S@4, arch-N@3, view-N@5, view-S@5 —
two pairs on shared beats.

**Intended insight.** Coordinate two causal chains to the SAME beat — no
partial credit for a beat early or late. Every valid plan is exactly 4/4:
both carrier bypasses + two beat-4 substitutes.
- **Toy-N + usher-skid-S** (4/4), **Toy-S + page-skid-N** (4/4),
  **two skids, no toy** (4/4) — all asserted, causes differ
  (`windUpToy:strike` vs `pageCart:skid`/`usherCart:skid`).

**Sequential near-miss (card requirement).** `terraceEarly` rings the
north bell at 3; `quayLate` rings the south bell at 5 — each asserted
failing on exactly its own bell predicate while everything else passes.
Other traps: one toy covers one bell (`OBS-BELL-S` fails alone); the
off-camera `northCellar` route fails `OBS-VIEW-N` alone; the shared storm
main kills both bells with one valve; bare bypasses silence both rings.

**Four-person case (dispatch requirement).** coopNote names four distinct
contribution types: north-camera evidence owner, south-camera owner,
per-chain intervention owners (each substitute independently load-
bearing), and a parallel verifier auditing that the beat-4 pair still
lands together.

---

## TRS-10 No Spare Parts (`trs-10`, chapter 3, budget 4, horizon 8)

**Causal puzzle.** Two gift carts share ONE route (`processionWay`) — a
single `convoySwitch` pull reroutes both — and skid together on the wet
cobbles at 4 (tower bell + both gifts ruined). The sweeper's daily
wet-quay skid at 6 already rings the harbor bell: an *existing
consequence* the archive also recorded. Substitutes are scarce: one toy
(cost 2), one spare cart, one sweeper.

**Three verified repairs, different allocations of the same scarce props:**
- **BEST — reuse the consequence** (2/4): convoy detour + spare cart
  *borrows* `towerSpur` (routes are shared resources; RedirectJunction
  accepts any routeId). Sweeper untouched — harbor ring free. The brief's
  "best plan reuses an existing consequence rather than spawn a tool".
- **SPAWN THE TOY** (3/4): detour + bird at `towerSocket`.
- **RESHUFFLE BOTH CARTS** (3/4): detour + sweeper → towerSpur +
  spare → `quayShift` (it takes over the abandoned quay duty; the
  sweeper's `OBS-BRIDGE@2` survives because towerSpur shares its prefix).

**Wrong approaches.** Sweeper→towerSpur *without* covering the quay:
**OBS-HARBOR fails alone** (the orphaning trap — one prop can't be in two
places). Detour alone drops **OBS-TOWER**. Closing the shared canal pump
kills **OBS-TOWER + OBS-HARBOR** together. Bird at the harbor socket
covers bell-6 via parked re-rings but leaves **OBS-TOWER** bare. Delaying
gift cart A re-times its gate and its skid.

---

## TRS-11 The Archive Exhibition (`trs-11`, chapter 3, budget 4, horizon 8)

**Causal puzzle.** Two subscenes on one recorded morning: the North
Gallery (exhibit cart skids the terrace at 4 → gallery bell) and the
South Court (court cart skids the quay at 5 → ONE harbor strike,
`EventCount` = 1). One canal pump feeds both tiles; one spare cart and
one nightjar serve both halls.

**Intended insight.** Repairs in neighboring subscenes affect one
another. The naive combined fix — each half claims `spareSwitch` for its
own spur — is a shared-resource conflict: redirects are last-wins, so the
second claim silently deletes the first (asserted: the cart is at
`quayNorth` at 4, never wets the terrace, **OBS-BELL-N fails alone**).
The cheap `arcadeCut` north detour is the event conflict: beat 5 wades
the south quay → a second harbor strike → **OBS-BELL-S fails alone**.

**Two verified compensations (different allocations of the same props):**
- **RELAY (3/4):** both detours + `spareSwitch→relaySpur` — ONE road
  visits the terrace at 4 and the quay at 5; a single cart serves both
  bells (skid doesn't stop movement).
- **SPLIT (4/4):** both detours + nightjar at `gallerySocket` (strike@4)
  + `spareSwitch→quaySpur` (skid@5). Deliberate asymmetry: no harbor
  socket exists and the toy only ever strikes at 4 — beat 5 *requires* a
  skid, so at least one sacrificial skid survives in every plan.

**Other wrong approaches.** Shared pump off → both bells dead; both
detours alone → both bells dead; delaying the court cart erases the
arch, the strike count, and the annex timing together.

---

## TRS-12 The Town That Didn't Fall (`trs-12`, chapter 3, budget 5, horizon 8) — finale

**Three connected stages of one recorded day.** Stage A: both carts'
morning crossings at beat 2 (mill bridge, civic arch). Stage B: the two
mishaps — plaza skid at 4 (tower bell + ruined fireworks), bank skid at
5 (harbor bell + ruined proclamation). Stage C: the tower bell's sealed
evening silence (`EventAbsent [5,8]`) and the green camera's view of the
mayor's arrival at 7 (`VisibleFrom`). Outcomes complete the story —
both cargos intact AND the rocket cart standing on the celebration green.

**Three meaningfully different complete repairs:**
- **RELAY (3/5):** both detours + `spareSwitch→relaySpur` — the single
  borrowed road skids the plaza at 4 and the bank at 5.
- **TOY-HARBOR (5/5):** both detours + `sweepSwitch→plazaSpur` +
  finch at `harborSocket` — legal ONLY because the harbor bell has no
  sealed silence; the parked finch's re-ring train covers beat 5.
  Deliberately inverts TRS-08's veto: the same re-ring quirk that broke
  the quiet interval is here a feature.
- **TWO-CREW (4/5):** both detours + sweeper on `plazaSpur` + spare on
  `bankSpur` — substitute labor split across both empty carts.

**Wrong approaches.** Finch at the tower socket → **OBS-QUIET alone
fails** (counterfactual strips it → plan "wins": the silence is
load-bearing). Pump off → both bells dead. Relay cart without detours →
all six observations pass and the town still falls (record ≠ outcome).
Tower-only coverage → **OBS-HARBOR alone fails**. Delaying the rocket
cart breaks all three stages at once (bridge@2, strike@5, silence@5).

**Four-person map:** stage-A evidence ownership, per-bell substitute
ownership (independent interventions), stage-C parallel verification
(quiet + camera on the repaired replay), and budget/dispatch arbitration
across the three valid plans.

---

## LevelCard coverage vs. CONTENT-PRODUCTION

Each level file exports `TRSxx_CARD` with `winningTraceSummary`,
`wrongApproaches[]`, `strategySignatures` (where alternates exist), and
`coopNote`. The required four-person set TRS-09/10/11/12 each names four
distinct contribution types (per-camera evidence ownership, per-chain
intervention ownership, parallel verification, budget/dispatch). Hints follow
GME-009 tiers: relationship → tool → partial move; no hint plays the level.

## Test inventory

### `tests/unit/trs02-04.test.ts` (36 tests)

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

### `tests/unit/trs05-07.test.ts` (46 tests)

- Same per-level battery: original-run validity (TRS-006), verified winning
  trace(s), named-predicate failure per designed wrong approach, over-budget
  rejection via the real `TrsEngine` path, deterministic replay.
- TRS-05 asserts both `VisibleFrom` camera regions are load-bearing: the
  `backLane` plan is dry/on-time/cargo-safe yet fails **OBS-S-VIS** alone.
- TRS-05's awning-wade plan is asserted `evaluation.success === true` AND
  `withinBudget === false` — a plan rejected on price, not facts.
- TRS-06 asserts all three chains and their causal signatures; the
  porter-alone trap is asserted failing on **OBS-RING** (count 2 ≠ 1)
  *before* the outcome.
- TRS-07's counterfactual: the express-fork plan satisfies every outcome
  and fails only **OBS-POST-PLATFORM** — the platform facts are what make
  the shortcut illegal.

### `tests/unit/trs08-10.test.ts` (48 tests)

- Same per-level battery plus: TRS-08 asserts `EventAbsent` semantics both
  ways — the toy plan fails OBS-QUIET alone (ring@4 and outcome both pass)
  and the counterfactual strips only OBS-QUIET to make the same plan 'win'.
- TRS-08's two chains are distinguished by sweeper position at beat 3
  (rerouted road vs retimed loop), not just by intervention kind.
- TRS-09 asserts the same-beat pair: three winning allocations, both
  sequential near-misses (early/late spurs) failing on exactly one bell
  predicate each, and both `VisibleFrom` camera facts load-bearing.
- TRS-10 asserts the shared-route convoy pull moves both carts in one
  position check, plus three different prop allocations by BellRing
  `cause` (spareCart:skid / windUpBird:strike / sweeperCart:skid).

### `tests/unit/trs11-12.test.ts` (29 tests)

- TRS-11 asserts the last-wins conflict directly: the naive plan's cart
  positions prove the second redirect overwrote the first (quayNorth@4,
  never wetTerrace) and OBS-BELL-N fails alone; the arcade-cut trap
  doubles the harbor strike (EventCount 2 ≠ 1).
- TRS-12 asserts the three-stage record (two@2 crossings, bells@4 and
  @5, quiet[5,8], camera@7) and three distinct repairs by cause
  signature; TOY-HARBOR asserts the parked-finch re-ring train
  [4,5,6,7,8] is legal on the un-quiet bell — the deliberate inversion
  of TRS-08's veto.
- Counterfactuals on both levels isolate the load-bearing predicate
  (OBS-QUIET / stripped bells).

## Discovered alternates (enumeration audit, 2026-10-08)

A full solution-space enumeration (conflict-free intervention configs within
budget, all kinds/values — see coordination dataroom/001) verified the designed
traces and found **kept alternates**: Hazelden-style "monolith" solutions that
are interestingly distinct from the intended solve, not cheaper variants of the
same trick. Disposition per alternate is deliberate (keep / gate / watch), and
`tests/depth/discovered-alternates.test.ts` fences each so future edits must
decide, not silently close a discovery space.

**Solution-space width** (irreducible minimal solutions): TRS-01..12 =
1, 1, 6, 3, 2, 3, 1, 3, 16, 6, 4, 14. The wide levels (09, 12) are
substitute×junction permutation spaces — one mechanism family, not many;
their cards should be read as "the discovery space is the level."

### Kept alternates worth naming
- **TRS-03 — route compression**: `Delay(bannerFloat,+1) + floatSwitch→expressAlley
  + substitute` (3 variants: toy / marshal-skid / marshal-mainStreet). Buys back
  the beat the express forfeits — the "shorter ≠ on time" trap is compressible
  for +1 cost, and that is a *discovery*, not a leak: the player still learns
  express-alone fails first. KEEP; H3 wording stays honest ("express alone").
- **Inherited-route family ("re-let the street")** — once a convoy actor vacates
  a route, any junction'd actor may take it: `marshalSwitch→mainStreet` (TRS-03),
  `spareSwitch→processionWay` (TRS-10, cheapest spare solve),
  `usherSwitch→arcadeProcession`/`pageSwitch` swings (TRS-09),
  `spareSwitch→relaySpur` AND `sweepSwitch→relaySpur` (TRS-12 — the relay has
  two carriers), `spareSwitch→{arcadeCut,southWay,quaySpur}` (TRS-11). A
  coherent verb family the engine supports natively; candidate for a dedicated
  teaching level if a chapter-4 set is ever built.
- **TRS-04 hybrid**: `cartSwitch→upperCircuit + Toy(windUpToy@belfrySocket)` —
  mixes the two designed strategies; legitimate third solve.
- **TRS-08 third road**: `duskSwitch→cloisterDetour + sweepSwitch→vesperRoad` —
  card names vesperSpur + retime; vesperRoad is the third.

### Proto-monoliths (gated by budget — keep sealed)
- **TRS-05 has TWO over-budget near misses**, not one:
  `routeSwitch→arcadeDetour + awningSwitch→awningWade` @4/3 (documented) and
  `routeSwitch→arcadeDetour + awningSwitch→grandTraverse` @4/3 (new — the
  awning cart inherits the prism's vacated wet route and skids the bell at 4).
  Both need the dry detour that only the toy would buy — a 2-coin-purse teaser.
  KEEP GATED; they are the level's echo challenges. Verify H3 never implies a
  3-cost solve exists.

### Constraint seams (watch, not bugs)
- TRS-09: OBS-BELL-N/S carry essentially the whole level (+480/+482 permissive
  solutions if dropped) — by design for a bells symmetry level, but it's the
  single point of fragility.
- TRS-05 OBS-S-VIS (+1) and TRS-04 OBS-CLOCK (+2) are near-vacuous seals —
  fine, but if either level ever feels under-constrained in playtest, the
  leak runs through these facts.
