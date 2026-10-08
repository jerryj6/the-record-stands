import { TRS01 } from "./trs01-grand-opening.js";
import { TRS02 } from "./trs02-the-late-lantern.js";
import { TRS03 } from "./trs03-rain-on-the-parade.js";
import { TRS04 } from "./trs04-the-shared-counterweight.js";
import { TRS05 } from "./trs05-two-sides-of-the-square.js";
import { TRS06 } from "./trs06-the-unbroken-exhibit.js";
import { TRS07 } from "./trs07-the-wrong-delivery.js";
import { TRS08 } from "./trs08-the-quiet-interval.js";
import { TRS09 } from "./trs09-the-same-moment.js";
import { TRS10 } from "./trs10-no-spare-parts.js";
import { TRS11 } from "./trs11-the-archive-exhibition.js";
import { TRS12 } from "./trs12-the-town-that-didnt-fall.js";

export const LEVELS = [
  { id: "TRS-01", def: TRS01 },
  { id: "TRS-02", def: TRS02 },
  { id: "TRS-03", def: TRS03 },
  { id: "TRS-04", def: TRS04 },
  { id: "TRS-05", def: TRS05 },
  { id: "TRS-06", def: TRS06 },
  { id: "TRS-07", def: TRS07 },
  { id: "TRS-08", def: TRS08 },
  { id: "TRS-09", def: TRS09 },
  { id: "TRS-10", def: TRS10 },
  { id: "TRS-11", def: TRS11 },
  { id: "TRS-12", def: TRS12 },
] as const;
