/**
 * level-cards.ts — the campaign's LevelCard registry (GME-004). Every
 * level's card lives beside its definition as `TRSxx_CARD`; this module
 * gathers them into one map keyed by LEVELS id so the verification suite
 * can assert coverage without touching any single level file. TRS-01 is
 * the canonical upstream file with no card export — its card is recorded
 * here verbatim.
 */
import { TRS02_CARD } from "./levels/trs02-the-late-lantern.js";
import { TRS03_CARD } from "./levels/trs03-rain-on-the-parade.js";
import { TRS04_CARD } from "./levels/trs04-the-shared-counterweight.js";
import { TRS05_CARD } from "./levels/trs05-two-sides-of-the-square.js";
import { TRS06_CARD } from "./levels/trs06-the-unbroken-exhibit.js";
import { TRS07_CARD } from "./levels/trs07-the-wrong-delivery.js";
import { TRS08_CARD } from "./levels/trs08-the-quiet-interval.js";
import { TRS09_CARD } from "./levels/trs09-the-same-moment.js";
import { TRS10_CARD } from "./levels/trs10-no-spare-parts.js";
import { TRS11_CARD } from "./levels/trs11-the-archive-exhibition.js";
import { TRS12_CARD } from "./levels/trs12-the-town-that-didnt-fall.js";

export interface LevelCard {
  readonly winningTraceSummary: string;
  readonly wrongApproaches: readonly string[];
  readonly strategySignatures?: readonly string[];
  readonly coopNote?: string;
}

/**
 * Solution policy per level (GME-009 §3.6 checklist): every level declares
 * whether its intended solve space is unique (the insight is the point),
 * hybrid (forced core, free expression), or open (the discovery space is
 * the level). Derived from the full solution-space enumeration
 * (coordination dataroom/001): counts are irreducible minimal solutions.
 */
export type SolutionPolicy = "unique" | "hybrid" | "open";

export const SOLUTION_POLICIES: Readonly<Record<string, SolutionPolicy>> = {
  "TRS-01": "unique",   // 1 minimal solve — tutorial gate
  "TRS-02": "unique",   // 1 — lantern lesson
  "TRS-03": "hybrid",   // 6 — detour+toy core; compression + inherit alternates kept
  "TRS-04": "hybrid",   // 3 — dry-keep core + supply-skid + upperCircuit/toy hybrid
  "TRS-05": "hybrid",   // 2 — reroute vs dry-in-place; 2 gated proto-monoliths @4/3
  "TRS-06": "hybrid",   // 3 — cloister×{toy,porter-skid} + dry-hazard
  "TRS-07": "unique",   // 1 — pure seesaw/coupling level
  "TRS-08": "hybrid",   // 3 — reroute / retime / vesperRoad
  "TRS-09": "open",     // 16 — crossing-substitution space IS the level
  "TRS-10": "hybrid",   // 6 — detour core, spare-substitute periphery
  "TRS-11": "hybrid",   // 4 — detour core, spare-assignment periphery
  "TRS-12": "open",     // 14 — dual-carrier relay + cross-assignment space
};

/**
 * Difficulty vector per level (GME-009 §3.34: components must explain the
 * chapter ordering). `minimalSolutions` = irreducible winning configs from
 * the enumeration audit; `budget` = interventionBudget. Reading: spike
 * levels are the discovery peaks (09, 12); TRS-07 is deliberately the
 * tightest non-tutorial level (single solve at budget 4).
 */
export interface DifficultyVector {
  readonly minimalSolutions: number;
  readonly budget: number;
}

export const DIFFICULTY_VECTORS: Readonly<Record<string, DifficultyVector>> = {
  "TRS-01": { minimalSolutions: 1,  budget: 2 },
  "TRS-02": { minimalSolutions: 1,  budget: 3 },
  "TRS-03": { minimalSolutions: 6,  budget: 3 },
  "TRS-04": { minimalSolutions: 3,  budget: 3 },
  "TRS-05": { minimalSolutions: 2,  budget: 3 },
  "TRS-06": { minimalSolutions: 3,  budget: 3 },
  "TRS-07": { minimalSolutions: 1,  budget: 4 },
  "TRS-08": { minimalSolutions: 3,  budget: 4 },
  "TRS-09": { minimalSolutions: 16, budget: 4 },
  "TRS-10": { minimalSolutions: 6,  budget: 4 },
  "TRS-11": { minimalSolutions: 4,  budget: 4 },
  "TRS-12": { minimalSolutions: 14, budget: 5 },
};

/**
 * keyQuestion per level (GME-009 §3.x development-as-content): the level's
 * catch as a question — what the sealed record asks the player to notice.
 * Card metadata; rendered above the hint ladder in the case panel.
 */
export const KEY_QUESTIONS: Readonly<Record<string, string>> = {
  "TRS-01": "What made the trolley hit the bell — and does the record care who rings it?",
  "TRS-02": "The lantern was late — but was its crossing early in the record?",
  "TRS-03": "Shorter is not on time — which road keeps the gate's beat?",
  "TRS-04": "The chime rang once — must the counterweight ring it?",
  "TRS-05": "Both sides of the square are sealed — can one plan hold both?",
  "TRS-06": "The record counted one ring — who should NOT skid?",
  "TRS-07": "Was the delivery wrong, or were the routes?",
  "TRS-08": "What rings once and then stays silent?",
  "TRS-09": "Two bells, one beat — whose cause covers each?",
  "TRS-10": "Which consequence can be inherited instead of rebuilt?",
  "TRS-11": "Two half-plans, one empty cart — which road commits?",
  "TRS-12": "A bell that must ring and a tower that must stay silent — which substitute knows the difference?",
};

const TRS01_CARD: LevelCard = {
  winningTraceSummary:
    "Redirect the square junction onto the dry arcade lane — same duration, the arch crossing at 5 preserved — and set the wind-up drummer at the bell socket: it strikes the brass bell at 4 (2/2).",
  wrongApproaches: [
    "Closing the fountain saves the cake but kills the bell record and contradicts the sealed 'fountain running at 6'.",
    "The dry lane alone saves the cake and keeps the arch crossing, but the brass bell never rings at 4.",
    "The toy alone rings at 4 but the trolley still skids on the wet lane — the cake is ruined anyway.",
  ],
  strategySignatures: ["dry-route+toy-substitute"],
  coopNote:
    "Solo-scale tutorial: one player reads the bell/arch/fountain facts while a second commits the two-step repair.",
};

export const LEVEL_CARDS: Record<string, LevelCard> = {
  "TRS-01": TRS01_CARD,
  "TRS-02": TRS02_CARD,
  "TRS-03": TRS03_CARD,
  "TRS-04": TRS04_CARD,
  "TRS-05": TRS05_CARD,
  "TRS-06": TRS06_CARD,
  "TRS-07": TRS07_CARD,
  "TRS-08": TRS08_CARD,
  "TRS-09": TRS09_CARD,
  "TRS-10": TRS10_CARD,
  "TRS-11": TRS11_CARD,
  "TRS-12": TRS12_CARD,
};
