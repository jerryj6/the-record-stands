# The Record Stands — Submission Kit

Prepared for manual entry by the owner. Everything below is stated against the
actual build in this repository; pending items are flagged **PENDING**, never
claimed.

> **Sourcing note:** `docs/GAME-DESIGN-BIBLE.md` was not included in the ref
> snapshot this kit was authored from. The five presentation rules below were
> extracted from `docs/MASTER-HANDOFF.md` (the competition-positioning and
> release sections, incl. the trailer/evidence requirements). Reconcile with the
> bible before final submission.

## 1. Game identity

- **Title:** The Record Stands
- **One-line pitch:** A sealed-observation causality puzzle — change how the
  disaster happened without changing a single fact anyone recorded.
- **Genre:** Browser puzzle game (causality / logic reconstruction)
- **Tagline candidates:**
  1. "Every fact stays true. Only the cause is yours to choose."
  2. "Rewrite the cause, never the record."
  3. "The morning is sealed. The accident is negotiable."
- **Description (≈80 words):**
  A cargo cart skidded, a bell rang, a lantern shattered — and eight cameras
  sealed every beat of it. In The Record Stands you don't deny the disaster;
  you re-author it. Reroute junctions, arm wind-up toys, set valves so the
  same evidence lands with a cause you chose. Twelve authored cases, solo or
  live 2–4 player co-op, every observation checked on a deterministic
  timeline.
- **Description (20 words):**
  Sealed-observation puzzle: keep every recorded fact true while you change
  exactly who — and what — caused the disaster.
- **Controls summary:** Mouse or touch only — no keyboard required. Press the
  intervention buttons (`Junction →`, `Wind-up toy`, `Valve:`, …) to spend
  the case budget; `Run simulation` replays the day; `Present findings`
  submits when every sealed observation holds. Undo/reset controls are on the
  case screen.
- **Solo:** Title screen → `Open the case files` → pick a case (TRS-01 …
  TRS-12) → plan interventions → `Run simulation` → `Present findings`.
- **Co-op (2/3/4 players):** Title → `Play together` → `Host a room
  (<level>)` → share the room code; teammates choose `Join` and enter it.
  Every command resolves on the authoritative server and replays
  deterministically on every client.
- **Browser requirements:** Modern desktop or mobile browser with WebGL and
  WebSocket support (Chrome/Edge/Firefox/Safari, current). No install, no
  account.
- **Tech stack (truthful):** TypeScript, Vite, React client, PixiJS scene
  renderer, `ws` WebSocket room server on Node, vitest/fast-check test
  suite, Playwright e2e.

## 2. Play instructions (for a judge)

- **Hosted:** open `<DEPLOYED-URL>` — the site and room server run on one
  port; solo play needs nothing else.
- **Local fallback:** `npm ci && npm run build && npm start`, then open
  `http://localhost:8787` (server listens on `PORT`, default 8787). `npm run build` produces the client `dist/`, the
  server bundle, and writes `dist/build-id.json` with `{ sha, builtAt,
  game: "the-record-stands" }` — verify the SHA against the submitted commit.
- **60-second path:** `Open the case files` → `TRS-01` → press `Junction →`
  and `Wind-up toy` → `Run simulation` → `Present findings`. Expected
  verdict: "Case closed".

## 3. Assets checklist

- [ ] **Cover art** — manifest entry `public/assets/trs-cover.png` is
      declared in `art/manifests/assets.json`; **PENDING:** the PNG is not
      present in this ref snapshot — confirm it landed upstream, then export
      the final at **2400×1350** (current captures elsewhere are 1672×941).
- [ ] **Screenshots** (capture at ≥1920×1080, fresh profile, no dev tools):
  - Title — load `/`, shoot with the `Open the case files` button visible.
  - Case select — after `Open the case files`, grid of TRS-01…TRS-12.
  - Gameplay — TRS-01 after committing two interventions, showing
    `Budget 2/2` and the scene.
  - Co-op room — lobby with a live room code; second device mid-join if a
    second machine is available (do not composite).
- [ ] **Trailer (30–60s, 10 beats):**
  1. Cold open on the sealed morning — cart, bell, splash.
  2. The disaster lands: skid, ring, ruined cargo.
  3. Text card: "The record is sealed."
  4. Press `Junction →` — the plan changes.
  5. `Run simulation` — evidence replays, all checks hold.
  6. `Present findings` → "Case closed".
  7. A later case (TRS-05+ camera split or TRS-09 two bells).
  8. Co-op: two devices editing one plan live.
  9. Level grid — twelve cases.
  10. Title card + URL + credits.
  Capture real gameplay only; per the handoff, no composited multiplayer, no
  unimplemented scenery, no implied unshipped content.

## 4. Truthfulness (required reading before submitting)

- All in-game art is **AI-generated** under a documented per-game art bible;
  provenance is recorded in `art/manifests/assets.json` (generator, per-asset
  prompt log, cutout tooling).
- The engine is **deterministic** — identical command logs produce identical
  canonical hashes; this is verified by the property/campaign test suite.
- **Playtests: PENDING (gate G5).** No human playtest sessions have been
  conducted or claimed at the time of this kit. Do not describe player
  reactions, difficulty data, or tester quotes anywhere in the entry.
- Claims to keep verbatim-true: 12 authored levels, solo + 2–4 player live
  co-op, no-install browser play, deterministic replay.
- Claims to avoid: human playtest results, "hand-drawn" art, any feature not
  reachable from the title screen today.

## 5. Platform & submission

**itch.io upload checklist**
- [ ] Project page: title, tagline #1, 80-word description
- [ ] Kind: HTML / browser game; viewport 1280×800 recommended, embed enabled
- [ ] Upload zipped `dist/` (client) or link the hosted deployment URL —
      confirm the submission surface accepts an external-URL entry
- [ ] Cover: 2400×1350 final (see PENDING note above)
- [ ] Screenshots ×4 (list above), trailer video
- [ ] Tags: `puzzle`, `logic`, `detective`, `causality`, `co-op`,
      `browser-game`, `singleplayer`, `multiplayer`
- [ ] Team credits: **Devin (Cognition AI)** — design, engineering, art
      direction; **owner** — direction, review, submission.
- [ ] Truthfulness note (section 4) pasted into the devlog/description footer
- [ ] Manual submission only — the rules prohibit automated entry; the owner
      clicks submit.
