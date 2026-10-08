import { useEffect, useRef, useState } from "react";
import { TrsEngine } from "../engine/trs/engine.js";
import type { TrsPlayState, TrsAction, RunRecord } from "../engine/trs/engine.js";
import type { CaseDefinition, Intervention, Observation, OutcomePredicate } from "../engine/trs/types.js";
import { LEVELS } from "../content/levels/index.js";
import { KEY_QUESTIONS } from "../content/level-cards.js";
import { RoomClient } from "./net/roomClient.js";
import { trsAudio, type TrsCue } from "./audio.js";

const engine = new TrsEngine();

type Screen = "title" | "select" | "case" | "lobby" | "credits";

const POS: Record<string, [number, number]> = {
  start: [40, 300], laneWest: [110, 250], fountainEdge: [210, 220], bellCorner: [310, 190],
  arch: [420, 180], destination: [540, 170],
  arcadeWest: [110, 320], arcadeMid: [220, 330], arcadeEast: [330, 320],
  squareCenter: [250, 120], tray: [80, 60],
};
const pos = (id?: string) => POS[id ?? ""] ?? [60 + (id ?? "").length * 37 % 520, 40 + (id ?? "").length * 53 % 300];

// Generated-art sprites for entity kinds (art/sprites/props cut from trs-prop-sheet);
// kinds not listed fall back to primitives until their sheets ship.
const ENTITY_SPRITE: Record<string, string> = {
  bell: "props/trs-prop-sheet-00.png",
  junction: "props/trs-prop-sheet-03.png",
  destination: "props/trs-prop-sheet-08.png",
  arch: "env/trs-env-kit-05.png",
  fixture: "env/trs-env-kit-07.png",
};

export function App() {
  const [screen, setScreen] = useState<Screen>("title");
  const [levelId, setLevelId] = useState<string>(LEVELS[0].id);
  const entry = LEVELS.find(l => l.id === levelId)!;
  const [state, setState] = useState<TrsPlayState>(() => engine.createInitialState(entry.def));
  const [viewing, setViewing] = useState<number | null>(null);
  const net = useRef<{ client: RoomClient; levelId: string } | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [netErr, setNetErr] = useState<string | null>(null);
  const [muted, setMuted] = useState(() => {
    try { const m = localStorage.getItem("trs-muted") === "1"; if (m) trsAudio.setMuted(true); return m; } catch { return false; }
  });
  const [hintsUsed, setHintsUsed] = useState(0);
  const [solvedIds, setSolvedIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("trs-solved") ?? "[]"); } catch { return []; }
  });
  const acceptedConfig = useRef<TrsPlayState["config"] | null>(null);
  useEffect(() => {
    if (state.solved && acceptedConfig.current === null) acceptedConfig.current = state.config;
    if (!state.solved) acceptedConfig.current = null;
  }, [state.solved, state.config]);
  const superseded = state.solved && acceptedConfig.current !== null &&
    JSON.stringify(acceptedConfig.current) !== JSON.stringify(state.config);
  useEffect(() => {
    if (state.solved && !solvedIds.includes(levelId)) {
      const next = [...solvedIds, levelId];
      setSolvedIds(next);
      try { localStorage.setItem("trs-solved", JSON.stringify(next)); } catch { /* private mode */ }
    }
  }, [state.solved, solvedIds, levelId]);

  const cueFor = (a: TrsAction, s: TrsPlayState) => {
    const last = s.runs[s.runs.length - 1];
    switch (a.type) {
      case "SetIntervention":
        trsAudio.play(a.intervention.kind === "SetValve" ? "valve.turn" : "intervention.place"); break;
      case "TestRun": trsAudio.play("trolley.roll"); break;
      case "AcceptResult": if (s.solved) trsAudio.play("case.close"); break;
      case "Undo": trsAudio.play("ui.tick"); break;
    }
    if (a.type === "TestRun" && last) trsAudio.play(last.evaluation.success ? "record.verify" : "record.contradict");
  };

  const fold = (payload: unknown) => {
    // Lockstep: apply an accepted command payload through the local engine.
    const cur = net.current;
    const lvl = LEVELS.find(l => l.id === (cur?.levelId ?? levelId));
    if (!lvl) return;
    const a = payload as TrsAction;
    setState(s => { const ns = engine.applyAction(lvl.def, s, a).state; cueFor(a, ns); return ns; });
  };

  const goOnline = async (mode: "create" | "join", code?: string) => {
    setNetErr(null);
    try {
      const client = new RoomClient({
        onJoin: (_a, rc) => setRoomCode(rc),
        onState: (rs) => {
          const r = rs as { levelId: string; state: TrsPlayState };
          if (net.current) net.current.levelId = r.levelId;
          setLevelId(r.levelId); setState(r.state);
        },
        onCommand: (p) => fold(p),
        onError: (_c, msg) => setNetErr(msg),
      });
      await client.connect();
      net.current = { client, levelId };
      if (mode === "create") client.createRoom("trs", levelId);
      else client.joinRoom(code ?? "");
      setScreen("case");
    } catch { setNetErr("Could not reach the room server."); }
  };

  const begin = (id: string) => {
    const e = LEVELS.find(x => x.id === id)!;
    setLevelId(id); setState(engine.createInitialState(e.def)); setViewing(null); setHintsUsed(0); setScreen("case");
  };
  const act = (a: TrsAction) => {
    if (net.current) { net.current.client.command(a); return; }
    if (engine.validateAction(entry.def, state, a).ok)
      setState(s => { const ns = engine.applyAction(entry.def, s, a).state; cueFor(a, ns); return ns; });
    else trsAudio.play("intervention.deny");
  };

  if (screen === "title")
    return <div className="screen title">
      <img className="title-art" src="/assets/trs-cover.png" alt="Archival diorama of the gala square" />
      <h1>The Record Stands</h1>
      <p className="tag">The gala went wrong. Prove you know why — then make it go right.</p>
      <button onClick={() => setScreen("select")}>Open the case files</button>
      <button onClick={() => setScreen("lobby")}>Play together</button>
      <button className="link" onClick={() => setScreen("credits")}>Credits</button>
      {netErr && <p className="fail">{netErr}</p>}
    </div>;

  if (screen === "credits")
    return <div className="screen"><h2>Credits</h2>
      <p className="why">The Record Stands — a sealed-observation puzzle in twelve files.</p>
      <ul>
        <li>A Devin production for the AI Skills Studio Challenge.</li>
        <li>Design, engine, interface, and levels built in the open; no external art or audio assets — every cue and image is generated in-repo.</li>
        <li>Engine: deterministic beat simulation over a shared town timeline. Multiplayer: live rooms over WebSocket.</li>
        <li>The night clerk keeps the ledger; the town keeps its accounts.</li>
      </ul>
      <button className="link" onClick={() => setScreen("title")}>← Back</button>
    </div>;

  if (screen === "lobby") {
    let codeInput = "";
    return <div className="screen"><h2>Two heads are better</h2>
      <p>Open a shared room on a case, or join one by code. Commands resolve on the server and replay here beat-for-beat.</p>
      <div className="actions">
        <button className="primary" onClick={() => void goOnline("create")}>Host a room ({levelId})</button>
        <input placeholder="Room code" onChange={e => codeInput = e.target.value} />
        <button onClick={() => void goOnline("join", codeInput)}>Join</button>
      </div>
      {netErr && <p className="fail">{netErr}</p>}
      <button className="link" onClick={() => setScreen("title")}>← Back</button>
    </div>;
  }

  if (screen === "select")
    return <div className="screen"><h2>Case files</h2>
      <div className="actions"><button className="link" onClick={() => setScreen("title")}>← Title</button></div>
      <div className="levelgrid">{LEVELS.map(l =>
        <button key={l.id} className="levelcard" onClick={() => begin(l.id)}>
          <strong>{l.id}</strong><span>{l.def.title}</span>
          {solvedIds.includes(l.id) && <span className="badge ok">solved</span>}
        </button>)}</div></div>;

  const level = entry.def;
  const last: RunRecord | undefined = state.runs[state.runs.length - 1];
  const shown: RunRecord | undefined = viewing !== null ? state.runs[viewing] : last;
  const used = engine.committedCost(level, state.config);

  return <div className="screen case">
    <header>
      <button onClick={() => setScreen("select")}>← Files</button>
      <h2>{level.levelId.toUpperCase()}: {level.title}</h2>
      {KEY_QUESTIONS[level.levelId.toUpperCase()] && <p className="keyq">{KEY_QUESTIONS[level.levelId.toUpperCase()]}</p>}
      <span className={`badge ${state.solved ? "ok" : ""}`}>
        {state.solved ? (superseded ? "Case closed — plan modified" : "Case closed") : `Budget ${used}/${level.interventionBudget}`}</span>
      {roomCode && <span className="badge">Room {roomCode}</span>}
      {netErr && <p className="fail">{netErr}</p>}
      <button className="link" onClick={() => { const m = !muted; trsAudio.setMuted(m); setMuted(m);
        try { localStorage.setItem("trs-muted", m ? "1" : "0"); } catch { /* private mode */ } }}>
        {muted ? "Sound off" : "Sound on"}</button>
    </header>
    <div className="casebody">
      <section className="board"><SceneView level={level} run={shown} state={state} /></section>
      <aside className="panel">
        <h3>Sealed observations</h3>
        <ul>{level.sealedObservations.map(o => {
          const r = shown?.evaluation.observations.find(x => x.predicateId === o.id);
          return <li key={o.id} className={shown ? (r?.passed ? "pass" : "fail") : ""}>
            {describeObs(o)}
            {r && !r.passed && r.divergence &&
              <div className="why">expected {r.divergence.expected}; {r.divergence.actual}</div>}
          </li>;
        })}</ul>
        <h3>Required outcome</h3>
        <ul>{level.desiredOutcomes.map(o => {
          const r = shown?.evaluation.outcomes.find(x => x.predicateId === o.id);
          return <li key={o.id} className={shown ? (r?.passed ? "pass" : "fail") : ""}>
            {describeOut(o)}
            {r && !r.passed && r.divergence &&
              <div className="why">expected {r.divergence.expected}; {r.divergence.actual}</div>}
          </li>;
        })}</ul>
        <h3>Interventions</h3>
        <InterventionPanel level={level} state={state} act={act} />
        <div className="actions">
          <button onClick={() => act({ type: "TestRun" })}>Run simulation</button>
          <button onClick={() => act({ type: "Undo" })}>Undo</button>
          <button className="primary" disabled={!(last?.evaluation.success && last.withinBudget)}
            onClick={() => act({ type: "AcceptResult" })}>Present findings</button>
        </div>
        {state.solved && <div className="ending" data-ending={levelId}>
          <h3>The record stands. Case closed.</h3>
          {superseded && <p className="why">The plan has changed since the archive accepted it — this verdict no longer describes the board.</p>}
          <p>{level.title} — the archive accepts your account.</p>
          {levelId === "TRS-12"
            ? <p className="why">Every file in the archive now reads true. The night clerk stamps the last ledger: the town's twelve accounts all hold — and you are why.</p>
            : <p className="why">The clerk pulls the next folder toward you.</p>}
          <div className="actions">
            <button className="link" onClick={() => setScreen("select")}>→ Case files</button>
          </div>
        </div>}
        {last && <div className={`verdict ${last.evaluation.success ? "pass" : "fail"}`} data-hints-used={hintsUsed}>
          {last.evaluation.success ? "All evidence supports the account." : "The account does not hold."}
          {!last.evaluation.success && (() => {
            const failed = [...last.evaluation.observations, ...last.evaluation.outcomes]
              .filter(p => !p.passed);
            const first = failed
              .filter(p => p.divergence)
              .sort((a, b) => a.divergence!.beat - b.divergence!.beat)[0] ?? failed[0];
            return first
              ? <div className="why">first breach: {first.predicateId}{first.divergence ? ` at beat ${first.divergence.beat}` : ""}</div>
              : null;
          })()}
          {last.budgetNote && <div>{last.budgetNote}</div>}
          {hintsUsed > 0 && <div className="why">hints used: {hintsUsed}/{level.hints.length}</div>}
          <button className="link" onClick={() => setViewing(viewing === null ? state.runs.length - 1 : null)}>
            {viewing === null ? "Step through timeline" : "Hide timeline"}</button>
        </div>}
        {viewing !== null && state.runs[viewing] &&
          <TimelineView beats={state.runs[viewing].timeline.beats} />}
        <h3>Hints</h3><HintLadder hints={[...level.hints]} onReveal={setHintsUsed} />
      </aside>
    </div>
  </div>;
}

function InterventionPanel({ level, state, act }: { level: CaseDefinition; state: TrsPlayState; act: (a: TrsAction) => void }) {
  const options: { slotKey: string; label: string; iv: Intervention }[] = [];
  for (const e of level.entities) {
    if (e.kind === "junction")
      for (const r of level.routes.filter(r => r.routeId !== String(e.initial.routeId)))
        options.push({ slotKey: `junction:${e.entityId}`, label: `Junction ${e.name ?? e.entityId} → ${r.label}`, iv: { kind: "RedirectJunction", junctionId: e.entityId, toRouteId: r.routeId } });
    if (e.kind === "fountain")
      options.push({ slotKey: `valve:${e.entityId}`, label: `Valve: stop ${e.name}`, iv: { kind: "SetValve", entityId: e.entityId, running: false } });
    if (e.kind === "fixture" || e.kind === "generic")
      options.push({ slotKey: `delay:${e.entityId}`, label: `Delay ${e.name} 2 beats`, iv: { kind: "SetMechanismDelay", entityId: e.entityId, delayBeats: 2 } });
  }
  for (const s of level.sockets)
    if (s.accepts.includes("PlaceAndArmToy"))
      options.push({ slotKey: `socket:${s.socketId}`, label: `Wind-up toy at ${s.socketId}`, iv: { kind: "PlaceAndArmToy", toyId: `toy-${s.socketId}`, socketId: s.socketId } });

  return <ul className="sockets">{options.map(o => {
    const cur = state.config[o.slotKey];
    const active = !!cur && cur.kind === o.iv.kind &&
      (cur as { toRouteId?: string }).toRouteId === (o.iv as { toRouteId?: string }).toRouteId &&
      (cur as { entityId?: string }).entityId === (o.iv as { entityId?: string }).entityId &&
      (cur as { socketId?: string }).socketId === (o.iv as { socketId?: string }).socketId;
    const cost = level.interventionCosts[o.iv.kind] ?? 1;
    return <li key={o.slotKey}>
      <button className={active ? "on" : ""}
        onClick={() => act(active ? { type: "RemoveIntervention", slotKey: o.slotKey }
          : { type: "SetIntervention", slotKey: o.slotKey, intervention: o.iv })}>
        {o.label} · cost {cost}</button>
    </li>;
  })}</ul>;
}

function SceneView({ level, run, state }: { level: CaseDefinition; run: RunRecord | undefined; state: TrsPlayState }) {
  const [beat, setBeat] = useState(0);
  const [playSpeed, setPlaySpeed] = useState<0 | 1 | 2 | 4>(0);
  useEffect(() => { setBeat(0); setPlaySpeed(0); }, [run]);
  // Diegetic beat cues: the replay audibly re-plays each beat's evidence
  // (bell strikes, skids, toy ratchets, ruined cargo) on step/scrub/autoplay.
  const CUE_FOR: Record<string, TrsCue> = {
    BellRing: "bell.ring", Skid: "cobble.splash",
    ToyStrike: "toy.windup", CargoRuined: "cargo.ruin",
  };
  useEffect(() => {
    if (!run) return;
    (run.timeline.beats[beat]?.events ?? []).forEach((e, i) => {
      const cue = CUE_FOR[e.type];
      if (cue) trsAudio.play(cue, `${e.type}:${e.entityId}:${beat}:${i}`);
    });
  }, [beat, run]);
  const beats0 = run?.timeline.beats ?? [];
  useEffect(() => {
    if (!playSpeed || !run) return;
    const id = setInterval(() => setBeat(b => b + 1), playSpeed === 1 ? 700 : playSpeed === 2 ? 350 : 175);
    return () => clearInterval(id);
  }, [playSpeed, run]);
  useEffect(() => { if (beat >= beats0.length - 1) setPlaySpeed(0); }, [beat, beats0.length]);
  const beats = run?.timeline.beats ?? [];
  const snap: Record<string, Record<string, unknown>> =
    (run && beats[beat]?.entityStates) ||
    Object.fromEntries(level.entities.map(e => [e.entityId, e.initial]));
  const entityPos = (id: string) => pos(String(snap[id]?.position ?? id));
  return <div className="scene">
    <svg viewBox="0 0 640 360" role="img" aria-label="venue map">
      {level.routes.map(r => <polyline key={r.routeId}
        points={r.waypoints.map(w => pos(w.locationId).join(",")).join(" ")}
        fill="none" stroke={r.routeId.includes("wet") ? "#4a7dbb" : "#8a7d5c"} strokeWidth="3" strokeDasharray="6 4" />)}
      {level.entities.filter(e => !["trolley", "windUpToy"].includes(e.kind)).map(e => {
        const [x, y] = pos(String(e.initial.position));
        const spr = e.kind === "fountain"
          ? (snap[e.entityId]?.running === true ? "env/trs-env-kit-00.png" : "env/trs-env-kit-01.png")
          : ENTITY_SPRITE[e.kind];
        const big = e.kind === "fountain" || e.kind === "arch";
        const w = big ? 60 : 44, hgt = big ? 64 : 40, dx = big ? 30 : 22, dy = big ? 52 : 30;
        return <g key={e.entityId}>
          {spr
            ? <image href={`/assets/sprites/${spr}`} x={x - dx} y={y - dy} width={w} height={hgt} preserveAspectRatio="xMidYMax meet" />
            : <circle cx={x} cy={y} r="9" fill={e.kind === "bell" ? "#c9a227" : e.kind === "destination" ? "#b06a4a" : "#5a8a5a"} />}
          <text x={x} y={y - dy - 4} textAnchor="middle" fontSize="10" fill="#e8e2d4">{e.name}</text></g>;
      })}
      {level.actors.map(a => {
        const [x, y] = entityPos(a.entityId);
        return <g key={a.entityId}>
          <image href="/assets/sprites/env/trs-env-kit-04.png" x={x - 18} y={y - 24} width="36" height="30" preserveAspectRatio="xMidYMax meet" />
          <text x={x} y={y - 28} textAnchor="middle" fontSize="10" fill="#ffd97a">{a.entityId}</text></g>;
      })}
      {Object.values(state.config).filter(iv => iv.kind === "PlaceAndArmToy").map((iv, i) => {
        const s = level.sockets.find(s2 => s2.socketId === (iv as { socketId: string }).socketId);
        const [x, y] = pos(s?.locationId ?? "tray");
        return <g key={i}><image href="/assets/sprites/props/trs-prop-sheet-04.png" x={x + 8} y={y + 6} width="22" height="30" preserveAspectRatio="xMidYMax meet" /></g>;
      })}
      {run && beats[beat]?.events.map((ev, i) =>
        <text key={i} x="12" y={340 - i * 14} fontSize="11" fill="#ffd97a">{`b${beats[beat]?.beat}: ${ev.type} ${ev.entityId ?? ""}`}</text>)}
    </svg>
    {run && <div className="scrub">
      <button aria-label="rewind" onClick={() => { setPlaySpeed(0); setBeat(0); }}>⏮</button>
      <button onClick={() => setBeat(Math.max(0, beat - 1))}>◀</button>
      <input type="range" min={0} max={beats.length - 1} value={beat} onChange={e => { setPlaySpeed(0); setBeat(+e.target.value); }} aria-label="beat" />
      <button onClick={() => setBeat(Math.min(beats.length - 1, beat + 1))}>▶</button>
      <button className={playSpeed ? "on" : ""}
        onClick={() => setPlaySpeed(playSpeed ? 0 : 1)}
        aria-label={playSpeed ? "pause" : "play"}>{playSpeed ? "⏸" : "▶"}</button>
      <button className={playSpeed === 2 ? "on" : ""}
        onClick={() => setPlaySpeed(playSpeed === 2 ? 0 : 2)} aria-label="play 2x">2×</button>
      <button className={playSpeed === 4 ? "on" : ""}
        onClick={() => setPlaySpeed(playSpeed === 4 ? 0 : 4)} aria-label="play 4x">4×</button>
      <span>beat {beats[beat]?.beat ?? 0}/{beats.length ? beats[beats.length - 1]?.beat ?? 0 : 0}</span>
    </div>}
  </div>;
}

function TimelineView({ beats }: { beats: { beat: number; events: { type: string }[] }[] }) {
  return <ol className="timeline">{beats.map(b =>
    <li key={b.beat}><b>{b.beat}</b> {b.events.map(e => e.type).join(", ") || "—"}</li>)}</ol>;
}

function HintLadder({ hints, onReveal }: { hints: string[]; onReveal?: (n: number) => void }) {
  const [n, setN] = useState(0);
  return <div className="hints">
    {hints.slice(0, n).map((h, i) => <p key={i} className="hint">{h}</p>)}
    {n < hints.length && <button className="link" onClick={() => { const m = n + 1; setN(m); onReveal?.(m); }}>Reveal hint {n + 1}/{hints.length}</button>}
  </div>;
}

function describeObs(o: Observation): string {
  switch (o.form) {
    case "EventOccurred": return `${o.entityId}: ${o.eventType} at beat ${o.beat}`;
    case "EntityAt": return `${o.entityId} at ${o.locationId} at beat ${o.beat}`;
    case "AtCrossing": return `${o.entityId} crosses ${o.crossingId} at beat ${o.beat}`;
    case "StateEquals": return `${o.entityId}.${o.field} = ${String(o.value)} at beat ${o.beat}`;
    case "EventAbsent": return `${o.entityId}: no ${o.eventType} between beats ${o.fromBeat}–${o.toBeat}`;
    case "EventCount": return `${o.entityId}: ${o.eventType} ×${o.count} between ${o.fromBeat}–${o.toBeat}`;
    case "VisibleFrom": return `${o.entityId} visible from ${o.cameraRegionId} at beat ${o.beat}`;
  }
}
function describeOut(o: OutcomePredicate): string {
  switch (o.form) {
    case "EntityStateAtEnd": return `${o.entityId}.${o.field} = ${String(o.value)} at end`;
    case "EventOccurredByEnd": return `${o.entityId}: ${o.eventType} occurs by end`;
    case "EventNever": return `${o.entityId}: ${o.eventType} never occurs`;
  }
}
