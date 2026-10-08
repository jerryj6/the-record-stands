// Thin browser client for the ws room protocol. Commands are opaque payloads;
// the server stamps actor/revision and validates before commit.
export type NetMsg =
  | { type: "hello"; revision?: number }
  | { type: "create"; roomCode?: string; gameType?: string; actorId?: string; seed?: string }
  | { type: "join"; roomCode: string; actorId?: string }
  | { type: "leave" }
  | { type: "command"; commandId: string; baseRevision: number; payload: unknown }
  | { type: "ping" };

export interface RoomClientEvents {
  onState?: (snap: unknown, revision: number) => void;
  onPatch?: (payload: unknown, revision: number, actorId: string) => void;
  onError?: (code: string, message: string) => void;
  onSeat?: (actorId: string, roomCode: string) => void;
}

export class RoomClient {
  private ws: WebSocket | null = null;
  actorId: string | null = null;
  roomCode: string | null = null;
  revision = -1;
  private seq = 0;

  constructor(private ev: RoomClientEvents) {}

  connect(path = "/ws"): Promise<void> {
    return new Promise((resolve, reject) => {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      this.ws = new WebSocket(`${proto}://${location.host}${path}`);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (m) => this.handle(JSON.parse(m.data));
    });
  }

  private send(msg: NetMsg) { this.ws?.send(JSON.stringify(msg)); }

  hello() { this.send({ type: "hello" }); }
  createRoom(gameType: string, seed?: string) { this.send({ type: "create", gameType, ...(seed !== undefined ? { seed } : {}) }); }
  joinRoom(code: string) { this.send({ type: "join", roomCode: code }); }

  command(payload: unknown) {
    this.seq += 1;
    this.send({ type: "command", commandId: `${this.actorId ?? "anon"}-${this.seq}`, baseRevision: this.revision, payload });
  }

  private handle(m: Record<string, unknown>) {
    if (m.type === "full_state") {
      this.actorId = m.actorId as string;
      this.roomCode = m.roomCode as string;
      this.revision = m.revision as number;
      this.ev.onSeat?.(this.actorId, this.roomCode);
      this.ev.onState?.(m.snapshot ?? m.state, this.revision);
    } else if (m.type === "state_patch") {
      this.revision = m.revision as number;
      this.ev.onPatch?.(m.payload ?? m.event, this.revision, m.actorId as string);
    } else if (m.type === "error") {
      this.ev.onError?.(String(m.code), String(m.message));
    }
  }

  close() { this.ws?.close(); this.ws = null; }
}
