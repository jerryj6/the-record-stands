# The Record Stands — what a judge sees in 60 seconds (honest review)

**0–10s.** Loads to a title screen: generated cover-style art, two clear
entry buttons (`Open the case files`, `Play together`). Strong first
impression if the deployed cover art is in; **weak spot:** the 2400×1350
final cover is still pending and the page reads plainer without it.

**10–25s.** Case select shows the full twelve-case grid — the scope claim is
visible immediately. TRS-01 opens fast with a readable scene, the sealed
observations listed, and a `Budget 0/2` counter.

**25–50s.** The core verb lands: press two interventions, `Run simulation`,
watch the same morning replay with a different cause, `Present findings` →
"Case closed". The "aha" — every fact still holds — is the game's whole
pitch and it does land in the first case.

**50–60s.** A judge who keeps going finds the hint button, undo, and the
co-op lobby with a real room code.

## Honest weak spots

- **Tutorial signposting is thin.** TRS-01 teaches by doing; a judge who
  doesn't read the observation list may click interventions at random. The
  hint ladder exists but isn't pushed.
- **The fantasy needs the art.** The sealed-record premise reads best once
  the finale art is in; on a plain capture the scene can look like a generic
  top-down town.
- **Co-op isn't visible from solo.** The "play together" path works but a
  judge on one device won't see it unless they look; the trailer's co-op
  beat carries that weight.
- **No audio hook in the first ten seconds** — procedural WebAudio cues are
  subtle until an action lands.
- **Playtests pending (G5)** — difficulty curve is designed, not yet
  player-validated; kit copy must not imply otherwise.

## The 5 presentation rules applied (sourced from MASTER-HANDOFF.md §4 + release sections)

1. **Real footage only** — trailer beats 1–10 all exist in the shipped game;
   no composited multiplayer, no unimplemented scenery.
2. **Every claim checkable** — the kit cites real UI verbs, the real build
   (`dist/build-id.json` SHA), and flags pending items instead of smoothing
   them over.
3. **Judge path ≤60s** — URL → title → TRS-01 → verdict with no setup; the
   walkthrough above is the exact button sequence.
4. **Plain-language differentiation** — the pitch names what it isn't:
   "change the cause, never the record" — not a generic match/grid puzzle.
5. **Truthful evidence map** — 12 levels, deterministic replay, solo + live
   2–4 co-op are verified; playtests and final-resolution cover are marked
   PENDING rather than claimed.
