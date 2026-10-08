import { machineLevel, MACHINE_LEVELS } from "../content/machine/levels.js";
import { applyBuild, initialBuild, rangeFor, validateBuild, type BuildCommand, type BuildState } from "../engine/machine/editor.js";
import { sha256Hex } from "../engine/hash.js";
import type { GameAdapter, RoomDraft, RoomInitContext, RoomView, ValidationResult } from "./adapter.js";

/** Room state for the contraption sandbox (relay co-op). */
export type TrsRoomState = BuildState;

export function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
}

function connected(room: RoomView<TrsRoomState>): string[] {
  return [...room.members.values()].filter((m) => m.connected).map((m) => m.actorId).sort();
}

function rangeOf(room: RoomView<TrsRoomState>, actorId: string) {
  return rangeFor(machineLevel(room.state.levelId), room.seatOf(actorId), connected(room).length);
}

function wouldStart(room: RoomView<TrsRoomState>, actorId: string, cmd: BuildCommand): boolean {
  if (cmd.type !== "ready" || !cmd.on || room.state.phase !== "build") return false;
  const ready = new Set([...room.state.ready, actorId]);
  return connected(room).every((a) => ready.has(a));
}

export const trsAdapter: GameAdapter<TrsRoomState> = {
  gameType: "trs",
  rulesVersion: "trs-machine-0.2.0",

  initRoomState(ctx: RoomInitContext): TrsRoomState {
    const id = MACHINE_LEVELS.some((l) => l.id === ctx.seed) ? ctx.seed! : MACHINE_LEVELS[0]!.id;
    return initialBuild(id);
  },

  validateCommand(room: RoomView<TrsRoomState>, actorId: string, cmd: unknown): ValidationResult {
    if (!cmd || typeof cmd !== "object" || !("type" in cmd)) return { ok: false, reason: "malformed command" };
    const c = cmd as BuildCommand;
    if (c.type === "level" && !MACHINE_LEVELS.some((l) => l.id === c.levelId)) return { ok: false, reason: "unknown level" };
    return validateBuild(machineLevel(room.state.levelId), room.state, c, rangeOf(room, actorId));
  },

  applyCommand(room: RoomDraft<TrsRoomState>, actorId: string, cmd: unknown): unknown[] {
    const c = cmd as BuildCommand;
    const view = room as unknown as RoomView<TrsRoomState>;
    const start = wouldStart(view, actorId, c);
    // the server commits the draft's state object, so mutate it in place
    Object.assign(room.state, applyBuild(room.state, actorId, c, start, rangeOf(view, actorId)));
    return start ? [{ type: "run", runSeq: room.state.runSeq }] : [];
  },

  snapshot(room: RoomView<TrsRoomState>): Uint8Array {
    return new TextEncoder().encode(JSON.stringify(room.state));
  },
  restore(draft: { state: TrsRoomState }, bytes: Uint8Array): void {
    draft.state = JSON.parse(new TextDecoder().decode(bytes)) as TrsRoomState;
  },
  hashState(room: RoomView<TrsRoomState>): string {
    return sha256Hex(stableStringify(room.state));
  },
};
