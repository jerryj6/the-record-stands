import { useEffect, useState } from "react";
import { TrsEngine } from "../engine/trs/engine.js";
import type { TrsPlayState, TrsAction, RunRecord } from "../engine/trs/engine.js";
import type { CaseDefinition, Intervention, Observation, OutcomePredicate } from "../engine/trs/types.js";
import { LEVELS } from "../content/levels/index.js";

const engine = new TrsEngine();

type Screen = "title" | "select" | "case";

const POS: Record<string, [number, number]> = {
  start: [40, 300], laneWest: [110, 250], fountainEdge: [210, 220], bellCorner: [310, 190],
  arch: [420, 180], destination: [540, 170],
  arcadeWest: [110, 320], arcadeMid: [220, 330], arcadeEast: [330, 320],
  squareCenter: [250, 120], tray: [80, 60],
};
const pos = (id?: string) => POS[id ?? ""] ?? [60 + (id ?? "").length * 37 % 520, 40 + (id ?? "").length * 53 % 300];

export function App() {
  const [screen, setScreen] = useState<Screen>("title");
  const [levelId, setLevelId] = useState<string>(LEVELS[0].id);
  const entry = LEVELS.find(l => l.id === levelId)!;
  const [state, setState] = useState<TrsPlayState>(() => engine.createInitialState(entry.def));
  const [viewing, setViewing] = useState<number | null>(null);

  const begin = (id: string) => {
    const e = LEVELS.find(x => x.id === id)!;
    setLevelId(id); setState(engine.createInitialState(e.def)); setViewing(null); setScreen("case");
  };
  const act = (a: TrsAction) => {
    if (engine.validateAction(entry.def, state, a).ok)
      setState(engine.applyAction(entry.def, state, a).state);
  };

  if (screen === "title")
    return <div className="screen title">
      <h1>The Record Stands</h1>
      <p className="tag">The gala went wrong. Prove you know why — then make it go right.</p>
      <button onClick={() => setScreen("select")}>Open the case files</button>
    </div>;

  if (screen === "select")
    return <div className="screen"><h2>Case files</h2>
      <div className="levelgrid">{LEVELS.map(l =>
        <button key={l.id} className="levelcard" onClick={() => begin(l.id)}>
          <strong>{l.id}</strong><span>{l.def.title}</span>
        </button>)}</div></div>;

  const level = entry.def;
  const last: RunRecord | undefined = state.runs[state.runs.length - 1];
  const shown: RunRecord | undefined = viewing !== null ? state.runs[viewing] : last;
  const used = engine.committedCost(level, state.config);

  return <div className="screen case">
    <header>
      <button onClick={() => setScreen("select")}>← Files</button>
      <h2>{level.levelId}: {level.title}</h2>
      <span className={`badge ${state.solved ? "ok" : ""}`}>
        {state.solved ? "Case closed" : `Budget ${used}/${level.interventionBudget}`}</span>
    </header>
    <div className="casebody">
      <section className="board"><SceneView level={level} run={shown} state={state} /></section>
      <aside className="panel">
        <h3>Sealed observations</h3>
        <ul>{level.sealedObservations.map(o =>
          <li key={o.id} className={shown ? (shown.evaluation.observations.find(x => x.predicateId === o.id)?.passed ? "pass" : "fail") : ""}>
            {describeObs(o)}</li>)}</ul>
        <h3>Required outcome</h3>
        <ul>{level.desiredOutcomes.map(o =>
          <li key={o.id} className={shown ? (shown.evaluation.outcomes.find(x => x.predicateId === o.id)?.passed ? "pass" : "fail") : ""}>
            {describeOut(o)}</li>)}</ul>
        <h3>Interventions</h3>
        <InterventionPanel level={level} state={state} act={act} />
        <div className="actions">
          <button onClick={() => act({ type: "TestRun" })}>Run simulation</button>
          <button onClick={() => act({ type: "Undo" })}>Undo</button>
          <button className="primary" disabled={!(last?.evaluation.success && last.withinBudget)}
            onClick={() => act({ type: "AcceptResult" })}>Present findings</button>
        </div>
        {last && <div className={`verdict ${last.evaluation.success ? "pass" : "fail"}`}>
          {last.evaluation.success ? "All evidence supports the account." : "The account does not hold."}
          {last.budgetNote && <div>{last.budgetNote}</div>}
          <button className="link" onClick={() => setViewing(viewing === null ? state.runs.length - 1 : null)}>
            {viewing === null ? "Step through timeline" : "Hide timeline"}</button>
        </div>}
        {viewing !== null && state.runs[viewing] &&
          <TimelineView beats={state.runs[viewing].timeline.beats} />}
        <h3>Hints</h3><HintLadder hints={[...level.hints]} />
      </aside>
    </div>
  </div>;
}

function InterventionPanel({ level, state, act }: { level: CaseDefinition; state: TrsPlayState; act: (a: TrsAction) => void }) {
  const options: { slotKey: string; label: string; iv: Intervention }[] = [];
  for (const e of level.entities) {
    if (e.kind === "junction")
      for (const r of level.routes.filter(r => r.routeId !== String(e.initial.routeId)))
        options.push({ slotKey: `junction:${e.entityId}`, label: `Junction → ${r.label}`, iv: { kind: "RedirectJunction", junctionId: e.entityId, toRouteId: r.routeId } });
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
    const active = !!cur;
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
  useEffect(() => setBeat(0), [run]);
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
        return <g key={e.entityId}><circle cx={x} cy={y} r="9"
          fill={e.kind === "bell" ? "#c9a227" : e.kind === "destination" ? "#b06a4a" : "#5a8a5a"} />
          <text x={x} y={y - 14} textAnchor="middle" fontSize="10" fill="#e8e2d4">{e.name}</text></g>;
      })}
      {level.actors.map(a => {
        const [x, y] = entityPos(a.entityId);
        return <g key={a.entityId}><rect x={x - 8} y={y - 8} width="16" height="16" rx="3" fill="#b03a2e" />
          <text x={x} y={y - 14} textAnchor="middle" fontSize="10" fill="#ffd97a">{a.entityId}</text></g>;
      })}
      {Object.values(state.config).filter(iv => iv.kind === "PlaceAndArmToy").map((iv, i) => {
        const s = level.sockets.find(s2 => s2.socketId === (iv as { socketId: string }).socketId);
        const [x, y] = pos(s?.locationId ?? "tray");
        return <g key={i}><rect x={x + 10} y={y + 10} width="8" height="8" fill="#d4a017" /></g>;
      })}
      {run && beats[beat]?.events.map((ev, i) =>
        <text key={i} x="12" y={340 - i * 14} fontSize="11" fill="#ffd97a">{`b${beats[beat]?.beat}: ${ev.type} ${ev.entityId ?? ""}`}</text>)}
    </svg>
    {run && <div className="scrub">
      <button onClick={() => setBeat(Math.max(0, beat - 1))}>◀</button>
      <input type="range" min={0} max={beats.length - 1} value={beat} onChange={e => setBeat(+e.target.value)} aria-label="beat" />
      <button onClick={() => setBeat(Math.min(beats.length - 1, beat + 1))}>▶</button>
      <span>beat {beats[beat]?.beat ?? 0}/{beats.length ? beats[beats.length - 1]?.beat ?? 0 : 0}</span>
    </div>}
  </div>;
}

function TimelineView({ beats }: { beats: { beat: number; events: { type: string }[] }[] }) {
  return <ol className="timeline">{beats.map(b =>
    <li key={b.beat}><b>{b.beat}</b> {b.events.map(e => e.type).join(", ") || "—"}</li>)}</ol>;
}

function HintLadder({ hints }: { hints: string[] }) {
  const [n, setN] = useState(0);
  return <div className="hints">
    {hints.slice(0, n).map((h, i) => <p key={i} className="hint">{h}</p>)}
    {n < hints.length && <button className="link" onClick={() => setN(n + 1)}>Reveal hint {n + 1}/{hints.length}</button>}
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
