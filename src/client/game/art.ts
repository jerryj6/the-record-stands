import { Graphics } from "pixi.js";

export const PAL = {
  ink: 0x3b2a1e,
  paper: 0xf3e6c8,
  paperDark: 0xe2cfa4,
  sky: 0xf4e4c1,
  skyLow: 0xead2a2,
  terracotta: 0xb5452f,
  red: 0xa8322a,
  olive: 0x6f7a3a,
  oliveDark: 0x55602b,
  stone: 0xcdb48a,
  stoneDark: 0xa88d62,
  stoneLight: 0xe0caa0,
  brass: 0xc9a04a,
  brassDark: 0x8c6a26,
  wood: 0xb07a43,
  woodLight: 0xd9a561,
  woodDark: 0x7a4f27,
  water: 0x5d8a86,
  waterLight: 0x8fb7ad,
  marble: 0x3f6fb0,
  tin: 0x8a9aa0,
  tinDark: 0x5f6e74,
  ok: 0x4f8a3c,
  bad: 0xc0392b,
};

const SHADOW = { color: 0x2a1a0e, alpha: 0.18 };

/** Ramp plank along the footprint diagonal; local origin = footprint top-left. */
export function drawRamp(g: Graphics, u: number, w: number, h: number, flip: boolean): void {
  const x0 = 0;
  const x1 = w * u;
  const yHigh = u / 8;
  const yLow = h * u - u / 8;
  const ya = flip ? yLow : yHigh;
  const yb = flip ? yHigh : yLow;
  const th = u * 0.2;
  const sh = u * 0.1;
  g.poly([x0 + sh, ya + sh, x1 + sh, yb + sh, x1 + sh, yb + th + sh, x0 + sh, ya + th + sh]).fill(SHADOW);
  g.poly([x0, ya, x1, yb, x1, yb + th, x0, ya + th]).fill(PAL.wood).stroke({ width: Math.max(1.5, u * 0.045), color: PAL.ink, join: "round" });
  g.moveTo(x0 + u * 0.08, ya + th * 0.35).lineTo(x1 - u * 0.08, yb + th * 0.35).stroke({ width: Math.max(1, u * 0.03), color: PAL.woodLight });
  for (const [x, y] of [[x0 + u * 0.22, ya + (yb - ya) * (0.22 / w) + th / 2], [x1 - u * 0.22, yb - (yb - ya) * (0.22 / w) + th / 2]] as const) {
    g.circle(x, y, u * 0.065).fill(PAL.brass).stroke({ width: 1, color: PAL.brassDark });
  }
}

/** Domino drawn standing with its base centre at (0,0); rotate the container to topple. */
export function drawDomino(g: Graphics, u: number): void {
  const w = u * 0.28;
  const h = u * 1.8;
  g.roundRect(-w / 2 + u * 0.06, -h + u * 0.06, w, h, u * 0.05).fill(SHADOW);
  g.roundRect(-w / 2, -h, w, h, u * 0.05).fill(0xf7efdc).stroke({ width: Math.max(1.5, u * 0.045), color: PAL.ink });
  g.moveTo(-w / 2 + u * 0.05, -h / 2).lineTo(w / 2 - u * 0.05, -h / 2).stroke({ width: Math.max(1, u * 0.03), color: PAL.ink, alpha: 0.6 });
  for (const f of [0.2, 0.32, 0.68, 0.8]) g.circle(0, -h * f, u * 0.045).fill(PAL.red);
}

/** Fulcrum stand for a seesaw; origin = footprint top-left. */
export function drawFulcrum(g: Graphics, u: number): void {
  const px = 2 * u;
  const py = u / 2;
  g.poly([px - u * 0.42 + u * 0.08, u + 0.5, px + u * 0.42 + u * 0.08, u + 0.5, px + u * 0.08, py + u * 0.08]).fill(SHADOW);
  g.poly([px - u * 0.42, u, px + u * 0.42, u, px, py]).fill(PAL.brass).stroke({ width: Math.max(1.5, u * 0.045), color: PAL.ink, join: "round" });
  g.circle(px, py + u * 0.05, u * 0.08).fill(PAL.brassDark);
}

/** Seesaw plank centred at (0,0), horizontal; rotate container for tilt. */
export function drawPlank(g: Graphics, u: number): void {
  const half = u * 1.875;
  const th = u * 0.18;
  g.roundRect(-half + u * 0.08, -th + u * 0.08, half * 2, th, u * 0.05).fill(SHADOW);
  g.roundRect(-half, -th, half * 2, th, u * 0.05).fill(PAL.terracotta).stroke({ width: Math.max(1.5, u * 0.045), color: PAL.ink });
  g.moveTo(-half + u * 0.1, -th * 0.6).lineTo(half - u * 0.1, -th * 0.6).stroke({ width: Math.max(1, u * 0.03), color: 0xe08a6a });
  g.circle(0, -th / 2, u * 0.07).fill(PAL.brass).stroke({ width: 1, color: PAL.brassDark });
}

/** Tin bucket with its base centre at (0,0). */
export function drawBucket(g: Graphics, u: number): void {
  const top = -u * 0.8;
  const wTop = u * 0.42;
  const wBot = u * 0.32;
  g.poly([-wTop + u * 0.07, top + u * 0.07, wTop + u * 0.07, top + u * 0.07, wBot + u * 0.07, u * 0.07, -wBot + u * 0.07, u * 0.07]).fill(SHADOW);
  g.arc(0, top, wTop * 0.85, Math.PI, 0).stroke({ width: Math.max(1.5, u * 0.04), color: PAL.ink });
  g.poly([-wTop, top, wTop, top, wBot, 0, -wBot, 0]).fill(PAL.tin).stroke({ width: Math.max(1.5, u * 0.045), color: PAL.ink, join: "round" });
  g.moveTo(-wTop * 0.93, top + u * 0.22).lineTo(wTop * 0.93, top + u * 0.22).stroke({ width: Math.max(1, u * 0.035), color: PAL.tinDark });
  g.moveTo(-wBot * 1.05, -u * 0.18).lineTo(wBot * 1.05, -u * 0.18).stroke({ width: Math.max(1, u * 0.035), color: PAL.tinDark });
  g.rect(-wTop - u * 0.03, top - u * 0.04, wTop * 2 + u * 0.06, u * 0.08).fill(PAL.tinDark);
}

/** Glass marble centred at (0,0); `spin` in radians rotates the swirl. */
export function drawMarble(g: Graphics, u: number, spin: number): void {
  const r = u * 0.3;
  g.circle(u * 0.05, u * 0.06, r).fill(SHADOW);
  g.circle(0, 0, r).fill(PAL.marble).stroke({ width: Math.max(1.5, u * 0.045), color: PAL.ink });
  const c = Math.cos(spin);
  const s = Math.sin(spin);
  g.moveTo(-r * 0.7 * c, -r * 0.7 * s).bezierCurveTo(-r * 0.2 * s, r * 0.2 * c, r * 0.2 * s, -r * 0.2 * c, r * 0.7 * c, r * 0.7 * s)
    .stroke({ width: Math.max(1.5, u * 0.06), color: 0xe8b04a });
  g.circle(-r * 0.35, -r * 0.4, r * 0.22).fill({ color: 0xffffff, alpha: 0.75 });
}

/** Brass delivery pipe that drops the marble; origin = cell top-left. */
export function drawChute(g: Graphics, u: number): void {
  const w = u * 0.8;
  g.rect(u * 0.1 + u * 0.08, -u * 3 + u * 0.08, w, u * 3.4).fill(SHADOW);
  g.rect(u * 0.1, -u * 3, w, u * 3.4).fill(PAL.brass).stroke({ width: Math.max(1.5, u * 0.045), color: PAL.ink });
  g.rect(u * 0.22, -u * 3, u * 0.14, u * 3.4).fill({ color: 0xf1d38a, alpha: 0.8 });
  for (const y of [-u * 2.2, -u * 1.0]) g.rect(u * 0.04, y, u * 0.92, u * 0.16).fill(PAL.brassDark).stroke({ width: 1, color: PAL.ink });
  g.roundRect(0, u * 0.25, u, u * 0.22, u * 0.06).fill(PAL.brassDark).stroke({ width: Math.max(1.5, u * 0.045), color: PAL.ink });
}

/** Track-end buffer post; origin = cell top-left (cell sits on the ground). */
export function drawBuffer(g: Graphics, u: number): void {
  g.rect(u * 0.45 + u * 0.07, u * 0.1 + u * 0.07, u * 0.4, u * 0.9).fill(SHADOW);
  g.rect(u * 0.45, u * 0.1, u * 0.4, u * 0.9).fill(PAL.wood).stroke({ width: Math.max(1.5, u * 0.045), color: PAL.ink });
  g.roundRect(u * 0.2, u * 0.25, u * 0.3, u * 0.36, u * 0.08).fill(PAL.red).stroke({ width: Math.max(1.5, u * 0.045), color: PAL.ink });
  g.rect(u * 0.45, u * 0.72, u * 0.4, u * 0.1).fill(PAL.paper);
}

/** Masonry block with courses, cap and a cut-paper drop shadow. */
export function drawStone(g: Graphics, u: number, x: number, y: number, w: number, h: number): void {
  const sh = u * 0.14;
  g.rect(x + sh, y + sh, w, h).fill(SHADOW);
  g.rect(x, y, w, h).fill(PAL.stone);
  const course = u / 2;
  for (let row = 0, yy = y + course; yy < y + h - 1; yy += course, row++) {
    g.moveTo(x, yy).lineTo(x + w, yy).stroke({ width: 1, color: PAL.stoneDark, alpha: 0.7 });
  }
  for (let row = 0, yy = y; yy < y + h - 1; yy += course, row++) {
    const off = row % 2 === 0 ? 0 : u * 0.5;
    for (let xx = x + off + u; xx < x + w - 2; xx += u) {
      g.moveTo(xx, yy).lineTo(xx, Math.min(y + h, yy + course)).stroke({ width: 1, color: PAL.stoneDark, alpha: 0.6 });
    }
  }
  g.rect(x, y, w, u * 0.16).fill(PAL.stoneLight);
  g.rect(x, y, w, h).stroke({ width: Math.max(1.5, u * 0.05), color: PAL.ink, alignment: 1 });
}

export function drawWater(g: Graphics, u: number, x: number, y: number, w: number, h: number, phase: number): void {
  g.rect(x, y, w, h).fill(PAL.water);
  for (let i = 0; i < 3; i++) {
    const yy = y + u * (0.25 + i * 0.5);
    g.moveTo(x, yy);
    for (let xx = x; xx <= x + w; xx += u / 4) g.lineTo(xx, yy + Math.sin(xx / u * 2.4 + phase + i) * u * 0.06);
    g.stroke({ width: Math.max(1, u * 0.04), color: PAL.waterLight, alpha: 0.8 });
  }
}

/** Distant paper-cut rooftops for the pop-up backdrop. Deterministic per seed. */
export function drawSkyline(g: Graphics, u: number, width: number, baseY: number, seed: number, color: number, scale: number, windows = false): void {
  let s = seed;
  const rnd = (): number => { s = (s * 16807) % 2147483647; return (s % 1000) / 1000; };
  let x = -u;
  const pts: number[] = [x, baseY];
  while (x < width + u) {
    const bw = u * (1.6 + rnd() * 2.2) * scale;
    const bh = u * (2 + rnd() * 3.5) * scale;
    const roof = rnd();
    pts.push(x, baseY - bh);
    if (roof < 0.45) pts.push(x + bw / 2, baseY - bh - u * 1.1 * scale);
    else if (roof < 0.6) { pts.push(x + bw * 0.4, baseY - bh, x + bw * 0.4, baseY - bh - u * 1.6 * scale, x + bw * 0.6, baseY - bh - u * 1.6 * scale, x + bw * 0.6, baseY - bh); }
    pts.push(x + bw, baseY - bh);
    x += bw;
  }
  pts.push(x, baseY);
  g.poly(pts.map((v) => v + u * 0.12)).fill(SHADOW);
  g.poly(pts).fill(color).stroke({ width: Math.max(1, u * 0.035), color: PAL.ink, alpha: 0.5 });
  if (!windows) return;
  // lit windows and roof caps give the cut-out facades some life
  for (let i = 2; i + 3 < pts.length - 2; i += 2) {
    const x0 = pts[i]!;
    const y0 = pts[i + 1]!;
    const x1 = pts[i + 2]!;
    const y1 = pts[i + 3]!;
    if (y0 !== y1 || x1 - x0 < u * 1.2) continue;
    g.rect(x0, y0, x1 - x0, u * 0.18).fill({ color: PAL.terracotta, alpha: 0.75 });
    for (let wy = y0 + u * 0.6; wy < baseY - u * 0.8; wy += u * 0.9) {
      for (let wx = x0 + u * 0.35; wx < x1 - u * 0.5; wx += u * 0.75) {
        g.roundRect(wx, wy, u * 0.3, u * 0.42, u * 0.08).fill({ color: rnd() < 0.3 ? 0xf2c76b : 0x8a6a48, alpha: 0.55 });
      }
    }
  }
}

/** Bunting string between two points. */
export function drawBunting(g: Graphics, u: number, x0: number, y0: number, x1: number, y1: number): void {
  const sag = u * 0.8;
  const n = Math.max(3, Math.floor((x1 - x0) / (u * 0.8)));
  g.moveTo(x0, y0).quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1).stroke({ width: 1, color: PAL.ink, alpha: 0.6 });
  const colors = [PAL.terracotta, PAL.paper, PAL.olive, PAL.brass];
  for (let i = 1; i < n; i++) {
    const tt = i / n;
    const x = (1 - tt) * (1 - tt) * x0 + 2 * (1 - tt) * tt * ((x0 + x1) / 2) + tt * tt * x1;
    const y = (1 - tt) * (1 - tt) * y0 + 2 * (1 - tt) * tt * ((y0 + y1) / 2 + sag * 2) + tt * tt * y1;
    g.poly([x - u * 0.18, y, x + u * 0.18, y, x, y + u * 0.42]).fill(colors[i % colors.length]!).stroke({ width: 1, color: PAL.ink, alpha: 0.5 });
  }
}
