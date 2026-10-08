/** Contraption sandbox — shared types. All positions are integers. */

/** Fine units per grid cell. */
export const C = 8192;
/** Gravity in fine units per tick². */
export const G = 40;
export const VMAX = 2048;
export const MARBLE_R = 2458;
export const FRICTION = 1;
export const TICKS_PER_SECOND = 60;

export type PartKind = "ramp" | "rampLong" | "domino" | "lever" | "bucket" | "toy";
export type FixedOnlyKind = "bell" | "trolley" | "cake" | "arch" | "barricade" | "chute" | "buffer";
export type AnyKind = PartKind | FixedOnlyKind;

export interface Rect { x: number; y: number; w: number; h: number }

export interface Placement {
  id: string;
  kind: PartKind;
  gx: number;
  gy: number;
  flip: boolean;
}

export interface FixedPart {
  id: string;
  kind: AnyKind;
  gx: number;
  gy: number;
  flip?: boolean;
  /** Player-facing name shown on the scene, e.g. "Town bell". */
  label?: string;
  /** chute: hold the marble until a linked lever tips. trolley: always held until linked. */
  held?: boolean;
  /** lever: id of a trolley or chute this lever releases when it tips. */
  link?: string;
  /** chute: launch velocity in fine units/tick. */
  vx?: number;
  vy?: number;
}

export type StampKind = "ring" | "pass";
export interface Stamp {
  id: string;
  /** Player-facing, e.g. "BELL RINGS". */
  label: string;
  kind: StampKind;
  /** bell id (ring) or arch id (pass). */
  target: string;
}

export type DecorKind = "lamp" | "lampTall" | "stall" | "fountain" | "banner" | "wall";
export interface Decor { kind: DecorKind; gx: number; gy: number; scale?: number }

export interface MachineLevel {
  id: string;
  number: number;
  title: string;
  /** One-line player-facing goal. */
  brief: string;
  cols: number;
  rows: number;
  /** Solid ground/masonry blocks in cells. */
  terrain: Rect[];
  fixed: FixedPart[];
  inventory: Partial<Record<PartKind, number>>;
  stamps: Stamp[];
  /** Column boundaries for relay stretches, e.g. [0, 14, 28]. */
  stretches: number[];
  maxTicks: number;
  decor: Decor[];
  /** Short hint shown after a failed run (player-facing). */
  hint?: string;
}

export interface StampResult { id: string; label: string; hitTick: number | null; inOrder: boolean }

export interface Verdict {
  success: boolean;
  stamps: StampResult[];
  cakeSafe: boolean;
  /** Player-facing explanation lines. */
  reasons: string[];
  ticks: number;
}

export type SimEventType =
  | "ring" | "stamp" | "stampWrongOrder" | "topple" | "tip" | "catch" | "launch"
  | "release" | "crash" | "fall" | "safe" | "splat" | "bounce" | "plop" | "pass" | "push";
export interface SimEvent { tick: number; type: SimEventType; id: string; x: number; y: number }
