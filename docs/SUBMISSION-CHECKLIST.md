# Submission kit checklist — The Record Stands

Adapted from GAME-DESIGN-BIBLE Part 12 (§12 submission kit + §12.18
supplement). Run top-to-bottom before the deadline; do the dry run once
against the real submission form.

## 1. Playable build
- [ ] Deployed URL recorded in `fact-sheet.txt` and README.
- [ ] `npm run verify:production --url https://<deployed> --sha <commit>` green.
- [ ] Clean-browser check: open in a private window, no console, finish
      TRS-01 end to end (intro → trap → solve → solved badge after reload).
- [ ] Evidence: scripted playthrough `evidence/p5-*.png` covers exactly this
      path — recapture against the deployed build, not localhost.

## 2. Documentation
- [x] README: premise, run, verify, layout.
- [x] `fact-sheet.txt` at repo root (fill Link/Contact at ship time).
- [ ] "Known limitations" line stays honest (no mid-level save; G5 open).

## 3. Screenshots (5–8, named, current build)
- [ ] `evidence/p5-02-case.png` — case screen, sealed observations.
- [ ] `evidence/p5-03-trap-fail.png` — fail-state teaching (divergence
      line + first-breach verdict) — the judging differentiator.
- [ ] `evidence/p5-07-real-solve.png` — solved run, budget 2/2.
- [ ] `evidence/p5-05-autoplay.png` — tape-replay controls.
- [ ] `evidence/p5-09-select-solved.png` — case grid with solved badges.
- [ ] +1–3 from a mid-campaign level (TRS-09 double-ring or TRS-12 finale)
      recaptured on the deployed build.

## 4. Trailer (≤90s, real gameplay, 6-beat structure)
- [ ] Beat 1 (0–10s): verb + stakes — "the accident is recorded; change the
      cause, keep every fact."
- [ ] Beat 2: TRS-01 trap run → red verdict + first breach.
- [ ] Beat 3: the insight move (junction→dry lane + toy).
- [ ] Beat 4: autoplay replay with bell cue — music cuts on the insight.
- [ ] Beat 5: TRS-09 two-bells-same-beat or TRS-12 finale montage.
- [ ] Beat 6: co-op room code → 4 cursors committing interventions.
- [ ] Caption card: title + playable link.

## 5. Pitch + evidence
- [ ] 1-page pitch: premise, 12 cases, co-op, deterministic engine, the
      re-let-the-street idiom, enumeration-audited alternates.
- [ ] Design evidence bundle: LEVELS.md discovered-alternates appendix,
      dataroom audits, test counts.
- [ ] Honesty ledger: scripted-vs-human playtest status (G5), what is
      claimed vs verified — mirror docs/RELEASE-STATUS.json.

## 6. Dry run + backup
- [ ] Walk the whole submission once before deadline day.
- [ ] Zip: kit + build + docs, kept offline.
- [ ] Playtest footage: consent, uncut failures, timestamps (G5 session).
