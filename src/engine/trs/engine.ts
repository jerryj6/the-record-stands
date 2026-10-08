/**
 * TRS session engine — wraps the simulator in the shared DeterministicEngine
 * contract. Player state = committed intervention configuration + run history.
 * A Test re-runs the whole timeline from the case's initial state (TRS-009):
 * it never partially alters a past replay.
 */
import { createHash } from "node:crypto";
import type { DeterministicEngine, GameEvent, RunEvaluation } from "../contracts.js";
import { RULES_VERSION } from "../contracts.js";
import { simulate } from "./sim.js";
import { evaluateRun } from "./evaluate.js";
import type { CaseDefinition, Intervention, Timeline } from "./types.js";

export type TrsAction =
  | { type: "SetIntervention"; intervention: Intervention; slotKey: string }
  | { type: "RemoveIntervention"; slotKey: string }
  | { type: "TestRun" }
  | { type: "Undo" }
  | { type: "AcceptResult" };

export interface TrsPlayState {
  levelId: string;
  /** committed configuration: slotKey → intervention (re-editing a slot is free) */
  config: Record<string, Intervention>;
  runs: RunRecord[];
  acceptedRunIndex: number | null;
  checkpoints: TrsPlayState[]; // undo stack (gameplay only)
  solved: boolean;
}

export interface RunRecord {
  timeline: Timeline;
  evaluation: RunEvaluation;
  cost: number;
  withinBudget: boolean;
  budgetNote: string | null;
}

export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o).sort().map(k => `${JSON.stringify(k)}:${stableStringify(o[k])}`).join(",")}}`;
}
export function canonicalHashOf(v: unknown): string {
  return createHash("sha256").update(stableStringify(v)).digest("hex");
}

export class TrsEngine implements DeterministicEngine<CaseDefinition, TrsPlayState, TrsAction> {
  readonly rulesVersion = RULES_VERSION;

  createInitialState(level: CaseDefinition): TrsPlayState {
    return {
      levelId: level.levelId, config: {}, runs: [],
      acceptedRunIndex: null, checkpoints: [], solved: false,
    };
  }

  getLegalActions(_l: CaseDefinition, s: TrsPlayState): TrsAction[] {
    const acts: TrsAction[] = [{ type: "TestRun" }];
    if (s.checkpoints.length > 0) acts.push({ type: "Undo" });
    const last = s.runs[s.runs.length - 1];
    if (last?.evaluation.success && last.withinBudget) acts.push({ type: "AcceptResult" });
    return acts;
  }

  committedCost(level: CaseDefinition, config: Record<string, Intervention>): number {
    let c = 0;
    for (const iv of Object.values(config)) c += level.interventionCosts[iv.kind] ?? 1;
    return c;
  }

  validateAction(level: CaseDefinition, s: TrsPlayState, a: TrsAction): { ok: true } | { ok: false; reason: string } {
    switch (a.type) {
      case "SetIntervention": {
        // socket compatibility for toys
        if (a.intervention.kind === "PlaceAndArmToy") {
          const ok = level.sockets.some(x => x.socketId === a.intervention.socketId && x.accepts.includes("PlaceAndArmToy"));
          if (!ok) return { ok: false, reason: `socket ${a.intervention.socketId} does not accept PlaceAndArmToy` };
        }
        return { ok: true };
      }
      case "RemoveIntervention": return { ok: true };
      case "TestRun": return { ok: true };
      case "Undo": return s.checkpoints.length ? { ok: true } : { ok: false, reason: "nothing to undo" };
      case "AcceptResult": {
        const last = s.runs[s.runs.length - 1];
        if (!last) return { ok: false, reason: "no test run to accept" };
        if (!last.withinBudget) return { ok: false, reason: last.budgetNote ?? "over budget" };
        if (!last.evaluation.success) return { ok: false, reason: "run does not satisfy all observations and outcomes" };
        return { ok: true };
      }
    }
  }

  applyAction(level: CaseDefinition, s: TrsPlayState, a: TrsAction): { state: TrsPlayState; events: GameEvent[] } {
    const cp = (x: TrsPlayState): TrsPlayState => ({ ...x, config: { ...x.config }, runs: [...x.runs], checkpoints: [...x.checkpoints] });
    switch (a.type) {
      case "SetIntervention": {
        const n = cp(s);
        n.checkpoints.push({ ...s, config: { ...s.config }, runs: s.runs, checkpoints: [] });
        n.config[a.slotKey] = a.intervention;
        n.acceptedRunIndex = null;
        return { state: n, events: [{ beat: 0, type: "ConfigChanged", data: { slot: a.slotKey } }] };
      }
      case "RemoveIntervention": {
        const n = cp(s);
        n.checkpoints.push({ ...s, config: { ...s.config }, runs: s.runs, checkpoints: [] });
        delete n.config[a.slotKey];
        n.acceptedRunIndex = null;
        return { state: n, events: [{ beat: 0, type: "ConfigChanged", data: { slot: a.slotKey, removed: true } }] };
      }
      case "TestRun": {
        const n = cp(s);
        const cost = this.committedCost(level, n.config);
        const within = cost <= level.interventionBudget;
        const timeline = simulate(level, Object.values(n.config));
        const evaluation = evaluateRun(timeline, level.sealedObservations, level.desiredOutcomes);
        const budgetNote = within ? null
          : `Committed ${cost} intervention(s); budget is ${level.interventionBudget}. Remove ${cost - level.interventionBudget} before the archive accepts this plan.`;
        n.runs.push({ timeline, evaluation, cost, withinBudget: within, budgetNote });
        n.acceptedRunIndex = null;
        const events: GameEvent[] = [{ beat: 0, type: "RunTested", data: { runIndex: n.runs.length - 1 } }];
        // surface engine events for UI/audio
        for (const b of timeline.beats) events.push(...b.events);
        return { state: n, events };
      }
      case "Undo": {
        const prev = s.checkpoints[s.checkpoints.length - 1];
        if (!prev) return { state: s, events: [] };
        const n = cp(prev);
        n.checkpoints = s.checkpoints.slice(0, -1);
        n.runs = s.runs; // run history is append-only evidence, undo restores config
        return { state: n, events: [{ beat: 0, type: "Undone" }] };
      }
      case "AcceptResult": {
        const n = cp(s);
        n.acceptedRunIndex = n.runs.length - 1;
        n.solved = true;
        return { state: n, events: [{ beat: 0, type: "CaseAccepted" }] };
      }
    }
  }

  canonicalHash(s: TrsPlayState): string {
    return canonicalHashOf({
      levelId: s.levelId,
      config: s.config,
      runs: s.runs.map(r => ({
        cost: r.cost, within: r.withinBudget,
        obs: r.evaluation.observations.map(o => [o.predicateId, o.passed]),
        outs: r.evaluation.outcomes.map(o => [o.predicateId, o.passed]),
        beatEvents: r.timeline.beats.map(b => b.events),
        finalStates: r.timeline.finalEntityStates,
      })),
      accepted: s.acceptedRunIndex,
      solved: s.solved,
    });
  }

  serialize(s: TrsPlayState): unknown {
    const { checkpoints: _drop, ...rest } = s;
    return rest;
  }

  restore(_l: CaseDefinition, data: unknown): TrsPlayState {
    const d = data as TrsPlayState;
    return { ...d, checkpoints: [] };
  }
}
