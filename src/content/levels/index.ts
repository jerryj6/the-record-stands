import { TRS01 } from "./trs01-grand-opening.js";
import { TRS02 } from "./trs02-the-late-lantern.js";
import { TRS03 } from "./trs03-rain-on-the-parade.js";
import { TRS04 } from "./trs04-the-shared-counterweight.js";

export const LEVELS = [
  { id: "TRS-01", def: TRS01 },
  { id: "TRS-02", def: TRS02 },
  { id: "TRS-03", def: TRS03 },
  { id: "TRS-04", def: TRS04 },
] as const;
