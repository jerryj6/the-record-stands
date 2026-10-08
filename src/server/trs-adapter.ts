import { TrsEngine, type TrsPlayState, type TrsAction } from "../engine/trs/engine.js";
import { LEVELS } from "../content/levels/index.js";
import { sha256Hex } from "../engine/hash.js";
import { stableStringify } from "../engine/trs/engine.js";
import type { GameAdapter, RoomDraft, RoomInitContext, RoomView, ValidationResult } from "./adapter.js";

const engine = new TrsEngine();

export interface TrsRoomState { levelId: string; state: TrsPlayState }

function levelOf(id: string) {
  const l = LEVELS.find(x => x.id === id);
  if (!l) throw new Error(`unknown level ${id}`);
  return l.def;
}

export const trsAdapter: GameAdapter<TrsRoomState> = {
  gameType: "trs",
  rulesVersion: "trs-0.1.0",

  initRoomState(ctx: RoomInitContext): TrsRoomState {
    const levelId = ctx.seed?.match(/^TRS-\d+/) ? ctx.seed : "TRS-01";
    return { levelId, state: engine.createInitialState(levelOf(levelId)) };
  },

  validateCommand(room: RoomView<TrsRoomState>, _actorId: string, cmd: unknown): ValidationResult {
    const a = cmd as TrsAction;
    if (!a || typeof a !== "object" || !("type" in a)) return { ok: false, reason: "malformed action" };
    const r = engine.validateAction(levelOf(room.state.levelId), room.state.state, a);
    return r.ok ? { ok: true } : { ok: false, reason: r.reason };
  },

  applyCommand(room: RoomDraft<TrsRoomState>, _actorId: string, cmd: unknown): unknown[] {
    const res = engine.applyAction(levelOf(room.state.levelId), room.state.state, cmd as TrsAction);
    room.state.state = res.state;
    return res.events;
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
  isFinished(room: RoomView<TrsRoomState>): boolean {
    return room.state.state.solved;
  },
};
