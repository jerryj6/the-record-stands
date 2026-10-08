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
