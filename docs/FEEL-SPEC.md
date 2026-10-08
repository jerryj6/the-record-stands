# TRS feel spec — per-verb ack/resolve/confirm/sound/motion

Bible §8.17/§8.21 checklist artifact. One row per verb + UI verb. All
sounds are procedural WebAudio (src/client/audio.ts); motion is CSS
(src/client/styles.css); ack = input → visible state, resolve = system
accepts/rejects, confirm = outcome lands.

| Verb | Ack (<100ms) | Resolve | Confirm | Sound | Motion |
|---|---|---|---|---|---|
| RedirectJunction | button `.on` toggles | commit accepted (budget) | Budget badge decrements | `intervention.place` (2-note blip) | option button border |
| SetValve | button `.on` toggles | commit accepted | Budget badge decrements | `valve.turn` (sawtooth dip + filtered noise) | option button border |
| SetMechanismDelay | button `.on` toggles | commit accepted | Budget badge decrements | `intervention.place` | option button border |
| PlaceAndArmToy | button `.on` toggles + toy sprite at socket | commit accepted | Budget badge decrements | `intervention.place` | sprite appears |
| RepositionProp | button `.on` toggles | commit accepted | Budget badge decrements | `intervention.place` | option button border |
| RemoveIntervention | `.on` clears | freed cost | Budget badge restores | `ui.tick` | sprite/button reset |
| TestRun | sim runs, verdict block mounts | evaluation folds | verdict pass/fail + first-breach line + divergence rows | `trolley.roll` + `record.verify`/`record.contradict` | 150ms stampIn (reduced-motion aware) |
| AcceptResult | — | level marked solved | "solved" badge on case select (persistent) | `case.close` (two-note cadence) | verdict stays |
| Undo | prior state restored | — | config/budget reverted | `ui.tick` | buttons re-render |
| Reject (budget/invalid) | input rejected cleanly | denial | no state change | `intervention.deny` (low square dip) | none — no shake by design |
| Replay step (◀/▶/⏮) | beat index updates | snapshot applied | actors/props re-render at beat | diegetic per-beat cues (below) | sprite positions lerp per beat |
| Replay play (▶/⏸/2×/4×) | interval starts 700/350/175ms | auto-stops at last beat | playhead reaches end | diegetic per-beat cues | continuous beat advance |
| Slider scrub | beat jumps live | snapshot applied | re-render | diegetic per-beat cues | instant reposition |
| Hint reveal | tier text appears | hintsUsed counter increments | "hints used: n/N" in verdict | none (deliberately silent) | text expand |

## Diegetic event cues (patch 0004 wiring, SceneView)

| Timeline event | Cue | Synthesis |
|---|---|---|
| BellRing | `bell.ring` | 3× sine partials 1318/2637/3951Hz + echo strike |
| ToyStrike | `toy.windup` | 4× square ratchet 880→1100→990Hz |
| Skid | `cobble.splash` | noise burst + 220→110Hz sine dip |
| CargoRuined | `cargo.ruin` | noise thud + 160→80Hz triangle |
| (reserved) | `fountain.spray` | authored, no engine trigger — fountains only run in baseline |

## Channel separation

Diegetic cues play only on replay beats; UI cues only on input actions;
verdict stings only on evaluation. No event plays two cues — paired
same-beat events (TRS-09/11/12) each sound their own cue, correctly.

## Deliberate absences

- No screenshake anywhere (surveillance palette; stamp replaces it).
- No confetti on pass; pass = `record.verify` + `case.close` only.
- Hint reveals are silent (hints are reading, not action).
