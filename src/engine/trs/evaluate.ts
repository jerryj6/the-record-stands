/**
 * Predicate evaluation over a Timeline (master TRS-002/003/005/010).
 * Success = ALL sealed observations AND ALL desired outcomes AND budget (checked by caller).
 */
import type { GameEvent, PredicateResult, RunEvaluation } from "../contracts.js";
import type { Observation, OutcomePredicate, Timeline } from "./types.js";

function allEvents(t: Timeline): GameEvent[] {
  return t.beats.flatMap(b => b.events);
}

function entityFieldAt(t: Timeline, entityId: string, field: string, beat: number): unknown {
  const log = t.beats.find(b => b.beat === beat);
  return log?.entityStates[entityId]?.[field];
}

function evalObservation(t: Timeline, obs: Observation): PredicateResult {
  const evs = allEvents(t);
  switch (obs.form) {
    case "EventOccurred": {
      const hit = evs.find(e => e.type === obs.eventType && e.entityId === obs.entityId && e.beat === obs.beat);
      const actualEvents = evs.filter(e => e.type === obs.eventType && e.entityId === obs.entityId);
      return {
        predicateId: obs.id, kind: "observation", passed: !!hit,
        ...(hit ? {} : {
          divergence: {
            beat: obs.beat, entityId: obs.entityId,
            expected: `${obs.eventType} at beat ${obs.beat}`,
            actual: actualEvents.length
              ? `${obs.eventType} at beat(s) ${actualEvents.map(e => e.beat).join(",")}`
              : `no ${obs.eventType} from ${obs.entityId}`,
          },
        }),
      };
    }
    case "EntityAt": {
      const pos = entityFieldAt(t, obs.entityId, "position", obs.beat);
      const passed = pos === obs.locationId;
      return {
        predicateId: obs.id, kind: "observation", passed,
        ...(passed ? {} : { divergence: { beat: obs.beat, entityId: obs.entityId, expected: `at ${obs.locationId}`, actual: `at ${String(pos)}` } }),
      };
    }
    case "AtCrossing": {
      const hit = evs.find(e => e.type === "Crossing" && e.entityId === obs.entityId && e.data?.["crossingId"] === obs.crossingId && e.beat === obs.beat);
      return {
        predicateId: obs.id, kind: "observation", passed: !!hit,
        ...(hit ? {} : { divergence: { beat: obs.beat, entityId: obs.entityId, expected: `crossing ${obs.crossingId} at ${obs.beat}`, actual: "crossing did not occur" } }),
      };
    }
    case "StateEquals": {
      const v = entityFieldAt(t, obs.entityId, obs.field, obs.beat);
      const passed = v === obs.value;
      return {
        predicateId: obs.id, kind: "observation", passed,
        ...(passed ? {} : { divergence: { beat: obs.beat, entityId: obs.entityId, expected: `${obs.field}=${JSON.stringify(obs.value)}`, actual: `${obs.field}=${JSON.stringify(v)}` } }),
      };
    }
    case "EventAbsent": {
      const hits = evs.filter(e => e.type === obs.eventType && e.entityId === obs.entityId && e.beat >= obs.fromBeat && e.beat <= obs.toBeat);
      const passed = hits.length === 0;
      return {
        predicateId: obs.id, kind: "observation", passed,
        ...(passed ? {} : { divergence: { beat: hits[0]!.beat, entityId: obs.entityId, expected: `no ${obs.eventType} in [${obs.fromBeat},${obs.toBeat}]`, actual: `${obs.eventType} at beat ${hits[0]!.beat}` } }),
      };
    }
    case "EventCount": {
      const n = evs.filter(e => e.type === obs.eventType && e.entityId === obs.entityId && e.beat >= obs.fromBeat && e.beat <= obs.toBeat).length;
      const passed = n === obs.count;
      return {
        predicateId: obs.id, kind: "observation", passed,
        ...(passed ? {} : { divergence: { beat: obs.fromBeat, entityId: obs.entityId, expected: `count=${obs.count}`, actual: `count=${n}` } }),
      };
    }
    case "VisibleFrom": {
      // Camera regions resolve to declared location sets (logical, previewed — not rendered pixels).
      const pos = entityFieldAt(t, obs.entityId, "position", obs.beat);
      const passed = typeof pos === "string" && pos.startsWith(`${obs.cameraRegionId}:`) === false && pos !== undefined;
      void passed;
      // v1: geometric regions are declared per level as location lists in entity field cameraRegions.
      const regions = (t.beats[0]?.entityStates["__world"]?.["cameraRegions"] ?? {}) as Record<string, string[]>;
      const inRegion = (regions[obs.cameraRegionId] ?? []).includes(pos as string);
      return {
        predicateId: obs.id, kind: "observation", passed: inRegion,
        ...(inRegion ? {} : { divergence: { beat: obs.beat, entityId: obs.entityId, expected: `visible from ${obs.cameraRegionId}`, actual: `at ${String(pos)}` } }),
      };
    }
  }
}

function evalOutcome(t: Timeline, oc: OutcomePredicate): PredicateResult {
  const evs = allEvents(t);
  switch (oc.form) {
    case "EntityStateAtEnd": {
      const v = t.finalEntityStates[oc.entityId]?.[oc.field];
      const passed = v === oc.value;
      return {
        predicateId: oc.id, kind: "outcome", passed,
        ...(passed ? {} : { divergence: { beat: t.beats.length, entityId: oc.entityId, expected: `${oc.field}=${JSON.stringify(oc.value)}`, actual: `${oc.field}=${JSON.stringify(v)}` } }),
      };
    }
    case "EventOccurredByEnd": {
      const hit = evs.find(e => e.type === oc.eventType && e.entityId === oc.entityId);
      return {
        predicateId: oc.id, kind: "outcome", passed: !!hit,
        ...(hit ? {} : { divergence: { beat: t.beats.length, entityId: oc.entityId, expected: `${oc.eventType} occurred`, actual: "never occurred" } }),
      };
    }
    case "EventNever": {
      const hits = evs.filter(e => e.type === oc.eventType && e.entityId === oc.entityId);
      const passed = hits.length === 0;
      return {
        predicateId: oc.id, kind: "outcome", passed,
        ...(passed ? {} : { divergence: { beat: hits[0]!.beat, entityId: oc.entityId, expected: `${oc.eventType} never`, actual: `at beat ${hits[0]!.beat}` } }),
      };
    }
  }
}

export function evaluateRun(
  t: Timeline,
  observations: Observation[],
  outcomes: OutcomePredicate[]
): RunEvaluation {
  const obs = observations.map(o => evalObservation(t, o));
  const outs = outcomes.map(o => evalOutcome(t, o));
  const aop = obs.every(r => r.passed);
  const aout = outs.every(r => r.passed);
  return { observations: obs, outcomes: outs, allObservationsPass: aop, allOutcomesPass: aout, success: aop && aout };
}
