// Thin browser client for the ws room protocol (matches src/server/protocol.ts).
// Lockstep model: the server commits commands and broadcasts each accepted
// payload in revision order; clients fold the same payloads through the
// deterministic engine locally, seeded from a b64 snapshot + history.

export interface RoomClientEvents {
  /** Server state decoded: TrsRoomState {levelId, state} after snapshot+history fold. */
  onState?: (roomState: unknown) => void;
  /** An accepted command payload to fold through the local engine, in order. */
  onCommand?: (payload: unknown, revision: number, actorId: string, events: unknown[]) => void;
  /** Roster changed (connected members with seats). */
  onMembers?: (members: Array<{ actorId: string; seat: number; connected: boolean }>) => void;
  onJoin?: (actorId: string, roomCode: string) => void;
  onError?: (code: string, message: string) => void;
}

function b64decode(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export class RoomClient {
  private ws: WebSocket | null = null;
  actorId: string | null = null;
  resumeToken: string | null = null;
  roomCode: string | null = null;
  revision = -1;
  seat: number | null = null;
  members = new Map<string, { actorId: string; seat: number; connected: boolean }>();
  private seq = 0;

  constructor(private ev: RoomClientEvents) {}

  connect(path = "/ws"): Promise<void> {
    return new Promise((resolve, reject) => {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      this.ws = new WebSocket(`${proto}://${location.host}${path}`);
      this.ws.onopen = () => { this.send({ type: "hello", protocolVersion: 1 }); resolve(); };
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (m) => this.handle(JSON.parse(m.data as string));
    });
  }

  private send(msg: unknown) { this.ws?.send(JSON.stringify(msg)); }

  createRoom(gameType: string, seed?: string) {
    this.send({ type: "create", gameType, ...(seed !== undefined ? { seed } : {}) });
  }
  joinRoom(code: string) {
    const room = code.toUpperCase();
    let resume: { actorId?: string; resumeToken?: string } = {};
    try {
      const saved = sessionStorage.getItem(`trs-actor:${room}`);
      if (saved) {
        const { actorId, resumeToken } = JSON.parse(saved);
        if (typeof actorId === "string" && typeof resumeToken === "string") resume = { actorId, resumeToken };
      }
    } catch { /* private mode */ }
    this.send({ type: "join", room, ...resume });
  }
  leave() { this.send({ type: "leave" }); }

  command(payload: unknown) {
    this.seq += 1;
    this.send({
      type: "command",
      commandId: `${this.actorId ?? "anon"}-${this.seq}`,
      baseRevision: this.revision,
      payload,
    });
  }

  private handle(m: Record<string, unknown>) {
    if (m.type === "full_state") {
      this.actorId = m.actorId as string;
      this.resumeToken = m.resumeToken as string;
      const meta = m.room as { roomCode?: string };
      this.roomCode = meta.roomCode ?? null;
      if (this.roomCode && this.resumeToken) {
        try { sessionStorage.setItem(`trs-actor:${this.roomCode}`, JSON.stringify({ actorId: this.actorId, resumeToken: this.resumeToken })); } catch { /* private mode */ }
      }
      this.revision = m.revision as number;
      this.seat = (m.seat as number) ?? null;
      this.members.clear();
      for (const mem of (m.members as Array<{ actorId: string; seat: number; connected: boolean }>) ?? []) this.members.set(mem.actorId, { ...mem });
      this.ev.onJoin?.(this.actorId, this.roomCode ?? "");
      this.ev.onMembers?.([...this.members.values()]);
      const snap = m.snapshot as { data: string } | undefined;
      const history = (m.history as { payload: unknown; actorId: string; events: unknown[] }[] | undefined) ?? [];
      // RoomState = snapshot decoded + history folded by adapter (engine-side
      // the fold is the App's job: we emit the decoded snapshot then payloads).
      this.ev.onState?.(snap ? JSON.parse(b64decode(snap.data)) : null);
      for (const h of history) this.ev.onCommand?.(h.payload, -1, h.actorId, h.events ?? []);
    } else if (m.type === "state_patch") {
      if (m.dup) return;
      this.revision = m.revision as number;
      this.ev.onCommand?.(m.payload, this.revision, String(m.actorId), (m.events as unknown[]) ?? []);
    } else if (m.type === "join") {
      this.members.set(String(m.actorId), { actorId: String(m.actorId), seat: m.seat as number, connected: true });
      this.ev.onMembers?.([...this.members.values()]);
    } else if (m.type === "leave") {
      const mem = this.members.get(String(m.actorId));
      if (mem) mem.connected = false;
      if (m.reason !== "disconnected") this.members.delete(String(m.actorId));
      this.ev.onMembers?.([...this.members.values()]);
    } else if (m.type === "error") {
      this.ev.onError?.(String(m.code), String(m.message));
    }
  }

  close() { this.send({ type: "leave" }); this.ws?.close(); this.ws = null; }
}
