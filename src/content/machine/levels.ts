import type { MachineLevel } from "../../engine/machine/types.js";

const FLOOR_ROW = 12;

export const L1: MachineLevel = {
  id: "gala-01",
  number: 1,
  title: "The Bell at Dawn",
  brief: "Make the marble ring the town bell. Keep the cake clean.",
  cols: 28,
  rows: 14,
  terrain: [
    { x: 0, y: 4, w: 9, h: 1 },
    { x: 0, y: FLOOR_ROW, w: 8, h: 2 },
    { x: 12, y: FLOOR_ROW, w: 16, h: 2 },
  ],
  fixed: [
    { id: "chute", kind: "chute", gx: 1, gy: 2, vx: 260, vy: 0 },
    { id: "bell", kind: "bell", gx: 13, gy: 7, label: "Town bell" },
    { id: "cake", kind: "cake", gx: 24, gy: 10, label: "Gala cake" },
  ],
  inventory: { ramp: 1 },
  stamps: [{ id: "s1", label: "BELL RINGS", kind: "ring", target: "bell" }],
  stretches: [0, 14, 28],
  maxTicks: 1200,
  decor: [
    { kind: "lampTall", gx: 4, gy: 9 },
    { kind: "stall", gx: 17, gy: 9 },
    { kind: "lamp", gx: 21, gy: 10 },
  ],
  hint: "Catch the falling marble with a ramp and aim it at the bell.",
};

export const L2: MachineLevel = {
  id: "gala-02",
  number: 2,
  title: "Two Witnesses",
  brief: "The fountain bell must ring first, then the arcade bell.",
  cols: 28,
  rows: 14,
  terrain: [
    { x: 0, y: 4, w: 8, h: 1 },
    { x: 0, y: FLOOR_ROW, w: 28, h: 2 },
  ],
  fixed: [
    { id: "chute", kind: "chute", gx: 1, gy: 2, vx: 260, vy: 0 },
    { id: "arcade", kind: "bell", gx: 14, gy: 10, label: "Arcade bell" },
    { id: "fountain", kind: "bell", gx: 22, gy: 10, label: "Fountain bell" },
    { id: "cake", kind: "cake", gx: 26, gy: 10, label: "Gala cake" },
  ],
  inventory: { ramp: 2, rampLong: 1 },
  stamps: [
    { id: "s1", label: "FOUNTAIN BELL RINGS", kind: "ring", target: "fountain" },
    { id: "s2", label: "ARCADE BELL RINGS", kind: "ring", target: "arcade" },
  ],
  stretches: [0, 14, 28],
  maxTicks: 1500,
  decor: [
    { kind: "fountain", gx: 18, gy: 9 },
    { kind: "lamp", gx: 6, gy: 10 },
  ],
  hint: "Send the marble over the arcade bell first. It can ring it on the way back.",
};

export const L3: MachineLevel = {
  id: "gala-03",
  number: 3,
  title: "Through the Arch",
  brief: "Ring both bells, then roll the cake trolley safely through the arch.",
  cols: 32,
  rows: 14,
  terrain: [
    { x: 0, y: 4, w: 7, h: 1 },
    { x: 0, y: FLOOR_ROW, w: 32, h: 2 },
  ],
  fixed: [
    { id: "chute", kind: "chute", gx: 1, gy: 2, vx: 260, vy: 0 },
    { id: "square", kind: "bell", gx: 9, gy: 6, label: "Square bell" },
    { id: "tower", kind: "bell", gx: 4, gy: 10, label: "Tower bell" },
    { id: "brake", kind: "lever", gx: 16, gy: 11, flip: true, link: "trolley", label: "Trolley brake" },
    { id: "trolley", kind: "trolley", gx: 20, gy: 10, held: true, label: "Cake trolley" },
    { id: "arch", kind: "arch", gx: 24, gy: 8, label: "Parade arch" },
    { id: "buffer", kind: "buffer", gx: 31, gy: 11 },
  ],
  inventory: { ramp: 2, domino: 6, bucket: 1, toy: 1 },
  stamps: [
    { id: "s1", label: "SQUARE BELL RINGS", kind: "ring", target: "square" },
    { id: "s2", label: "TOWER BELL RINGS", kind: "ring", target: "tower" },
    { id: "s3", label: "TROLLEY PASSES ARCH", kind: "pass", target: "arch" },
  ],
  stretches: [0, 14, 32],
  maxTicks: 1800,
  decor: [
    { kind: "lamp", gx: 7, gy: 9 },
    { kind: "stall", gx: 1, gy: 9 },
  ],
  hint: "The brake lever lets the trolley go. Topple something onto its high end.",
};

export const MACHINE_LEVELS: readonly MachineLevel[] = [L1, L2, L3];
export function machineLevel(id: string): MachineLevel {
  return MACHINE_LEVELS.find((l) => l.id === id) ?? L1;
}
