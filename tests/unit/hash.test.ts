import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { sha256Hex } from "../../src/engine/hash.js";
import { stableStringify } from "../../src/engine/trs/engine.js";

describe("pure-TS sha256", () => {
  it("matches node:crypto across sizes", () => {
    for (const s of ["", "a", "abc", "x".repeat(55), "x".repeat(56), "x".repeat(64), "x".repeat(200), stableStringify({ b: 1, a: [2, "z"] })])
      expect(sha256Hex(s)).toBe(createHash("sha256").update(s).digest("hex"));
  });
  it("stableStringify is key-order independent", () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
  });
});
