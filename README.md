# The Record Stands

A browser contraption puzzle. The gala disaster happened — rebuild it so every witness is still right and the cake survives, using a live chain reaction you build by hand.

Drag ramps, dominoes, seesaws, buckets and wind-up toys onto a pop-up-book cross-section of the town, press **Play**, and watch the deterministic chain reaction. Fixed witness stamps ("BELL RINGS", "TROLLEY PASSES ARCH") must all light, in order, and the cake must survive. See `docs/DECISIONS.md` (owner concept-rework decision 2026-10-08).

- **Vertical slice:** levels 1–3 playable solo (12 main levels planned)
- **Relay co-op (2–4):** start a room, share the code; each player builds their own stretch, everyone presses Ready, and the server-committed run plays identically on every screen
- Generated art (per-game art bible) + procedural WebAudio cues

## Run

```bash
npm ci && npm run build && npm start   # serves site + ws rooms on :10000
npm run dev                            # vite dev server (client only)
npm run dev:server                     # room server dev
```

## Verify

```bash
npm run check:source && npm run check:static
npm run test:unit && npm run test:campaign && npm run test:depth && npm run test:network && npm run test:e2e
npm run audit:assets && npm run audit:release
npm run verify:production --url https://<deployed> --sha <commit>
```

## Layout

- `src/engine/machine` — integer tick-based contraption sim + build reducer (no DOM/network/time)
- `src/content/machine/levels.ts` — slice levels 1–3
- `src/client/game` — PixiJS 8 full-window scene (Stage, procedural art, sound) · `src/client/App.tsx` — React menus/HUD
- `src/server` — ws room server; `trs-adapter.ts` holds the shared build state
- `scripts/trace-machine.ts`, `scripts/search-machine.ts` — level design tools (trace a run, brute-force one-part builds)
- `public/assets` — generated art (sprites/, covers, materials); `art/manifests/assets.json`
- `docs/` — MASTER-HANDOFF (binding contract), REQUIREMENTS, DECISIONS, AUDIO-MANIFEST, PLAYTEST-KIT
- `evidence/INDEX.md` — verification evidence index
