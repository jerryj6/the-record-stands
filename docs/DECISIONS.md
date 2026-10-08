# Decision log — The Record Stands
Format: date · class (detail/elaboration/deviation) · requirements · proposer · reviewer · evidence · owner approval when required.
Master SHA-256: 9eafb3af47415a2015a9d0842271a6524f6aca2536ab714721c79438b135eea7

## 2026-10-08 · deviation (concept rework) · GME/TRS/FLOW/NET/ART · owner (jerryj6) · reviewer: pending independent QA · evidence: PR "rework vertical slice"
Owner concept-rework decision 2026-10-08: the owner rejected the previous sealed-observation build ("complete slop… none of these are even real games") and replaced the concept with a **contraption sandbox**. Players drag parts onto a side-view pop-up-book cross-section of the town, press Play, and watch a deterministic chain reaction; fixed witness stamps (e.g. "BELL RINGS", "TROLLEY PASSES ARCH") must all be triggered in the stated order and the cake must survive. Relay co-op splits the scene into 2–4 stretches, one per player; everyone presses Ready and the same run plays on every screen.
- Supersedes the master handoff's locked-identity clauses for TRS only. Unchanged: 12 main levels eventually, solo + live 2–4 player co-op by room code, phone + laptop, no login, real-human playtests (G5) before release. `docs/MASTER-HANDOFF.md` is not edited.
- Engine: `src/engine/machine` — integer, tick-based grid sim (no free-physics engine). Content: `src/content/machine/levels.ts` (slice levels 1–3). Room adapter `src/server/trs-adapter.ts` now carries the shared build state; the server decides when a run starts and replays it to every client as a committed event.
- Retired from the client flow (still in git history): `src/engine/trs`, `src/content/levels`, `src/content/level-cards.ts` and their tests. Pixel-baseline visual tests were replaced with a HUD layout guard because baselines had accepted glitches.
- Scope of this entry: vertical slice only (levels 1–3). Levels 4–12 await owner review of the slice.
