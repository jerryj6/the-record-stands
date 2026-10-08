import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MACHINE_LEVELS, machineLevel } from "../content/machine/levels";
import { applyBuild, initialBuild, rangeFor, validateBuild, type BuildCommand, type BuildState } from "../engine/machine/editor";
import type { Verdict } from "../engine/machine/types";
import { Stage, type Layout } from "./game/Stage";
import { isMuted, setMuted, sfx } from "./game/sound";
import { RoomClient } from "./net/roomClient";

type Screen = "title" | "levels" | "play";
type StampState = "dark" | "lit" | "wrong";
interface Member { actorId: string; seat: number; connected: boolean }

const SOLVED_KEY = "trs-machine-solved";
function loadSolved(): string[] {
  try { return JSON.parse(localStorage.getItem(SOLVED_KEY) ?? "[]") as string[]; } catch { return []; }
}
function saveSolved(ids: string[]): void {
  try { localStorage.setItem(SOLVED_KEY, JSON.stringify(ids)); } catch { /* private mode */ }
}

function useViewport(): { w: number; h: number } {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const on = (): void => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return vp;
}

export function App() {
  const [screen, setScreen] = useState<Screen>("title");
  const [build, setBuild] = useState<BuildState>(() => initialBuild(MACHINE_LEVELS[0]!.id));
  const [solved, setSolved] = useState<string[]>(loadSolved);
  const [online, setOnline] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [myActor, setMyActor] = useState<string | null>(null);
  const [mySeat, setMySeat] = useState<number | null>(null);
  const [netError, setNetError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const clientRef = useRef<RoomClient | null>(null);
  const buildRef = useRef(build);
  buildRef.current = build;
  const membersRef = useRef(members);
  membersRef.current = members;

  const level = machineLevel(build.levelId);
  const connectedCount = members.filter((m) => m.connected).length;
  const range = online ? rangeFor(level, mySeat, connectedCount) : undefined;

  const foldNet = useCallback((payload: unknown, actorId: string, events: unknown[]) => {
    const cmd = payload as BuildCommand;
    const lv = machineLevel(buildRef.current.levelId);
    const seat = membersRef.current.find((m) => m.actorId === actorId)?.seat ?? null;
    const r = rangeFor(lv, seat, membersRef.current.filter((m) => m.connected).length);
    const start = events.some((e) => (e as { type?: string }).type === "run");
    const next = applyBuild(buildRef.current, actorId, cmd, start, r);
    buildRef.current = next;
    setBuild(next);
  }, []);

  const connect = useCallback(async (mode: "create" | "join") => {
    setNetError("");
    setConnecting(true);
    clientRef.current?.close();
    const c = new RoomClient({
      onJoin: (actor, code) => { setMyActor(actor); setRoomCode(code); setMySeat(c.seat); setOnline(true); setScreen("play"); setConnecting(false); },
      onState: (s) => { if (s) { buildRef.current = s as BuildState; setBuild(s as BuildState); } },
      onCommand: (payload, _rev, actorId, events) => foldNet(payload, actorId, events),
      onMembers: (list) => { membersRef.current = list; setMembers(list); },
      onError: (code, message) => { setConnecting(false); setNetError(code === "ROOM_NOT_FOUND" ? "No room with that code." : message); },
    });
    clientRef.current = c;
    try {
      await c.connect("/ws");
      if (mode === "create") c.createRoom("trs", buildRef.current.levelId);
      else c.joinRoom(joinCode.trim());
    } catch {
      setConnecting(false);
      setNetError("Couldn't reach the room server.");
    }
  }, [foldNet, joinCode]);

  const leaveRoom = useCallback(() => {
    clientRef.current?.close();
    clientRef.current = null;
    setOnline(false);
    setRoomCode("");
    setMembers([]);
    setBuild((b) => initialBuild(b.levelId));
  }, []);

  const send = useCallback((cmd: BuildCommand) => {
    if (online) {
      clientRef.current?.command(cmd);
      return;
    }
    const cur = buildRef.current;
    const lv = machineLevel(cur.levelId);
    if (!validateBuild(lv, cur, cmd).ok) return;
    const next = applyBuild(cur, "solo", cmd, cmd.type === "ready" && cmd.on);
    buildRef.current = next;
    setBuild(next);
  }, [online]);

  const startLevel = (id: string): void => {
    if (online) send({ type: "level", levelId: id });
    else { const b = initialBuild(id); buildRef.current = b; setBuild(b); }
    setScreen("play");
  };

  const markSolved = useCallback((id: string) => {
    setSolved((s) => { if (s.includes(id)) return s; const n = [...s, id]; saveSolved(n); return n; });
  }, []);

  return (
    <div className="app">
      {screen === "title" && (
        <TitleScreen
          onPlay={() => setScreen("levels")}
          onCreate={() => void connect("create")}
          onJoin={() => void connect("join")}
          joinCode={joinCode}
          setJoinCode={setJoinCode}
          error={netError}
          connecting={connecting}
        />
      )}
      {screen === "levels" && <LevelSelect solved={solved} onPick={startLevel} onBack={() => setScreen("title")} />}
      {screen === "play" && (
        <PlayScreen
          build={build}
          range={range}
          online={online}
          roomCode={roomCode}
          members={members}
          myActor={myActor}
          mySeat={mySeat}
          send={send}
          onMenu={() => { if (online) leaveRoom(); setScreen("levels"); }}
          onSolved={markSolved}
          onNext={() => {
            const i = MACHINE_LEVELS.findIndex((l) => l.id === build.levelId);
            const nxt = MACHINE_LEVELS[i + 1];
            if (nxt) startLevel(nxt.id); else setScreen("levels");
          }}
        />
      )}
    </div>
  );
}

function TitleScreen(p: {
  onPlay(): void; onCreate(): void; onJoin(): void; joinCode: string; setJoinCode(v: string): void; error: string; connecting: boolean;
}) {
  const [together, setTogether] = useState(false);
  return (
    <main className="title-screen">
      <div className="title-art" aria-hidden="true" />
      <div className="title-card">
        <p className="kicker">A contraption puzzle for 1–4 players</p>
        <h1>The Record Stands</h1>
        <p className="pitch">The gala went wrong. Rebuild the chain of events so every witness is still right — and the cake survives.</p>
        {!together ? (
          <div className="title-actions">
            <button className="wax" onClick={p.onPlay}>Play</button>
            <button className="paper-btn" onClick={() => setTogether(true)}>Play together</button>
          </div>
        ) : (
          <div className="together">
            <button className="wax" onClick={p.onCreate} disabled={p.connecting}>Start a room</button>
            <div className="join-row">
              <input aria-label="Room code" placeholder="Room code" value={p.joinCode} maxLength={8}
                onChange={(e) => p.setJoinCode(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === "Enter" && p.joinCode) p.onJoin(); }} />
              <button className="paper-btn" onClick={p.onJoin} disabled={!p.joinCode || p.connecting}>Join</button>
            </div>
            <button className="link-btn" onClick={() => setTogether(false)}>Back</button>
          </div>
        )}
        {p.error && <p className="error" role="alert">{p.error}</p>}
      </div>
    </main>
  );
}

function LevelSelect(p: { solved: string[]; onPick(id: string): void; onBack(): void }) {
  return (
    <main className="levels-screen">
      <header className="levels-head">
        <button className="paper-btn small" onClick={p.onBack}>‹ Back</button>
        <h2>Choose a scene</h2>
      </header>
      <div className="level-cards">
        {MACHINE_LEVELS.map((l) => (
          <button key={l.id} className="level-card" onClick={() => p.onPick(l.id)}>
            <span className="level-num">{l.number}</span>
            <span className="level-title">{l.title}</span>
            <span className="level-brief">{l.brief}</span>
            <span className="level-stamps">{l.stamps.map((s, i) => <span key={s.id} className="mini-stamp">{i + 1}. {s.label}</span>)}</span>
            {p.solved.includes(l.id) && <span className="solved-seal">Solved</span>}
          </button>
        ))}
      </div>
    </main>
  );
}

function PlayScreen(p: {
  build: BuildState; range: ReturnType<typeof rangeFor>; online: boolean; roomCode: string; members: Member[];
  myActor: string | null; mySeat: number | null; send(cmd: BuildCommand): void; onMenu(): void; onSolved(id: string): void; onNext(): void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Stage | null>(null);
  const [ready, setReady] = useState(false);
  const [stamps, setStamps] = useState<StampState[]>([]);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [hint, setHint] = useState("");
  const [fast, setFast] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const [cakeOk, setCakeOk] = useState(true);
  const [coach, setCoach] = useState(true);
  useEffect(() => {
    setCoach(true);
    const t = window.setTimeout(() => setCoach(false), 8000);
    return () => window.clearTimeout(t);
  }, [p.build.levelId]);
  const vp = useViewport();
  const phone = vp.w < 700;
  const layout: Layout = useMemo(() => (phone ? { top: 112, tray: 96, playReserve: 116 } : { top: 84, tray: 108, playReserve: 220 }), [phone]);
  const level = machineLevel(p.build.levelId);
  const sendRef = useRef(p.send);
  sendRef.current = p.send;
  const lastRun = useRef(p.build.runSeq);
  const hintTimer = useRef<number | undefined>(undefined);

  const showHint = useCallback((m: string) => {
    setHint(m);
    window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHint(""), Math.max(2600, m.length * 70));
  }, []);

  useEffect(() => {
    let alive = true;
    const s = new Stage(host.current!, {
      onCommand: (c) => sendRef.current(c),
      onStamp: (i, ok) => setStamps((arr) => { const n = [...arr]; n[i] = ok ? "lit" : "wrong"; return n; }),
      onRunEnd: (v) => { setVerdict(v); setCakeOk(v.cakeSafe); },
      onHint: showHint,
    });
    void s.init().then(() => {
      if (!alive) { s.destroy(); return; }
      stageRef.current = s;
      s.setLayout(layout);
      s.setLevel(level, p.build, p.range);
      setReady(true);
    });
    return () => { alive = false; if (stageRef.current) { stageRef.current.destroy(); stageRef.current = null; } };
  }, []);

  useEffect(() => { stageRef.current?.setLayout(layout); }, [layout]);

  const levelId = p.build.levelId;
  useEffect(() => {
    if (!ready) return;
    stageRef.current?.setLevel(machineLevel(levelId), p.build, p.range);
    // a new scene restarts the run counter; without this the first Play after "Next scene" can be skipped
    lastRun.current = p.build.phase === "run" ? -1 : p.build.runSeq;
    setStamps(machineLevel(levelId).stamps.map(() => "dark"));
    setVerdict(null);
    setCakeOk(true);
  }, [levelId, ready]);

  useEffect(() => {
    const s = stageRef.current;
    if (!ready || !s) return;
    if (p.build.phase === "run" && p.build.runSeq !== lastRun.current) {
      lastRun.current = p.build.runSeq;
      s.setBuild(p.build, p.range);
      setStamps(level.stamps.map(() => "dark"));
      setVerdict(null);
      setCakeOk(true);
      s.startRun();
      return;
    }
    if (p.build.phase === "build" && s.isRunning) {
      s.stopRun();
      setStamps(level.stamps.map(() => "dark"));
      setVerdict(null);
      setCakeOk(true);
    }
    s.setBuild(p.build, p.range);
  }, [p.build, p.range, ready, level]);

  useEffect(() => { if (stageRef.current) stageRef.current.speed = fast ? 2 : 1; }, [fast]);
  useEffect(() => { if (verdict?.success) p.onSolved(level.id); }, [verdict, level.id, p]);

  const running = p.build.phase === "run";
  const connected = p.members.filter((m) => m.connected);
  const iAmReady = !!p.myActor && p.build.ready.includes(p.myActor);
  const play = (): void => {
    sfx.pop();
    if (running) p.send({ type: "reset" });
    else p.send({ type: "ready", on: p.online ? !iAmReady : true });
  };
  const playLabel = running ? (verdict ? "Edit" : "Reset") : p.online && connected.length > 1 ? (iAmReady ? "Waiting…" : "Ready") : "Play";
  const stretchName = p.range ? (p.range.from === 0 ? "left" : "right") : null;

  return (
    <div className={`play ${phone ? "phone" : "desk"}`}>
      <div className="stage-host" ref={host} />
      <header className="hud-top" style={{ height: layout.top }}>
        <div className="hud-row">
          <button className="icon-btn" onClick={p.onMenu} aria-label="Back to scenes">‹</button>
          <div className="level-name"><span className="num">{level.number}</span><span className="name">{level.title}</span></div>
          <button className="icon-btn" onClick={() => { const m = !muted; setMuted(m); setMutedState(m); }} aria-label={muted ? "Unmute" : "Mute"}>{muted ? "♪̸" : "♪"}</button>
        </div>
        <ol className="stamp-row" aria-label="Witness record">
          {level.stamps.map((s, i) => (
            <li key={s.id} className={`stamp ${stamps[i] ?? "dark"}`}>
              <span className="stamp-num">{i + 1}</span>
              <span className="stamp-label">{s.label}</span>
              {stamps[i] === "wrong" && <span className="stamp-flag">too early</span>}
            </li>
          ))}
          <li className={`stamp cake ${cakeOk ? (verdict ? "lit" : "dark") : "wrong"}`}>
            <img src="/assets/sprites/props/trs-prop-sheet-08.png" alt="" />
            <span className="stamp-label">{cakeOk ? "CAKE SURVIVES" : "CAKE RUINED"}</span>
          </li>
        </ol>
      </header>

      {p.online && (
        <div className="stretch-note room-chip" style={{ top: layout.top + 8 }}>
          Room <b>{p.roomCode}</b> · {connected.length} {connected.length === 1 ? "player" : "players"}
          {stretchName && !running && <> · You build the {stretchName} stretch</>}
        </div>
      )}

      <div className="play-dock" style={{ height: layout.tray, width: layout.playReserve }}>
        <button className={`speed ${fast ? "on" : ""}`} onClick={() => setFast((f) => !f)} aria-pressed={fast}>2×</button>
        <button className={`wax play-btn ${running ? "reset" : ""} ${iAmReady && !running ? "waiting" : ""}`} onClick={play}>
          <span>{playLabel}</span>
          {p.online && !running && connected.length > 1 && <small>{p.build.ready.length}/{connected.length} ready</small>}
        </button>
      </div>

      {hint && <div className="hint" style={{ bottom: layout.tray + 14 }} role="status">{hint}</div>}

      {verdict && (
        <div className={`verdict-card ${verdict.success ? "win" : "lose"}`} style={{ top: layout.top + (p.online ? 44 : 12) }} role="dialog" aria-label="Run result">
          <h3>{verdict.success ? "The record stands." : "The record doesn't hold."}</h3>
          {verdict.success ? (
            <p>Every witness saw it happen, in order, and the cake made it.</p>
          ) : (
            <ul>{verdict.reasons.slice(0, 3).map((r) => <li key={r}>{r}</li>)}</ul>
          )}
          {!verdict.success && level.hint && <p className="tip">Tip: {level.hint}</p>}
          <div className="verdict-actions">
            {verdict.success ? (
              <>
                <button className="paper-btn" onClick={() => p.send({ type: "reset" })}>Replay</button>
                <button className="wax small" onClick={p.onNext}>{level.number < MACHINE_LEVELS.length ? "Next scene" : "All scenes"}</button>
              </>
            ) : (
              <button className="wax small" onClick={() => p.send({ type: "reset" })}>Back to building</button>
            )}
          </div>
        </div>
      )}
      {coach && !running && p.build.placements.length === 0 && !hint && (
        <div className="coach" style={{ top: layout.top + (p.online ? 44 : 12) }}>{level.brief} Drag parts from the tray, then press Play.</div>
      )}
    </div>
  );
}
