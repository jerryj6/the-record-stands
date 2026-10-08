import type { PartKind, Placement } from "../../src/engine/machine/types";

const P = (id: string, kind: PartKind, gx: number, gy: number, flip = false): Placement => ({ id, kind, gx, gy, flip });

/** Known-good builds per level (verified by tests/campaign). */
export const SOLUTIONS: Record<string, Placement[]> = {
  "gala-01": [P("a", "ramp", 9, 5)],
  "gala-02": [P("a", "rampLong", 8, 4)],
  "gala-03": [P("a", "ramp", 7, 6), P("d0", "domino", 8, 10), P("d00", "domino", 9, 10), P("d1", "domino", 10, 10), P("d2", "domino", 11, 10), P("d3", "domino", 12, 10), P("d4", "domino", 13, 10), P("d5", "domino", 14, 10)],
  "gala-04": [P("t", "toy", 9, 11), P("d1", "domino", 12, 10), P("d2", "domino", 13, 10), P("d3", "domino", 14, 10), P("d4", "domino", 15, 10), P("r", "ramp", 23, 3, true)],
  "gala-05": [P("a", "rampLong", 7, 5), P("b", "bucket", 17, 10)],
  "gala-06": [P("a", "rampLong", 7, 5), P("b", "bucket", 17, 10), P("t", "toy", 12, 11, true)],
  "gala-07": [P("a", "rampLong", 7, 5), P("b", "bucket", 17, 10), P("r", "ramp", 23, 3, true)],
  "gala-08": [P("s", "lever", 9, 11), P("d", "domino", 14, 10), P("t", "toy", 17, 11, true)],
  "gala-09": [P("s", "lever", 7, 11, true), P("d", "domino", 5, 10), P("t", "toy", 2, 11), P("b", "bucket", 12, 10)],
};

/** Plausible wrong builds per level with the failure they must produce. */
export const FAILURES: Record<string, { build: Placement[]; expect: "missing" | "order" | "cake" }> = {
  "gala-01": { build: [P("a", "ramp", 9, 7)], expect: "cake" },
  "gala-02": { build: [P("a", "ramp", 8, 4)], expect: "order" },
  "gala-03": { build: [...SOLUTIONS["gala-03"]!, P("d6", "domino", 23, 10)], expect: "cake" },
  "gala-06": { build: [P("a", "rampLong", 7, 5), P("b", "bucket", 17, 10), P("t", "toy", 9, 11, true)], expect: "order" },
  "gala-05": { build: [P("a", "rampLong", 7, 5), P("b", "bucket", 17, 11)], expect: "missing" },
  "gala-07": { build: [P("a", "rampLong", 7, 5), P("b", "bucket", 17, 10), P("r", "ramp", 23, 3)], expect: "cake" },
  "gala-08": { build: [P("s", "lever", 9, 11), P("d", "domino", 14, 10), P("t", "toy", 17, 11)], expect: "cake" },
  "gala-09": { build: [P("s", "lever", 7, 11, true), P("d", "domino", 5, 10), P("t", "toy", 2, 11)], expect: "missing" },
  "gala-04": { build: SOLUTIONS["gala-04"]!.filter((p) => p.kind !== "ramp"), expect: "cake" },
};
