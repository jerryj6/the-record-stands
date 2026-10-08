import { MACHINE_LEVELS } from "../src/content/machine/levels.js";
import { FOOTPRINT } from "../src/engine/machine/geometry.js";

let fail = false;
const err = (m: string): void => { console.error(m); fail = true; };
const ids = new Set<string>();
const codeLike = /[a-z][A-Z]|[_.=]|\b(true|false|null|undefined)\b/;
for (const l of MACHINE_LEVELS) {
  if (ids.has(l.id)) err(`duplicate level id ${l.id}`);
  ids.add(l.id);
  for (const s of l.stamps) {
    const t = l.fixed.find((f) => f.id === s.target);
    if (!t) err(`${l.id}: stamp ${s.id} targets missing part ${s.target}`);
    else if ((s.kind === "ring" && t.kind !== "bell") || (s.kind === "pass" && t.kind !== "arch")) err(`${l.id}: stamp ${s.id} kind/target mismatch`);
    if (codeLike.test(s.label)) err(`${l.id}: stamp label looks like code: ${s.label}`);
  }
  for (const text of [l.title, l.brief, l.hint ?? ""]) if (/[a-z][A-Z]|[_=]/.test(text)) err(`${l.id}: player text looks like code: ${text}`);
  for (const f of l.fixed) {
    const fp = FOOTPRINT[f.kind];
    if (f.gx < 0 || f.gy < 0 || f.gx + fp.w > l.cols || f.gy + fp.h > l.rows) err(`${l.id}: ${f.id} off the scene`);
  }
  if (l.stretches[0] !== 0 || l.stretches[l.stretches.length - 1] !== l.cols) err(`${l.id}: stretches must cover the scene`);
}
console.log(`content: ${MACHINE_LEVELS.length}/12 main levels authored (rework slice)`);
process.exit(fail ? 1 : 0);
