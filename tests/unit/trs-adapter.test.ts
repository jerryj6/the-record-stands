import { describe, expect, it } from "vitest";
import { trsAdapter, type TrsRoomState } from "../../src/server/trs-adapter";
import type { MemberView, RoomDraft, RoomView } from "../../src/server/adapter";

function room(state: TrsRoomState, actors: string[]): RoomView<TrsRoomState> {
  const members = new Map<string, MemberView>(actors.map((a, i) => [a, { actorId: a, seat: i + 1, displayName: a, connected: true }]));
  return { id: "r", code: "ABCD", revision: 0, state, members, maxSeats: 4, seatOf: (a) => members.get(a)?.seat ?? null };
}

/** Mirrors src/server/rooms.ts: apply against a spread draft over a cloned state, then commit draftState. */
function commit(view: RoomView<TrsRoomState>, actor: string, cmd: unknown): { state: TrsRoomState; events: unknown[] } {
  const v = trsAdapter.validateCommand(view, actor, cmd);
  if (!v.ok) throw new Error(v.reason);
  const draftState = structuredClone(view.state) as TrsRoomState;
  const draft = { ...view, state: draftState } as RoomDraft<TrsRoomState>;
  const events = trsAdapter.applyCommand(draft, actor, cmd);
  return { state: draftState, events };
}

describe("room adapter (relay co-op)", () => {
  it("commits builds, limits each player to their stretch, and starts the run when everyone is ready", () => {
    let st = trsAdapter.initRoomState({ roomId: "r", roomCode: "ABCD", seed: "gala-03" });
    const actors = ["A", "B"];
    ({ state: st } = commit(room(st, actors), "A", { type: "place", kind: "ramp", gx: 7, gy: 6, flip: false }));
    expect(st.placements).toHaveLength(1);
    expect(trsAdapter.validateCommand(room(st, actors), "B", { type: "place", kind: "domino", gx: 10, gy: 10, flip: false }).ok).toBe(false);
    ({ state: st } = commit(room(st, actors), "B", { type: "place", kind: "domino", gx: 14, gy: 10, flip: false }));
    let ev: unknown[];
    ({ state: st, events: ev } = commit(room(st, actors), "A", { type: "ready", on: true }));
    expect(ev).toEqual([]);
    expect(st.phase).toBe("build");
    ({ state: st, events: ev } = commit(room(st, actors), "B", { type: "ready", on: true }));
    expect(ev).toEqual([{ type: "run", runSeq: 1 }]);
    expect(st.phase).toBe("run");
    expect(trsAdapter.validateCommand(room(st, actors), "A", { type: "flip", id: "p1" }).ok).toBe(false);
  });
  it("resets a room persisted by the old rules instead of crashing on recovery", () => {
    const draft = { state: {} as TrsRoomState };
    trsAdapter.restore(draft, new TextEncoder().encode(JSON.stringify({ levelId: "TRS-01", state: { budget: 0 } })));
    expect(draft.state.levelId).toBe("gala-01");
    expect(draft.state.placements).toEqual([]);
  });
  it("level 4 relay: the host's half alone fails; the guest's dominoes and ramp complete it", async () => {
    const { runMachine } = await import("../../src/engine/machine/sim");
    const { L4 } = await import("../../src/content/machine/levels");
    let st = trsAdapter.initRoomState({ roomId: "r", roomCode: "ABCD", seed: "gala-04" });
    const actors = ["H", "G"];
    const place = (a: string, kind: string, gx: number, gy: number, flip = false) => ({ state: st } = commit(room(st, actors), a, { type: "place", kind, gx, gy, flip }));
    place("H", "toy", 9, 11); place("H", "domino", 12, 10); place("H", "domino", 13, 10);
    expect(trsAdapter.validateCommand(room(st, actors), "H", { type: "place", kind: "domino", gx: 14, gy: 10, flip: false }).ok).toBe(false);
    expect(runMachine(L4, st.placements).verdict.success).toBe(false);
    place("G", "domino", 14, 10); place("G", "domino", 15, 10); place("G", "ramp", 23, 3, true);
    expect(runMachine(L4, st.placements).verdict.success).toBe(true);
  });
});
