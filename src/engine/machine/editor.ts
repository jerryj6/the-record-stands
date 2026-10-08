import { canPlace, FOOTPRINT, type PlaceRange } from "./geometry.js";
import type { MachineLevel, PartKind, Placement } from "./types.js";

/** Shared build state for solo and co-op rooms. */
export interface BuildState {
  levelId: string;
  placements: Placement[];
  nextId: number;
  phase: "build" | "run";
  ready: string[];
  runSeq: number;
}

export type BuildCommand =
  | { type: "place"; kind: PartKind; gx: number; gy: number; flip: boolean }
  | { type: "move"; id: string; gx: number; gy: number }
  | { type: "flip"; id: string }
  | { type: "remove"; id: string }
  | { type: "clear" }
  | { type: "ready"; on: boolean }
  | { type: "reset" }
  | { type: "level"; levelId: string };

export function initialBuild(levelId: string): BuildState {
  return { levelId, placements: [], nextId: 1, phase: "build", ready: [], runSeq: 0 };
}

export function remaining(level: MachineLevel, placements: readonly Placement[], kind: PartKind): number {
  return (level.inventory[kind] ?? 0) - placements.filter((p) => p.kind === kind).length;
}

/** Column range an actor may build in. `seat` is 1-based; `players` counts connected builders. */
export function rangeFor(level: MachineLevel, seat: number | null, players: number): PlaceRange | undefined {
  const n = level.stretches.length - 1;
  if (players <= 1 || n <= 1 || seat === null) return undefined;
  const i = (seat - 1) % n;
  return { from: level.stretches[i]!, to: level.stretches[i + 1]! };
}

function inRange(p: Placement, range?: PlaceRange): boolean {
  if (!range) return true;
  return p.gx >= range.from && p.gx + FOOTPRINT[p.kind].w <= range.to;
}

export type Check = { ok: true } | { ok: false; reason: string };

export function validateBuild(level: MachineLevel, st: BuildState, cmd: BuildCommand, range?: PlaceRange): Check {
  if (!cmd || typeof cmd !== "object") return { ok: false, reason: "malformed" };
  const editing = cmd.type === "place" || cmd.type === "move" || cmd.type === "flip" || cmd.type === "remove" || cmd.type === "clear";
  if (editing && st.phase !== "build") return { ok: false, reason: "Reset the machine before changing it." };
  switch (cmd.type) {
    case "place": {
      if (!(cmd.kind in level.inventory) || remaining(level, st.placements, cmd.kind) <= 0) return { ok: false, reason: "No more of those in the tray." };
      return canPlace(level, st.placements, cmd.kind, cmd.gx, cmd.gy, !!cmd.flip, undefined, range);
    }
    case "move": {
      const p = st.placements.find((v) => v.id === cmd.id);
      if (!p) return { ok: false, reason: "That part is gone." };
      if (!inRange(p, range)) return { ok: false, reason: "That part is in your partner's stretch." };
      return canPlace(level, st.placements, p.kind, cmd.gx, cmd.gy, p.flip, p.id, range);
    }
    case "flip": {
      const p = st.placements.find((v) => v.id === cmd.id);
      if (!p) return { ok: false, reason: "That part is gone." };
      if (!inRange(p, range)) return { ok: false, reason: "That part is in your partner's stretch." };
      return canPlace(level, st.placements, p.kind, p.gx, p.gy, !p.flip, p.id, range);
    }
    case "remove": {
      const p = st.placements.find((v) => v.id === cmd.id);
      if (!p) return { ok: false, reason: "That part is gone." };
      return inRange(p, range) ? { ok: true } : { ok: false, reason: "That part is in your partner's stretch." };
    }
    case "clear":
    case "reset":
      return { ok: true };
    case "ready":
      return typeof cmd.on === "boolean" ? { ok: true } : { ok: false, reason: "malformed" };
    case "level":
      return typeof cmd.levelId === "string" ? { ok: true } : { ok: false, reason: "malformed" };
    default:
      return { ok: false, reason: "unknown command" };
  }
}

/**
 * Pure reducer. `startRun` is decided by whoever owns membership (the room server,
 * or the solo client) and is replayed from the committed event on every screen.
 */
export function applyBuild(st: BuildState, actorId: string, cmd: BuildCommand, startRun: boolean, range?: PlaceRange): BuildState {
  const next: BuildState = { ...st, placements: st.placements.map((p) => ({ ...p })), ready: [...st.ready] };
  const unready = (): void => { next.ready = []; };
  switch (cmd.type) {
    case "place":
      next.placements.push({ id: `p${next.nextId}`, kind: cmd.kind, gx: cmd.gx, gy: cmd.gy, flip: !!cmd.flip });
      next.nextId++;
      unready();
      break;
    case "move": {
      const p = next.placements.find((v) => v.id === cmd.id);
      if (p) { p.gx = cmd.gx; p.gy = cmd.gy; }
      unready();
      break;
    }
    case "flip": {
      const p = next.placements.find((v) => v.id === cmd.id);
      if (p) p.flip = !p.flip;
      unready();
      break;
    }
    case "remove":
      next.placements = next.placements.filter((v) => v.id !== cmd.id);
      unready();
      break;
    case "clear":
      next.placements = next.placements.filter((p) => !inRange(p, range));
      unready();
      break;
    case "ready":
      next.ready = cmd.on ? (next.ready.includes(actorId) ? next.ready : [...next.ready, actorId].sort()) : next.ready.filter((a) => a !== actorId);
      if (startRun) { next.phase = "run"; next.runSeq++; next.ready = []; }
      break;
    case "reset":
      next.phase = "build";
      unready();
      break;
    case "level":
      return { ...initialBuild(cmd.levelId), runSeq: st.runSeq };
  }
  return next;
}
