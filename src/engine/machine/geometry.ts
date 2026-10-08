import { C, type AnyKind, type FixedPart, type MachineLevel, type PartKind, type Placement, type Rect } from "./types.js";

export const FOOTPRINT: Record<AnyKind, { w: number; h: number }> = {
  ramp: { w: 2, h: 1 },
  rampLong: { w: 4, h: 2 },
  domino: { w: 1, h: 2 },
  lever: { w: 4, h: 1 },
  bucket: { w: 1, h: 1 },
  toy: { w: 1, h: 1 },
  bell: { w: 2, h: 2 },
  trolley: { w: 3, h: 2 },
  cake: { w: 1, h: 2 },
  arch: { w: 3, h: 4 },
  barricade: { w: 2, h: 1 },
  chute: { w: 1, h: 1 },
  buffer: { w: 1, h: 1 },
};

export const PART_KINDS: readonly PartKind[] = ["ramp", "rampLong", "domino", "lever", "bucket", "toy"];

export interface Box { x0: number; y0: number; x1: number; y1: number }

export function rectBox(r: Rect): Box {
  return { x0: r.x * C, y0: r.y * C, x1: (r.x + r.w) * C, y1: (r.y + r.h) * C };
}

export function overlaps(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

export function pointIn(x: number, y: number, b: Box): boolean {
  return x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
}

/** Cells a part blocks for placement purposes. Ramps only block their diagonal cells. */
export function occupiedCells(kind: AnyKind, gx: number, gy: number, flip: boolean): Array<[number, number]> {
  const f = FOOTPRINT[kind];
  if (kind === "arch") return [[gx, gy], [gx + 2, gy], [gx, gy + 1], [gx + 2, gy + 1]];
  if (kind === "rampLong") {
    return flip
      ? [[gx, gy + 1], [gx + 1, gy + 1], [gx + 2, gy], [gx + 3, gy]]
      : [[gx, gy], [gx + 1, gy], [gx + 2, gy + 1], [gx + 3, gy + 1]];
  }
  const out: Array<[number, number]> = [];
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) out.push([gx + x, gy + y]);
  return out;
}

export function isTerrain(level: MachineLevel, cx: number, cy: number): boolean {
  return level.terrain.some((r) => cx >= r.x && cx < r.x + r.w && cy >= r.y && cy < r.y + r.h);
}

export function stretchOf(level: MachineLevel, col: number): number {
  for (let i = 0; i < level.stretches.length - 1; i++) {
    const a = level.stretches[i]!;
    const b = level.stretches[i + 1]!;
    if (col >= a && col < b) return i;
  }
  return -1;
}

export type PlaceCheck = { ok: true } | { ok: false; reason: string };

export interface PlaceRange { from: number; to: number }

/** Validate putting a part at a grid position. `range` limits columns (relay stretch). */
export function canPlace(
  level: MachineLevel,
  placements: readonly Placement[],
  kind: PartKind,
  gx: number,
  gy: number,
  flip: boolean,
  ignoreId?: string,
  range?: PlaceRange,
): PlaceCheck {
  const f = FOOTPRINT[kind];
  if (!Number.isInteger(gx) || !Number.isInteger(gy)) return { ok: false, reason: "Parts snap to the grid." };
  if (gx < 0 || gy < 0 || gx + f.w > level.cols || gy + f.h > level.rows) return { ok: false, reason: "That spot is off the scene." };
  if (range && (gx < range.from || gx + f.w > range.to)) return { ok: false, reason: "That stretch belongs to your partner." };
  const mine = occupiedCells(kind, gx, gy, flip);
  const taken = new Set<string>();
  for (const p of level.fixed) for (const [x, y] of occupiedCells(p.kind, p.gx, p.gy, !!p.flip)) taken.add(`${x},${y}`);
  for (const p of placements) {
    if (p.id === ignoreId) continue;
    for (const [x, y] of occupiedCells(p.kind, p.gx, p.gy, p.flip)) taken.add(`${x},${y}`);
  }
  for (const [x, y] of mine) {
    if (isTerrain(level, x, y)) return { ok: false, reason: "Solid stone is in the way." };
    if (taken.has(`${x},${y}`)) return { ok: false, reason: "Another part is already there." };
  }
  if (kind === "domino" || kind === "toy") {
    if (!isTerrain(level, gx, gy + f.h)) return { ok: false, reason: "It needs solid ground underneath." };
  }
  if (kind === "lever") {
    if (!isTerrain(level, gx + 1, gy + 1) || !isTerrain(level, gx + 2, gy + 1)) return { ok: false, reason: "A seesaw needs ground under its middle." };
  }
  if (kind === "bucket") {
    const onGround = isTerrain(level, gx, gy + 1);
    const onLever = leverUnderBucket(level, placements, gx, gy, ignoreId) !== null;
    if (!onGround && !onLever) return { ok: false, reason: "A bucket sits on the ground or on a seesaw end." };
  }
  return { ok: true };
}

interface LeverLike { id: string; gx: number; gy: number }

export function leverUnderBucket(
  level: MachineLevel,
  placements: readonly Placement[],
  gx: number,
  gy: number,
  ignoreId?: string,
): { lever: string; side: -1 | 1 } | null {
  const levers: LeverLike[] = [
    ...level.fixed.filter((p) => p.kind === "lever"),
    ...placements.filter((p) => p.kind === "lever" && p.id !== ignoreId),
  ];
  for (const l of levers) {
    if (gy !== l.gy - 1) continue;
    if (gx === l.gx) return { lever: l.id, side: -1 };
    if (gx === l.gx + 3) return { lever: l.id, side: 1 };
  }
  return null;
}

export function allParts(level: MachineLevel, placements: readonly Placement[]): Array<FixedPart & { placed: boolean }> {
  return [
    ...level.fixed.map((p) => ({ ...p, placed: false })),
    ...placements.map((p) => ({ id: p.id, kind: p.kind, gx: p.gx, gy: p.gy, flip: p.flip, placed: true })),
  ];
}
