import { SIN_TABLE } from "./sintable.js";
import { FOOTPRINT, leverUnderBucket, overlaps, pointIn, rectBox, type Box } from "./geometry.js";
import {
  C, FRICTION, G, MARBLE_R as R, VMAX,
  type MachineLevel, type PartKind, type Placement, type SimEvent, type SimEventType, type Verdict,
} from "./types.js";

const TOL = C / 64;
const LAUNCH = 1500;
const TOY_V = 128;
/** A wind-up toy runs down after this many steps (~11 cells). */
const TOY_WIND = 720;
const TROLLEY_V = 300;
const LEVER_HALF = 2 * C - C / 8;
const LEVER_RISE = 3072;
const DOMINO_H = 14746;
const DOMINO_HALF_T = 1147;
const QUIET_TICKS = 45;

const t = Math.trunc;
const sgn = (v: number): -1 | 0 | 1 => (v > 0 ? 1 : v < 0 ? -1 : 0);
function sinD(deci: number): number { return SIN_TABLE[Math.min(90, Math.max(0, Math.floor(deci / 10)))]!; }
function cosD(deci: number): number { return SIN_TABLE[90 - Math.min(90, Math.max(0, Math.floor(deci / 10)))]!; }

export interface Seg { x0: number; y0: number; x1: number; y1: number; len: number; owner: string }

export interface MarbleState {
  id: string; x: number; y: number; vx: number; vy: number;
  mode: "held" | "air" | "roll" | "caught" | "gone" | "splat";
  seg: string; d: number; s: number; rest: boolean; ax: number; ay: number; still: number; spin: number;
}
export interface DominoState {
  id: string; bx: number; by: number; ang: number; omega: number; dir: -1 | 0 | 1;
  state: "up" | "falling" | "down"; lean: string; pushed: boolean; placed: boolean;
}
export interface LeverState { id: string; px: number; py: number; tilt: -1 | 1; anim: number; link: string; released: boolean; placed: boolean }
export interface BucketState { id: string; x: number; y: number; lever: string; side: -1 | 0 | 1; caught: number; placed: boolean }
export interface ToyState { id: string; x: number; y: number; dir: -1 | 1; mode: "walk" | "stop" | "air" | "gone"; vy: number; step: number; placed: boolean }
export interface BellState { id: string; box: Box; rung: number; swing: number }
export interface TrolleyState { id: string; x: number; y: number; w: number; dir: -1 | 1; mode: "held" | "roll" | "safe" | "crash" | "fell"; v: number; vy: number; cargo: boolean }
export interface CakeState { id: string; box: Box; ruined: boolean }
export interface ArchState { id: string; sx: number }

export interface SimState {
  tick: number;
  marbles: MarbleState[];
  dominoes: DominoState[];
  levers: LeverState[];
  buckets: BucketState[];
  toys: ToyState[];
  bells: BellState[];
  trolleys: TrolleyState[];
  cakes: CakeState[];
  arches: ArchState[];
  stampHits: Array<number | null>;
  stampInOrder: boolean[];
  events: SimEvent[];
  quiet: number;
  done: boolean;
  ruinCause: string;
}

export interface World {
  level: MachineLevel;
  segs: Seg[];
  terrain: Box[];
  walls: Array<{ box: Box; name: string }>;
  buffers: Box[];
}

function mkSeg(x0: number, y0: number, x1: number, y1: number, owner: string): Seg {
  // offset the plank surface upward to the marble-centre track
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.round(Math.sqrt(dx * dx + dy * dy));
  const off = t((R * len) / dx);
  return { x0, y0: y0 - off, x1, y1: y1 - off, len, owner };
}

function rampSeg(kind: PartKind, gx: number, gy: number, flip: boolean, id: string): Seg {
  const f = FOOTPRINT[kind];
  const x0 = gx * C;
  const x1 = (gx + f.w) * C;
  const top = gy * C + C / 8;
  const bot = (gy + f.h) * C - C / 8;
  return flip ? mkSeg(x0, bot, x1, top, id) : mkSeg(x0, top, x1, bot, id);
}

export function leverEnds(l: LeverState): { lx: number; ly: number; rx: number; ry: number } {
  return { lx: l.px - LEVER_HALF, ly: l.py - l.tilt * LEVER_RISE, rx: l.px + LEVER_HALF, ry: l.py + l.tilt * LEVER_RISE };
}

function leverSeg(l: LeverState): Seg {
  const e = leverEnds(l);
  return mkSeg(e.lx, e.ly, e.rx, e.ry, `lever:${l.id}`);
}

export function buildWorld(level: MachineLevel, placements: readonly Placement[]): World {
  const segs: Seg[] = [];
  const terrain = level.terrain.map(rectBox);
  // merged terrain tops
  const tops = terrain
    .map((b) => ({ y: b.y0, x0: b.x0, x1: b.x1 }))
    .filter((top) => !terrain.some((o) => o.y1 === top.y && o.x0 <= top.x0 && o.x1 >= top.x1))
    .sort((a, b) => a.y - b.y || a.x0 - b.x0);
  const merged: Array<{ y: number; x0: number; x1: number }> = [];
  for (const top of tops) {
    const last = merged[merged.length - 1];
    if (last && last.y === top.y && last.x1 >= top.x0) last.x1 = Math.max(last.x1, top.x1);
    else merged.push({ ...top });
  }
  merged.forEach((m, i) => segs.push({ x0: m.x0, y0: m.y - R, x1: m.x1, y1: m.y - R, len: m.x1 - m.x0, owner: `ground:${i}` }));
  const parts = [...level.fixed.map((p) => ({ ...p, flip: !!p.flip })), ...placements];
  for (const p of parts) {
    if (p.kind === "ramp" || p.kind === "rampLong") segs.push(rampSeg(p.kind, p.gx, p.gy, p.flip, `ramp:${p.id}`));
  }
  const walls: World["walls"] = terrain.map((box) => ({ box, name: "a stone wall" }));
  const buffers: Box[] = [];
  for (const p of level.fixed) {
    if (p.kind === "barricade") walls.push({ box: { x0: p.gx * C, y0: p.gy * C + C / 4, x1: (p.gx + 2) * C, y1: (p.gy + 1) * C }, name: "the barricade" });
    if (p.kind === "buffer") buffers.push({ x0: p.gx * C + C / 4, y0: p.gy * C, x1: (p.gx + 1) * C, y1: (p.gy + 1) * C });
  }
  return { level, segs, terrain, walls, buffers };
}

export function createSim(world: World, placements: readonly Placement[]): SimState {
  const level = world.level;
  const parts = [...level.fixed.map((p) => ({ ...p, flip: !!p.flip, placed: false })), ...placements.map((p) => ({ ...p, placed: true }))];
  const st: SimState = {
    tick: 0, marbles: [], dominoes: [], levers: [], buckets: [], toys: [], bells: [], trolleys: [], cakes: [], arches: [],
    stampHits: level.stamps.map(() => null), stampInOrder: level.stamps.map(() => true), events: [], quiet: 0, done: false, ruinCause: "",
  };
  for (const p of parts) {
    const x = p.gx * C;
    const y = p.gy * C;
    switch (p.kind) {
      case "chute": {
        const fp = level.fixed.find((f) => f.id === p.id);
        const mx = x + C / 2;
        const my = y + C / 2;
        st.marbles.push({
          id: `${p.id}:marble`, x: mx, y: my, vx: fp?.vx ?? 0, vy: fp?.vy ?? 0, mode: fp?.held ? "held" : "air",
          seg: "", d: 0, s: 0, rest: false, ax: mx, ay: my, still: 0, spin: 0,
        });
        break;
      }
      case "domino":
        st.dominoes.push({ id: p.id, bx: x + C / 2, by: y + 2 * C, ang: 0, omega: 0, dir: 0, state: "up", lean: "", pushed: false, placed: p.placed });
        break;
      case "lever": {
        const fp = level.fixed.find((f) => f.id === p.id);
        st.levers.push({ id: p.id, px: x + 2 * C, py: y + C / 2, tilt: p.flip ? 1 : -1, anim: 0, link: fp?.link ?? "", released: false, placed: p.placed });
        break;
      }
      case "bucket":
        st.buckets.push({ id: p.id, x: x + C / 2, y: y + C, lever: "", side: 0, caught: 0, placed: p.placed });
        break;
      case "toy":
        st.toys.push({ id: p.id, x: x + C / 2, y: y + C, dir: p.flip ? -1 : 1, mode: "walk", vy: 0, step: 0, placed: p.placed });
        break;
      case "bell":
        st.bells.push({ id: p.id, box: { x0: x + t(C * 0.45), y0: y + t(C * 0.55), x1: x + t(C * 1.55), y1: y + t(C * 1.75) }, rung: -1, swing: 0 });
        break;
      case "trolley":
        st.trolleys.push({ id: p.id, x, y: y + 2 * C, w: 3 * C, dir: p.flip ? -1 : 1, mode: "held", v: 0, vy: 0, cargo: true });
        break;
      case "cake":
        st.cakes.push({ id: p.id, box: { x0: x + t(C * 0.1), y0: y + t(C * 0.35), x1: x + t(C * 0.9), y1: y + 2 * C }, ruined: false });
        break;
      case "arch":
        st.arches.push({ id: p.id, sx: x + t(C * 1.5) });
        break;
      default:
        break;
    }
  }
  for (const b of st.buckets) {
    const bp = parts.find((p) => p.id === b.id)!;
    const under = leverUnderBucket(level, placements, bp.gx, bp.gy, b.id);
    if (under) { b.lever = under.lever; b.side = under.side; }
  }
  syncBuckets(st);
  return st;
}

function emit(st: SimState, type: SimEventType, id: string, x: number, y: number): void {
  st.events.push({ tick: st.tick, type, id, x, y });
}

function hitStamp(world: World, st: SimState, kind: "ring" | "pass", target: string, x: number, y: number): void {
  world.level.stamps.forEach((s, i) => {
    if (s.kind !== kind || s.target !== target || st.stampHits[i] !== null) return;
    st.stampHits[i] = st.tick;
    const inOrder = st.stampHits.slice(0, i).every((h) => h !== null);
    st.stampInOrder[i] = inOrder;
    emit(st, inOrder ? "stamp" : "stampWrongOrder", s.id, x, y);
  });
}

function ring(world: World, st: SimState, b: BellState): void {
  b.swing = 40;
  if (b.rung < 0) {
    b.rung = st.tick;
    emit(st, "ring", b.id, (b.box.x0 + b.box.x1) >> 1, b.box.y0);
    hitStamp(world, st, "ring", b.id, (b.box.x0 + b.box.x1) >> 1, b.box.y0);
  }
}

function ruin(st: SimState, cause: string, x: number, y: number, id: string): void {
  if (!st.ruinCause) st.ruinCause = cause;
  emit(st, "splat", id, x, y);
}

function segByKey(world: World, st: SimState, key: string): Seg | undefined {
  if (key.startsWith("lever:")) {
    const l = st.levers.find((v) => `lever:${v.id}` === key);
    return l ? leverSeg(l) : undefined;
  }
  return world.segs.find((s) => s.owner === key);
}

function allSegs(world: World, st: SimState): Seg[] {
  return [...world.segs, ...st.levers.map(leverSeg)];
}

function lineY(s: Seg, x: number): number {
  return s.y0 + ((s.y1 - s.y0) * (x - s.x0)) / (s.x1 - s.x0);
}

function attach(m: MarbleState, s: Seg, x: number): void {
  const cx = Math.max(s.x0, Math.min(s.x1, x));
  m.seg = s.owner;
  m.d = t(((cx - s.x0) * s.len) / (s.x1 - s.x0));
  m.x = t(cx);
  m.y = t(lineY(s, cx));
  m.mode = "roll";
}

function syncRollVel(m: MarbleState, s: Seg): void {
  m.vx = t((m.s * (s.x1 - s.x0)) / s.len);
  m.vy = t((m.s * (s.y1 - s.y0)) / s.len);
}

function syncBuckets(st: SimState): void {
  for (const b of st.buckets) {
    if (!b.lever) continue;
    const l = st.levers.find((v) => v.id === b.lever);
    if (!l) continue;
    const e = leverEnds(l);
    b.x = b.side < 0 ? e.lx + C / 2 : e.rx - C / 2;
    const yEnd = b.side < 0 ? e.ly : e.ry;
    b.y = t(yEnd + ((b.side < 0 ? e.ry - e.ly : e.ly - e.ry) * (C / 2)) / (2 * LEVER_HALF)) - C / 16;
  }
}

function tipLever(world: World, st: SimState, l: LeverState, down: -1 | 1): void {
  if (l.tilt === down) return;
  l.tilt = down;
  l.anim = 10;
  emit(st, "tip", l.id, l.px, l.py);
  const key = `lever:${l.id}`;
  const seg = leverSeg(l);
  for (const m of st.marbles) {
    if (m.mode !== "roll" || m.seg !== key) continue;
    if (sgn(m.x - l.px) === -down) {
      m.mode = "air";
      m.seg = "";
      m.vy = -LAUNCH;
      m.vx = -down * 260;
      m.y -= C / 16;
      emit(st, "launch", m.id, m.x, m.y);
    } else attach(m, seg, m.x);
  }
  syncBuckets(st);
  for (const b of st.buckets) {
    if (b.lever !== l.id) continue;
    for (const m of st.marbles) if (m.mode === "caught" && m.seg === `bucket:${b.id}`) { m.x = b.x; m.y = b.y - R - C / 16; }
  }
  if (l.link && !l.released) {
    l.released = true;
    const tr = st.trolleys.find((v) => v.id === l.link);
    if (tr && tr.mode === "held") { tr.mode = "roll"; emit(st, "release", tr.id, tr.x, tr.y); }
    for (const m of st.marbles) {
      if (m.id === `${l.link}:marble` && m.mode === "held") { m.mode = "air"; emit(st, "release", m.id, m.x, m.y); }
    }
  }
  void world;
}

function marbleBox(m: MarbleState): Box { return { x0: m.x - R, y0: m.y - R, x1: m.x + R, y1: m.y + R }; }

function resolveBox(m: MarbleState, b: Box): boolean {
  const mb = marbleBox(m);
  if (!overlaps(mb, b)) return false;
  const ox = Math.min(mb.x1 - b.x0, b.x1 - mb.x0);
  const oy = Math.min(mb.y1 - b.y0, b.y1 - mb.y0);
  const fromAbove = m.y < (b.y0 + b.y1) / 2;
  // grazing a top corner: let the marble roll off instead of perching
  if (ox < oy && fromAbove && m.y <= b.y0) return false;
  if (ox >= oy && fromAbove && (m.x < b.x0 || m.x > b.x1)) return false;
  if (m.mode === "roll") { m.mode = "air"; m.seg = ""; }
  if (ox < oy) {
    if (m.x < (b.x0 + b.x1) / 2) { m.x = b.x0 - R; m.vx = -Math.abs(t(m.vx / 2)); }
    else { m.x = b.x1 + R; m.vx = Math.abs(t(m.vx / 2)); }
  } else if (m.y < (b.y0 + b.y1) / 2) {
    m.y = b.y0 - R;
    m.vy = -Math.abs(t(m.vy / 3));
    m.vx = t((m.vx * 7) / 8);
    if (Math.abs(m.vy) < 2 * G) { m.vy = 0; m.rest = true; }
  } else {
    m.y = b.y1 + R;
    m.vy = Math.abs(t(m.vy / 2));
  }
  return true;
}

function dominoBox(d: DominoState): Box {
  return { x0: d.bx - DOMINO_HALF_T, y0: d.by - DOMINO_H, x1: d.bx + DOMINO_HALF_T, y1: d.by };
}
function toyBox(toy: ToyState, x = toy.x): Box { return { x0: x - t(C * 0.4), y0: toy.y - t(C * 0.9), x1: x + t(C * 0.4), y1: toy.y - 1 }; }
function trolleyBase(tr: TrolleyState, x = tr.x): Box { return { x0: x, y0: tr.y - t(C * 1.1), x1: x + tr.w, y1: tr.y - 1 }; }
function trolleyCake(tr: TrolleyState, x = tr.x): Box { return { x0: x + t(C * 0.8), y0: tr.y - 2 * C + C / 8, x1: x + t(C * 2.2), y1: tr.y - t(C * 1.1) }; }
function bucketBox(b: BucketState): Box { return { x0: b.x - t(C * 0.42), y0: b.y - t(C * 0.8), x1: b.x + t(C * 0.42), y1: b.y }; }
function leverFoot(l: LeverState): Box { return { x0: l.px - C / 2, y0: l.py, x1: l.px + C / 2, y1: l.py + C / 2 }; }

function groundAt(world: World, x: number, y: number): boolean {
  return world.terrain.some((b) => b.y0 === y && x >= b.x0 && x < b.x1);
}

function topple(st: SimState, d: DominoState, dir: -1 | 1): void {
  if (d.state !== "up") return;
  d.state = "falling";
  d.dir = dir;
  d.omega = 4;
  emit(st, "topple", d.id, d.bx, d.by);
}

function stepMarble(world: World, st: SimState, m: MarbleState): void {
  if (m.mode === "held" || m.mode === "caught" || m.mode === "gone" || m.mode === "splat") return;
  const px = m.x;
  m.rest = false;
  if (m.mode === "roll") {
    const seg = segByKey(world, st, m.seg);
    if (!seg) { m.mode = "air"; m.seg = ""; }
    else {
      const a = t((G * (seg.y1 - seg.y0)) / seg.len);
      m.s += a;
      // cobbled street floor drags more than smooth ledges; slow marbles settle quickly
      const street = seg.owner.startsWith("ground:") && seg.y0 >= (world.level.rows - 2) * C - R - 1;
      const slow = Math.abs(m.s) < 120 && a === 0;
      if (slow || street || st.tick % 3 === 0 || Math.abs(m.s) < 8) {
        const f = slow ? 3 * FRICTION : FRICTION;
        if (m.s > 0) m.s = Math.max(0, m.s - f);
        else if (m.s < 0) m.s = Math.min(0, m.s + f);
      }
      m.s = Math.max(-VMAX, Math.min(VMAX, m.s));
      const nd = m.d + m.s;
      syncRollVel(m, seg);
      if (nd < 0 || nd > seg.len) {
        m.x = t(seg.x0 + ((seg.x1 - seg.x0) * nd) / seg.len);
        m.y = t(seg.y0 + ((seg.y1 - seg.y0) * nd) / seg.len);
        m.mode = "air";
        m.seg = "";
      } else {
        m.d = nd;
        m.x = t(seg.x0 + ((seg.x1 - seg.x0) * nd) / seg.len);
        m.y = t(seg.y0 + ((seg.y1 - seg.y0) * nd) / seg.len);
        // hop onto a part whose start sits on our path (e.g. a ramp resting on the floor)
        for (const o of allSegs(world, st)) {
          if (o.owner === seg.owner) continue;
          const ex = m.s > 0 ? o.x0 : o.x1;
          const ey = m.s > 0 ? o.y0 : o.y1;
          const lo = Math.min(px, m.x);
          const hi = Math.max(px, m.x);
          if (ex >= lo && ex <= hi && Math.abs(lineY(seg, ex) - ey) < C / 6 && m.s !== 0) {
            attach(m, o, ex);
            break;
          }
        }
        if (m.seg.startsWith("lever:")) {
          const l = st.levers.find((v) => `lever:${v.id}` === m.seg)!;
          const side = sgn(m.x - l.px);
          // wired brakes/latches are stiff: a marble rolling across them is not enough weight
          if (!l.link && side === -l.tilt && Math.abs(m.x - l.px) > C / 2) tipLever(world, st, l, side as -1 | 1);
        }
      }
    }
  }
  if (m.mode === "air") {
    m.vy = Math.min(VMAX, m.vy + G);
    const x0 = m.x;
    const y0 = m.y;
    const x1 = m.x + m.vx;
    const y1 = m.y + m.vy;
    let best: { u: number; seg: Seg; ix: number } | null = null;
    for (const s of allSegs(world, st)) {
      const f0 = y0 - lineY(s, x0);
      const f1 = y1 - lineY(s, x1);
      if (!(f0 <= TOL && f1 > 0)) continue;
      const u = f0 < 0 ? f0 / (f0 - f1) : 0;
      const ix = x0 + m.vx * u;
      if (ix < s.x0 || ix > s.x1) continue;
      if (!best || u < best.u) best = { u, seg: s, ix };
    }
    if (best) {
      const s = best.seg;
      const normal = Math.abs(t((m.vy * (s.x1 - s.x0) - m.vx * (s.y1 - s.y0)) / s.len));
      m.s = t((m.vx * (s.x1 - s.x0) + m.vy * (s.y1 - s.y0)) / s.len);
      attach(m, s, best.ix);
      syncRollVel(m, s);
      if (normal > 260) emit(st, "bounce", m.id, m.x, m.y);
      if (s.owner.startsWith("lever:")) {
        const l = st.levers.find((v) => `lever:${v.id}` === s.owner)!;
        const side = sgn(m.x - l.px);
        if (side === -l.tilt && Math.abs(m.x - l.px) > C / 4) tipLever(world, st, l, side as -1 | 1);
      }
    } else {
      m.x = x1;
      m.y = y1;
    }
  }
  m.spin += m.x - px;
  marbleContacts(world, st, m);
}

function marbleContacts(world: World, st: SimState, m: MarbleState): void {
  const level = world.level;
  const fast = Math.abs(m.vx) + Math.abs(m.vy) > 300;
  // scene edges
  if (m.x < R) { m.x = R; m.vx = Math.abs(t(m.vx / 2)); if (m.mode === "roll") { m.mode = "air"; m.seg = ""; } }
  if (m.x > level.cols * C - R) { m.x = level.cols * C - R; m.vx = -Math.abs(t(m.vx / 2)); if (m.mode === "roll") { m.mode = "air"; m.seg = ""; } }
  // buckets catch before anything else
  for (const b of st.buckets) {
    const inner = { x0: b.x - t(C * 0.36), y0: b.y - t(C * 0.8), x1: b.x + t(C * 0.36), y1: b.y };
    if (m.vy >= 0 && pointIn(m.x, m.y, inner)) {
      m.mode = "caught";
      m.seg = `bucket:${b.id}`;
      m.x = b.x;
      m.y = b.y - R - C / 16;
      m.vx = 0; m.vy = 0; m.s = 0;
      b.caught++;
      emit(st, "catch", b.id, b.x, b.y);
      if (b.lever) {
        const l = st.levers.find((v) => v.id === b.lever);
        if (l && l.tilt === -b.side) tipLever(world, st, l, b.side as -1 | 1);
      }
      return;
    }
  }
  for (const w of world.walls) if (resolveBox(m, w.box) && fast) emit(st, "bounce", m.id, m.x, m.y);
  for (const b of world.buffers) resolveBox(m, b);
  for (const b of st.bells) if (resolveBox(m, b.box)) ring(world, st, b);
  for (const d of st.dominoes) {
    if (d.state !== "up") continue;
    const dir = sgn(m.vx) || sgn(d.bx - m.x) || 1;
    if (resolveBox(m, dominoBox(d))) topple(st, d, dir as -1 | 1);
  }
  for (const toy of st.toys) {
    if (toy.mode === "gone") continue;
    const dir = sgn(m.vx) || sgn(toy.x - m.x) || 1;
    if (resolveBox(m, toyBox(toy))) {
      toy.dir = dir as -1 | 1;
      if (toy.mode === "stop") toy.mode = "walk";
      emit(st, "push", toy.id, toy.x, toy.y);
    }
  }
  for (const c of st.cakes) {
    if (!c.ruined && overlaps(marbleBox(m), c.box)) {
      c.ruined = true;
      m.mode = "splat";
      ruin(st, "The marble splattered the cake.", m.x, m.y, c.id);
      return;
    }
  }
  for (const tr of st.trolleys) {
    if (tr.cargo && overlaps(marbleBox(m), trolleyCake(tr))) {
      tr.cargo = false;
      m.mode = "splat";
      ruin(st, "The marble splattered the cake on the trolley.", m.x, m.y, tr.id);
      return;
    }
    resolveBox(m, trolleyBase(tr));
  }
  for (const b of st.buckets) resolveBox(m, bucketBox(b));
  if (m.y > level.rows * C + R) {
    m.mode = "gone";
    emit(st, "plop", m.id, m.x, level.rows * C);
  }
}

function stepDomino(world: World, st: SimState, d: DominoState): void {
  if (d.state !== "falling") return;
  if (d.lean) {
    const o = st.dominoes.find((v) => v.id === d.lean)!;
    const target = Math.min(o.ang, 860);
    if (target > d.ang) d.ang = target;
    if (o.state === "down") d.state = "down";
    return;
  }
  d.omega += 2;
  d.ang = Math.min(900, d.ang + d.omega);
  if (d.ang >= 900) { d.state = "down"; emit(st, "bounce", d.id, d.bx, d.by); }
  const dir = d.dir as -1 | 1;
  const tx = d.bx + t((dir * DOMINO_H * sinD(d.ang)) / 1024);
  const ty = d.by - t((DOMINO_H * cosD(d.ang)) / 1024);
  const rest = (): void => { d.state = "down"; };
  for (const o of st.dominoes) {
    if (o === d || o.state !== "up") continue;
    const b = dominoBox(o);
    if (pointIn(tx, ty, { x0: b.x0 - C / 16, y0: b.y0, x1: b.x1 + C / 16, y1: b.y1 })) { topple(st, o, dir); d.lean = o.id; return; }
  }
  for (const w of world.walls) if (pointIn(tx, ty, w.box)) { rest(); return; }
  for (const b of world.buffers) if (pointIn(tx, ty, b)) { rest(); return; }
  for (const b of st.bells) if (pointIn(tx, ty, b.box)) { ring(world, st, b); rest(); return; }
  for (const l of st.levers) {
    const e = leverEnds(l);
    const side = -l.tilt as -1 | 1;
    const ex = side < 0 ? e.lx : e.rx;
    const ey = side < 0 ? e.ly : e.ry;
    if (Math.abs(tx - ex) < t(C * 0.7) && ty >= ey - C / 2 && ty <= ey + t(C * 0.6)) tipLever(world, st, l, side);
  }
  for (const toy of st.toys) {
    if (toy.mode !== "gone" && pointIn(tx, ty, toyBox(toy))) { toy.dir = dir; toy.mode = "walk"; emit(st, "push", toy.id, toy.x, toy.y); rest(); return; }
  }
  for (const c of st.cakes) {
    if (!c.ruined && pointIn(tx, ty, c.box)) { c.ruined = true; ruin(st, "A domino fell onto the cake.", tx, ty, c.id); rest(); return; }
  }
  for (const tr of st.trolleys) {
    if (tr.cargo && pointIn(tx, ty, trolleyCake(tr))) { tr.cargo = false; ruin(st, "A domino fell onto the cake on the trolley.", tx, ty, tr.id); rest(); return; }
    if (pointIn(tx, ty, trolleyBase(tr))) { rest(); return; }
  }
  for (const b of st.buckets) if (pointIn(tx, ty, bucketBox(b))) { rest(); return; }
  if (!d.pushed) {
    for (const m of st.marbles) {
      if ((m.mode === "roll" || m.mode === "air") && Math.abs(tx - m.x) < R + C / 8 && Math.abs(ty - m.y) < R + C / 8) {
        d.pushed = true;
        if (m.mode === "roll") m.s += dir * 600;
        else m.vx += dir * 600;
        emit(st, "push", m.id, m.x, m.y);
      }
    }
  }
}

function toyBlocked(world: World, st: SimState, toy: ToyState, box: Box): boolean {
  let blocked = false;
  for (const w of world.walls) if (overlaps(box, w.box)) blocked = true;
  for (const b of world.buffers) if (overlaps(box, b)) blocked = true;
  for (const d of st.dominoes) {
    if (d.state === "down" || d.ang >= 600) continue;
    if (d.state === "up" && overlaps(box, dominoBox(d))) { topple(st, d, toy.dir); blocked = true; }
    else if (d.state === "falling" && Math.abs(d.bx - toy.x) < C) blocked = true;
  }
  for (const b of st.bells) if (overlaps(box, b.box)) { ring(world, st, b); blocked = true; }
  for (const c of st.cakes) {
    if (overlaps(box, c.box)) {
      if (!c.ruined) { c.ruined = true; ruin(st, "The wind-up toy marched into the cake.", toy.x, toy.y, c.id); }
      blocked = true;
    }
  }
  for (const tr of st.trolleys) if (overlaps(box, trolleyBase(tr))) blocked = true;
  for (const b of st.buckets) if (!b.lever && overlaps(box, bucketBox(b))) blocked = true;
  for (const l of st.levers) if (overlaps(box, leverFoot(l))) blocked = true;
  for (const o of st.toys) if (o !== toy && o.mode !== "gone" && overlaps(box, toyBox(o))) blocked = true;
  return blocked;
}

function stepToy(world: World, st: SimState, toy: ToyState): void {
  if (toy.mode === "gone") return;
  if (toy.mode === "air") {
    toy.vy = Math.min(VMAX, toy.vy + G);
    const ny = toy.y + toy.vy;
    const land = world.terrain.find((b) => b.y0 > toy.y - 1 && b.y0 <= ny && toy.x >= b.x0 && toy.x < b.x1);
    if (land) { toy.y = land.y0; toy.vy = 0; toy.mode = "walk"; emit(st, "bounce", toy.id, toy.x, toy.y); }
    else toy.y = ny;
    if (toy.y > world.level.rows * C + C) { toy.mode = "gone"; emit(st, "plop", toy.id, toy.x, world.level.rows * C); }
    return;
  }
  if (!groundAt(world, toy.x, toy.y)) { toy.mode = "air"; toy.vy = 0; return; }
  if (toy.step >= TOY_WIND) { toy.mode = "stop"; return; }
  const nx = toy.x + toy.dir * TOY_V;
  if (toyBlocked(world, st, toy, toyBox(toy, nx))) { toy.mode = "stop"; return; }
  toy.mode = "walk";
  toy.x = nx;
  toy.step++;
  if (nx < 0 || nx > world.level.cols * C) toy.mode = "gone";
}

function obstacleName(world: World, st: SimState, tr: TrolleyState, box: Box): string | null {
  for (const w of world.walls) if (overlaps(box, w.box)) return w.name;
  for (const d of st.dominoes) if (d.state !== "down" && d.ang < 600 && overlaps(box, dominoBox(d))) return "a standing domino";
  for (const toy of st.toys) if (toy.mode !== "gone" && overlaps(box, toyBox(toy))) return "the wind-up toy";
  for (const c of st.cakes) if (overlaps(box, c.box)) return "the cake stand";
  for (const b of st.bells) if (overlaps(box, b.box)) return "a bell";
  for (const b of st.buckets) if (!b.lever && overlaps(box, bucketBox(b))) return "a bucket";
  for (const l of st.levers) if (overlaps(box, leverFoot(l))) return "a seesaw";
  for (const o of st.trolleys) if (o !== tr && overlaps(box, trolleyBase(o))) return "another trolley";
  return null;
}

function stepTrolley(world: World, st: SimState, tr: TrolleyState): void {
  if (tr.mode === "fell") {
    if (tr.y < world.level.rows * C + 4 * C) { tr.vy = Math.min(VMAX, tr.vy + G); tr.y += tr.vy; tr.x += tr.dir * (tr.v >> 1); }
    return;
  }
  if (tr.mode !== "roll") return;
  tr.v = Math.min(TROLLEY_V, tr.v + 6);
  const nx = tr.x + tr.dir * tr.v;
  const before = tr.x + (tr.w >> 1);
  const after = nx + (tr.w >> 1);
  for (const b of world.buffers) {
    const box = trolleyBase(tr, nx);
    if (overlaps(box, b)) {
      tr.x = tr.dir > 0 ? b.x0 - tr.w : b.x1;
      tr.mode = "safe";
      emit(st, "safe", tr.id, tr.x, tr.y);
      return;
    }
  }
  const hit = obstacleName(world, st, tr, trolleyBase(tr, nx));
  if (hit) {
    tr.mode = "crash";
    emit(st, "crash", tr.id, tr.dir > 0 ? nx + tr.w : nx, tr.y - C);
    if (tr.cargo) { tr.cargo = false; ruin(st, `The trolley crashed into ${hit} and the cake flew off.`, tr.x, tr.y, tr.id); }
    return;
  }
  tr.x = nx;
  for (const a of st.arches) {
    if ((before < a.sx && after >= a.sx) || (before > a.sx && after <= a.sx)) {
      emit(st, "pass", a.id, a.sx, tr.y);
      hitStamp(world, st, "pass", a.id, a.sx, tr.y - 3 * C);
    }
  }
  if (!groundAt(world, after, tr.y)) {
    tr.mode = "fell";
    emit(st, "fall", tr.id, after, tr.y);
    if (tr.cargo) { tr.cargo = false; ruin(st, "The trolley rolled off the edge with the cake.", after, tr.y, tr.id); }
  }
}

function isActive(st: SimState, rowsLimit: number): boolean {
  for (const m of st.marbles) {
    if (m.mode !== "air" && m.mode !== "roll") continue;
    if (m.still >= 30) continue;
    if (m.mode === "air" && !m.rest) return true;
    if (m.mode === "roll" && m.s !== 0) return true;
  }
  if (st.dominoes.some((d) => d.state === "falling")) return true;
  if (st.levers.some((l) => l.anim > 0)) return true;
  if (st.toys.some((toy) => toy.mode === "walk" || toy.mode === "air")) return true;
  return st.trolleys.some((tr) => tr.mode === "roll" || (tr.mode === "fell" && tr.y < rowsLimit));
}

/** Advance the simulation by one tick (mutates `st`). */
export function stepSim(world: World, st: SimState): void {
  if (st.done) return;
  st.tick++;
  for (const m of st.marbles) stepMarble(world, st, m);
  for (const d of st.dominoes) stepDomino(world, st, d);
  for (const toy of st.toys) stepToy(world, st, toy);
  for (const tr of st.trolleys) stepTrolley(world, st, tr);
  for (const l of st.levers) if (l.anim > 0) l.anim--;
  for (const b of st.bells) if (b.swing > 0) b.swing--;
  syncBuckets(st);
  for (const m of st.marbles) {
    if (Math.abs(m.x - m.ax) + Math.abs(m.y - m.ay) < C / 8) m.still++;
    else { m.ax = m.x; m.ay = m.y; m.still = 0; }
  }
  st.quiet = isActive(st, world.level.rows * C + 4 * C) ? 0 : st.quiet + 1;
  if (st.quiet >= QUIET_TICKS || st.tick >= world.level.maxTicks) st.done = true;
}

export function verdictOf(world: World, st: SimState): Verdict {
  const stamps = world.level.stamps.map((s, i) => ({ id: s.id, label: s.label, hitTick: st.stampHits[i] ?? null, inOrder: st.stampInOrder[i] ?? true }));
  const cakeSafe = !st.ruinCause && st.cakes.every((c) => !c.ruined) && st.trolleys.every((tr) => tr.cargo);
  const reasons: string[] = [];
  stamps.forEach((s, i) => {
    if (s.hitTick === null) reasons.push(`No one saw “${s.label}”.`);
    else if (!s.inOrder) {
      const missing = stamps.slice(0, i).find((p) => p.hitTick === null || p.hitTick > (s.hitTick ?? 0));
      reasons.push(missing ? `“${s.label}” happened before “${missing.label}”.` : `“${s.label}” happened out of order.`);
    }
  });
  if (!cakeSafe) reasons.push(st.ruinCause || "The cake did not survive.");
  const success = stamps.every((s) => s.hitTick !== null && s.inOrder) && cakeSafe;
  return { success, stamps, cakeSafe, reasons, ticks: st.tick };
}

export interface RunResult { verdict: Verdict; events: SimEvent[]; ticks: number; final: SimState }

/** Run a full machine to completion; pure function of level + placements. */
export function runMachine(level: MachineLevel, placements: readonly Placement[]): RunResult {
  const world = buildWorld(level, placements);
  const st = createSim(world, placements);
  while (!st.done) stepSim(world, st);
  return { verdict: verdictOf(world, st), events: st.events, ticks: st.tick, final: st };
}
