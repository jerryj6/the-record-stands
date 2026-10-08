import type { PartKind, Placement } from "../../src/engine/machine/types";

const P = (id: string, kind: PartKind, gx: number, gy: number, flip = false): Placement => ({ id, kind, gx, gy, flip });

/** Known-good builds per level (verified by tests/campaign). */
export const SOLUTIONS: Record<string, Placement[]> = {
  "gala-01": [P("a", "ramp", 9, 5)],
  "gala-02": [P("a", "rampLong", 8, 4)],
  "gala-03": [P("a", "ramp", 7, 6), P("d1", "domino", 10, 10), P("d2", "domino", 11, 10), P("d3", "domino", 12, 10), P("d4", "domino", 13, 10), P("d5", "domino", 14, 10)],
};

/** Plausible wrong builds per level with the failure they must produce. */
export const FAILURES: Record<string, { build: Placement[]; expect: "missing" | "order" | "cake" }> = {
  "gala-01": { build: [P("a", "ramp", 9, 7)], expect: "cake" },
  "gala-02": { build: [P("a", "ramp", 8, 4)], expect: "order" },
  "gala-03": { build: [...SOLUTIONS["gala-03"]!, P("d6", "domino", 23, 10)], expect: "cake" },
};
