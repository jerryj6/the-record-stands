import { Application, Assets, Container, Graphics, Sprite, Text, TilingSprite, type FederatedPointerEvent, type Texture } from "pixi.js";
import { canPlace, FOOTPRINT, occupiedCells, type PlaceRange } from "../../engine/machine/geometry";
import { buildWorld, createSim, leverEnds, stepSim, verdictOf, type SimState, type World } from "../../engine/machine/sim";
import { remaining, type BuildCommand, type BuildState } from "../../engine/machine/editor";
import { C, type DecorKind, type MachineLevel, type PartKind, type Placement, type SimEvent, type Verdict } from "../../engine/machine/types";
import {
  PAL, drawBucket, drawBuffer, drawBunting, drawChute, drawDomino, drawFulcrum, drawMarble, drawPlank, drawRamp,
  drawSkyline, drawStone, drawWater,
} from "./art";
import { sfx } from "./sound";

const A = "/assets/sprites/";
const TEX = {
  bell: `${A}props/trs-prop-sheet-00.png`,
  lamp: `${A}props/trs-prop-sheet-01.png`,
  lampTall: `${A}props/trs-prop-sheet-02.png`,
  barricade: `${A}props/trs-prop-sheet-03.png`,
  toy: `${A}props/trs-prop-sheet-04.png`,
  cake: `${A}props/trs-prop-sheet-08.png`,
  fountain: `${A}env/trs-env-kit-00.png`,
  arch: `${A}env/trs-env-kit-05.png`,
  banner: `${A}env/trs-env-kit-06.png`,
  stall: `${A}env/trs-env-kit-07.png`,
  wall: `${A}props/trs-prop-sheet-07.png`,
  tram: `${A}env/trs-env-kit-04.png`,
  paper: "/assets/trs-material-paper.png",
} as const;
type TexKey = keyof typeof TEX;

export const PART_NAMES: Record<PartKind, string> = {
  ramp: "Ramp",
  rampLong: "Long ramp",
  domino: "Domino",
  lever: "Seesaw",
  bucket: "Bucket",
  toy: "Wind-up toy",
};
const TRAY_ORDER: PartKind[] = ["ramp", "rampLong", "domino", "lever", "bucket", "toy"];
const DECOR_H: Record<DecorKind, number> = { lamp: 3, lampTall: 3, stall: 3, fountain: 3, banner: 3, wall: 3 };

export interface StageCallbacks {
  onCommand(cmd: BuildCommand): void;
  onStamp(index: number, inOrder: boolean): void;
  onRunEnd(verdict: Verdict): void;
  onHint(msg: string): void;
}

export interface Layout { top: number; tray: number; playReserve: number }

interface Drag {
  kind: PartKind;
  flip: boolean;
  id?: string;
  startX: number;
  startY: number;
  moved: boolean;
  touch: boolean;
  gx: number;
  gy: number;
  valid: boolean;
  overTray: boolean;
}

interface Particle { g: Graphics; life: number; max: number; vx: number; vy: number; spin: number }

export class Stage {
  readonly app = new Application();
  private tex = {} as Record<TexKey, Texture>;
  private level!: MachineLevel;
  private build!: BuildState;
  private range: PlaceRange | undefined;
  private world!: World;
  private sim!: SimState;
  private running = false;
  private finished = false;
  private eventCursor = 0;
  private acc = 0;
  speed = 1;
  private u = 40;
  private ox = 0;
  private oy = 0;
  private camX = 0;
  private sceneW = 0;
  private layout: Layout = { top: 72, tray: 100, playReserve: 200 };
  private time = 0;
  private drag: Drag | null = null;
  private pan: { x: number; cam: number } | null = null;
  private litStamps: Array<"dark" | "lit" | "wrong"> = [];

  private worldLayer = new Container();
  private bgLayer = new Container();
  private staticLayer = new Container();
  private dynLayer = new Container();
  private fgLayer = new Container();
  private fxLayer = new Container();
  private ghostLayer = new Container();
  private trayLayer = new Container();
  private waterG = new Graphics();
  private sceneMask = new Graphics();
  private dynG = new Graphics();
  private badgeLayer = new Container();
  private particles: Particle[] = [];
  private sprites = new Map<string, Container>();
  private leverAngles = new Map<string, number>();
  private traySlots: Array<{ kind: PartKind; x: number; y: number; w: number; h: number }> = [];

  constructor(private host: HTMLElement, private cb: StageCallbacks) {}

  async init(): Promise<void> {
    await this.app.init({
      resizeTo: this.host,
      background: 0x2b1d12,
      antialias: true,
      resolution: Math.min(2, window.devicePixelRatio || 1),
      autoDensity: true,
    });
    this.app.canvas.setAttribute("aria-label", "Contraption scene");
    this.host.appendChild(this.app.canvas);
    const loaded = await Assets.load(Object.values(TEX));
    for (const [k, url] of Object.entries(TEX)) this.tex[k as TexKey] = loaded[url] as Texture;
    this.worldLayer.mask = this.sceneMask;
    this.app.stage.addChild(this.sceneMask);
    this.worldLayer.addChild(this.bgLayer, this.waterG, this.staticLayer, this.dynLayer, this.fgLayer, this.badgeLayer, this.fxLayer, this.ghostLayer);
    this.dynLayer.addChild(this.dynG);
    this.app.stage.addChild(this.worldLayer, this.trayLayer);
    this.app.stage.eventMode = "static";
    this.app.stage.hitArea = this.app.screen;
    this.app.stage.on("pointerdown", (e) => this.onDown(e));
    this.app.stage.on("globalpointermove", (e) => this.onMove(e));
    this.app.stage.on("pointerup", (e) => this.onUp(e));
    this.app.stage.on("pointerupoutside", (e) => this.onUp(e));
    this.app.renderer.on("resize", () => this.relayout());
    this.app.ticker.add((tk) => this.frame(tk.deltaMS));
    // read-only probe for automated browser tests (never shown to players)
    (window as unknown as { __trsStage?: unknown }).__trsStage = {
      cell: (gx: number, gy: number) => ({ x: this.ox + gx * this.u, y: this.oy + gy * this.u, u: this.u }),
      slot: (kind: PartKind) => { const sl = this.traySlots.find((v) => v.kind === kind); return sl ? { x: sl.x + sl.w / 2, y: sl.y + sl.h / 2 } : null; },
      placements: () => this.build?.placements.length ?? 0,
      running: () => this.running,
    };
  }

  destroy(): void {
    this.app.destroy(true, { children: true });
  }

  setLayout(l: Layout): void {
    this.layout = l;
    if (this.level) this.relayout();
  }

  setLevel(level: MachineLevel, build: BuildState, range: PlaceRange | undefined): void {
    this.level = level;
    this.camX = 0;
    this.running = false;
    this.finished = false;
    this.setBuild(build, range);
    this.relayout();
  }

  setBuild(build: BuildState, range: PlaceRange | undefined): void {
    this.build = build;
    this.range = range;
    if (!this.running) this.resetPreview();
    this.drawTray();
    this.drawStatic();
  }

  /** Begin the deterministic playback of the current build. */
  startRun(): void {
    this.world = buildWorld(this.level, this.build.placements);
    this.sim = createSim(this.world, this.build.placements);
    this.running = true;
    this.finished = false;
    this.eventCursor = 0;
    this.acc = 0;
    this.litStamps = this.level.stamps.map(() => "dark");
    this.drag = null;
    this.ghostLayer.removeChildren();
    this.rebuildDynamic();
    this.drawBadges();
    this.drawTray();
  }

  stopRun(): void {
    this.running = false;
    this.finished = false;
    this.fxLayer.removeChildren();
    this.particles = [];
    this.resetPreview();
    this.drawTray();
  }

  get isRunning(): boolean { return this.running; }

  private resetPreview(): void {
    if (!this.level) return;
    this.world = buildWorld(this.level, this.build.placements);
    this.sim = createSim(this.world, this.build.placements);
    this.litStamps = this.level.stamps.map(() => "dark");
    this.leverAngles.clear();
    this.rebuildDynamic();
    this.drawBadges();
  }

  /* ---------------- layout ---------------- */

  private relayout(): void {
    if (!this.level) return;
    const W = this.app.screen.width;
    const H = this.app.screen.height;
    const availH = H - this.layout.top - this.layout.tray;
    const fit = Math.floor(Math.min(availH / this.level.rows, W / this.level.cols));
    this.u = fit >= 30 ? fit : Math.max(24, Math.min(44, Math.floor(availH / this.level.rows)));
    this.sceneW = this.level.cols * this.u;
    this.oy = this.layout.top + Math.max(0, Math.floor((availH - this.level.rows * this.u) / 2));
    this.clampCam();
    this.drawBackground();
    this.drawStatic();
    this.rebuildDynamic();
    this.drawBadges();
    this.drawTray();
  }

  private clampCam(): void {
    const W = this.app.screen.width;
    if (this.sceneW <= W) { this.ox = Math.floor((W - this.sceneW) / 2); this.camX = 0; }
    else { this.camX = Math.max(0, Math.min(this.sceneW - W, this.camX)); this.ox = -Math.round(this.camX); }
    this.worldLayer.position.set(this.ox, this.oy);
    const x0 = Math.max(0, this.ox);
    const w = Math.min(W, this.ox + this.sceneW) - x0;
    this.sceneMask.clear().rect(x0, this.oy - this.u * 4, w, this.level.rows * this.u + this.u * 4).fill(0xffffff);
  }

  get pannable(): boolean { return this.sceneW > this.app.screen.width; }

  /* ---------------- drawing ---------------- */

  private sprite(key: TexKey, h: number, anchorX = 0.5, anchorY = 1): Sprite {
    const s = new Sprite(this.tex[key]);
    s.anchor.set(anchorX, anchorY);
    const scale = h / s.texture.height;
    s.scale.set(scale);
    return s;
  }

  private drawBackground(): void {
    const u = this.u;
    const L = this.level;
    this.bgLayer.removeChildren().forEach((c) => c.destroy());
    const W = L.cols * u;
    const H = L.rows * u;
    const sky = new Graphics();
    const bands = 8;
    for (let i = 0; i < bands; i++) {
      const tt = i / (bands - 1);
      const col = lerpColor(PAL.sky, PAL.skyLow, tt);
      sky.rect(-u * 4, (H * i) / bands - 1, W + u * 8, H / bands + 2).fill(col);
    }
    this.bgLayer.addChild(sky);
    const far = new Graphics();
    drawSkyline(far, u, W, u * 9.5, 11 + L.number, 0xd6c7a2, 0.9);
    const near = new Graphics();
    drawSkyline(near, u, W, u * 12, 29 + L.number * 7, 0xd2b07c, 1.15, true);
    this.bgLayer.addChild(far, near);
    const bunt = new Graphics();
    drawBunting(bunt, u, u * 1, u * 0.6, W * 0.45, u * 0.9);
    drawBunting(bunt, u, W * 0.55, u * 0.9, W - u, u * 0.5);
    this.bgLayer.addChild(bunt);
    for (const d of L.decor) {
      const h = DECOR_H[d.kind] * u * (d.scale ?? 1);
      const s = this.sprite(d.kind, h, 0.5, 1);
      s.position.set((d.gx + 1) * u, (d.gy + DECOR_H[d.kind]) * u);
      s.alpha = 0.92;
      this.bgLayer.addChild(s);
    }
    const terr = new Graphics();
    // canal water fills the bottom rows where there is no ground
    for (const r of L.terrain) drawStone(terr, u, r.x * u, r.y * u, r.w * u, r.h * u);
    this.bgLayer.addChild(terr);
    const paper = new Sprite(this.tex.paper);
    paper.width = W;
    paper.height = H;
    paper.alpha = 0.2;
    this.bgLayer.addChild(paper);
    // stretch boundaries for relay co-op
    if (L.stretches.length > 2) {
      const g = new Graphics();
      for (let i = 1; i < L.stretches.length - 1; i++) {
        const x = L.stretches[i]! * u;
        for (let y = 0; y < H; y += u * 0.5) g.moveTo(x, y).lineTo(x, y + u * 0.25);
      }
      g.stroke({ width: 2, color: PAL.ink, alpha: 0.35 });
      this.bgLayer.addChild(g);
    }
    // frame the page edge so wide screens read as a pop-up book spread
    const edge = new Graphics();
    edge.rect(0, 0, W, H).stroke({ width: Math.max(2, u * 0.08), color: PAL.ink, alpha: 0.85 });
    this.bgLayer.addChild(edge);
  }

  private gaps(): Array<{ x: number; w: number }> {
    const L = this.level;
    const floorRow = L.rows - 2;
    const out: Array<{ x: number; w: number }> = [];
    let start = -1;
    for (let x = 0; x <= L.cols; x++) {
      const solid = x < L.cols && L.terrain.some((r) => x >= r.x && x < r.x + r.w && floorRow >= r.y && floorRow < r.y + r.h);
      if (!solid && x < L.cols && start < 0) start = x;
      if ((solid || x === L.cols) && start >= 0) { out.push({ x: start, w: x - start }); start = -1; }
    }
    return out;
  }

  private drawStatic(): void {
    if (!this.level) return;
    const u = this.u;
    this.staticLayer.removeChildren().forEach((c) => c.destroy());
    this.fgLayer.removeChildren().forEach((c) => c.destroy());
    const parts = this.partsForDisplay();
    for (const p of parts) {
      if (this.drag?.id === p.id) continue;
      const g = new Graphics();
      const holder = new Container();
      holder.position.set(p.gx * u, p.gy * u);
      holder.addChild(g);
      if (p.kind === "ramp" || p.kind === "rampLong") drawRamp(g, u, FOOTPRINT[p.kind].w, FOOTPRINT[p.kind].h, p.flip);
      else if (p.kind === "chute") drawChute(g, u);
      else if (p.kind === "buffer") drawBuffer(g, u);
      else if (p.kind === "lever") drawFulcrum(g, u);
      else if (p.kind === "barricade") {
        const s = this.sprite("barricade", u * 1.15);
        s.position.set(u, u);
        holder.addChild(s);
      } else if (p.kind === "arch") {
        const s = this.sprite("arch", u * 4.1);
        s.position.set(u * 1.5, u * 4);
        holder.addChild(s);
        // behind the moving parts so the cake trolley stays visible as it rolls through
        this.staticLayer.addChildAt(holder, 0);
        continue;
      } else { holder.destroy({ children: true }); continue; }
      if (p.placed && this.range && !this.inRange(p)) holder.alpha = 0.75;
      this.staticLayer.addChild(holder);
    }
  }

  private partsForDisplay(): Array<{ id: string; kind: Placement["kind"] | MachineLevel["fixed"][number]["kind"]; gx: number; gy: number; flip: boolean; placed: boolean }> {
    return [
      ...this.level.fixed.map((p) => ({ id: p.id, kind: p.kind, gx: p.gx, gy: p.gy, flip: !!p.flip, placed: false })),
      ...this.build.placements.map((p) => ({ ...p, placed: true })),
    ];
  }

  private inRange(p: { gx: number; kind: string }): boolean {
    if (!this.range) return true;
    const w = FOOTPRINT[p.kind as PartKind].w;
    return p.gx >= this.range.from && p.gx + w <= this.range.to;
  }

  /** Persistent display objects for every simulated entity. */
  private rebuildDynamic(): void {
    if (!this.sim) return;
    const u = this.u;
    for (const c of this.sprites.values()) c.destroy({ children: true });
    this.sprites.clear();
    this.dynLayer.removeChildren();
    this.dynLayer.addChild(this.dynG);
    const st = this.sim;
    for (const b of st.bells) {
      const c = new Container();
      const s = this.sprite("bell", u * 2.15);
      s.position.set(0, 0);
      c.addChild(s);
      c.position.set(((b.box.x0 + b.box.x1) / 2 / C) * u, (b.box.y1 / C + 0.25) * u);
      this.dynLayer.addChild(c);
      this.sprites.set(b.id, c);
    }
    for (const ck of st.cakes) {
      const c = new Container();
      c.addChild(this.sprite("cake", u * 1.6));
      c.position.set(((ck.box.x0 + ck.box.x1) / 2 / C) * u, (ck.box.y1 / C) * u);
      this.dynLayer.addChild(c);
      this.sprites.set(ck.id, c);
    }
    for (const l of st.levers) {
      const c = new Container();
      const g = new Graphics();
      drawPlank(g, u);
      c.addChild(g);
      this.dynLayer.addChild(c);
      this.sprites.set(l.id, c);
    }
    for (const b of st.buckets) {
      const c = new Container();
      const g = new Graphics();
      drawBucket(g, u);
      c.addChild(g);
      this.dynLayer.addChild(c);
      this.sprites.set(b.id, c);
    }
    for (const d of st.dominoes) {
      const c = new Container();
      const g = new Graphics();
      drawDomino(g, u);
      c.addChild(g);
      this.dynLayer.addChild(c);
      this.sprites.set(d.id, c);
    }
    for (const t of st.toys) {
      const c = new Container();
      const s = this.sprite("toy", u * 1.05);
      c.addChild(s);
      this.dynLayer.addChild(c);
      this.sprites.set(t.id, c);
    }
    for (const tr of st.trolleys) {
      const c = new Container();
      const body = new Graphics();
      drawCart(body, u);
      const cake = this.sprite("cake", u * 1.05);
      cake.position.set(u * 1.5, -u * 0.98);
      cake.label = "cargo";
      c.addChild(cake, body);
      this.dynLayer.addChild(c);
      this.sprites.set(tr.id, c);
    }
    for (const m of st.marbles) {
      const c = new Container();
      const g = new Graphics();
      c.addChild(g);
      this.dynLayer.addChild(c);
      this.sprites.set(m.id, c);
    }
    this.updateDynamic();
  }

  private updateDynamic(): void {
    const st = this.sim;
    if (!st) return;
    const u = this.u;
    const k = u / C;
    const hidden = this.drag?.id;
    for (const b of st.bells) {
      const c = this.sprites.get(b.id);
      if (!c) continue;
      const sw = b.swing > 0 ? Math.sin(this.time / 40) * (b.swing / 40) * 0.12 : 0;
      c.children[0]!.rotation = sw;
    }
    for (const ck of st.cakes) {
      const c = this.sprites.get(ck.id);
      if (!c) continue;
      if (ck.ruined && c.children.length === 1) {
        c.children[0]!.visible = false;
        const g = new Graphics();
        drawSplat(g, u, 1.3);
        c.addChild(g);
      }
    }
    for (const l of st.levers) {
      const c = this.sprites.get(l.id);
      if (!c) continue;
      const target = Math.atan2(2 * 3072, 2 * (2 * C - C / 8)) * l.tilt;
      const cur = this.leverAngles.get(l.id) ?? target;
      const next = this.running ? cur + (target - cur) * 0.35 : target;
      this.leverAngles.set(l.id, next);
      c.position.set(l.px * k, l.py * k);
      c.rotation = next;
      c.visible = l.id !== hidden;
    }
    for (const b of st.buckets) {
      const c = this.sprites.get(b.id);
      if (!c) continue;
      c.position.set(b.x * k, b.y * k);
      c.visible = b.id !== hidden;
    }
    for (const d of st.dominoes) {
      const c = this.sprites.get(d.id);
      if (!c) continue;
      // pivot on the leading bottom corner so a fallen domino lies on the ground, not in it
      const dir = d.dir || 1;
      const ht = u * 0.14;
      c.position.set(d.bx * k + dir * ht, d.by * k);
      c.children[0]!.position.set(-dir * ht, 0);
      c.rotation = ((d.ang / 10) * Math.PI / 180) * dir;
      c.visible = d.id !== hidden;
    }
    for (const t of st.toys) {
      const c = this.sprites.get(t.id);
      if (!c) continue;
      const bob = t.mode === "walk" ? Math.abs(Math.sin(t.step / 5)) * u * 0.06 : 0;
      c.position.set(t.x * k, t.y * k - bob);
      c.scale.x = t.dir > 0 ? -1 : 1;
      c.rotation = t.mode === "walk" ? Math.sin(t.step / 5) * 0.05 : 0;
      c.visible = t.mode !== "gone" && t.id !== hidden;
    }
    for (const tr of st.trolleys) {
      const c = this.sprites.get(tr.id);
      if (!c) continue;
      c.position.set(tr.x * k, tr.y * k);
      c.rotation = tr.mode === "fell" ? tr.dir * Math.min(0.9, tr.vy / 2048) : 0;
      const cargo = c.children.find((ch) => ch.label === "cargo");
      if (cargo) cargo.visible = tr.cargo;
    }
    for (const m of st.marbles) {
      const c = this.sprites.get(m.id);
      if (!c) continue;
      const g = c.children[0] as Graphics;
      g.clear();
      if (m.mode === "gone") { c.visible = false; continue; }
      c.visible = true;
      if (m.mode === "splat") drawSplat(g, u, 0.6);
      else drawMarble(g, u, m.spin / (C * 0.3));
      c.position.set(m.x * k, m.y * k);
    }
    // canal water animates
    this.waterG.clear();
    const H = this.level.rows * u;
    for (const gap of this.gaps()) drawWater(this.waterG, u, gap.x * u, H - u * 1.4, gap.w * u, u * 1.4, this.time / 600);
  }

  private drawBadges(): void {
    const u = this.u;
    this.badgeLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.level.stamps.forEach((s, i) => {
      const tgt = this.level.fixed.find((f) => f.id === s.target);
      if (!tgt) return;
      const state = this.litStamps[i] ?? "dark";
      const c = new Container();
      const g = new Graphics();
      const r = Math.max(11, u * 0.32);
      const fill = state === "lit" ? PAL.ok : state === "wrong" ? PAL.bad : PAL.paper;
      g.circle(2, 2, r).fill({ color: 0x2a1a0e, alpha: 0.25 });
      g.circle(0, 0, r).fill(fill).stroke({ width: 2.5, color: PAL.ink });
      const t = new Text({ text: String(i + 1), style: { fontFamily: "Georgia, serif", fontSize: Math.round(r * 1.15), fontWeight: "700", fill: state === "dark" ? PAL.ink : 0xffffff } });
      t.anchor.set(0.5);
      t.position.set(0, 1);
      c.addChild(g, t);
      const x = s.kind === "pass" ? (tgt.gx + 1.5) * u : (tgt.gx + 1) * u;
      const y = s.kind === "pass" ? (tgt.gy - 0.2) * u : (tgt.gy - 0.05) * u;
      c.position.set(x, Math.max(r + 2, y));
      this.badgeLayer.addChild(c);
    });
  }

  private drawTray(): void {
    if (!this.level) return;
    const W = this.app.screen.width;
    const H = this.app.screen.height;
    const th = this.layout.tray;
    const y0 = H - th;
    this.trayLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    const bg = new Graphics();
    bg.rect(0, y0 - 6, W, 6).fill({ color: 0x2a1a0e, alpha: 0.15 });
    bg.rect(0, y0, W, th).fill(0x6b4a2e);
    bg.rect(0, y0, W, 4).fill(PAL.woodDark);
    this.trayLayer.addChild(bg);
    const grain = new TilingSprite({ texture: this.tex.paper, width: W, height: th });
    grain.position.set(0, y0);
    grain.alpha = 0.12;
    this.trayLayer.addChild(grain);
    const kinds = TRAY_ORDER.filter((k) => (this.level.inventory[k] ?? 0) > 0);
    const avail = W - this.layout.playReserve - 16;
    const slotW = Math.min(112, Math.floor(avail / Math.max(1, kinds.length)) - 8);
    const slotH = th - 18;
    this.traySlots = [];
    const dropMode = !!this.drag?.id;
    kinds.forEach((kind, i) => {
      const x = 12 + i * (slotW + 8);
      const y = y0 + 10;
      const left = remaining(this.level, this.build.placements, kind);
      const c = new Container();
      c.position.set(x, y);
      const card = new Graphics();
      card.roundRect(3, 3, slotW, slotH, 10).fill({ color: 0x1a0f06, alpha: 0.35 });
      card.roundRect(0, 0, slotW, slotH, 10).fill(PAL.paper).stroke({ width: 2, color: PAL.ink });
      c.addChild(card);
      const icon = new Container();
      const iu = Math.min(slotW / 4.6, (slotH - 26) / 2.2);
      if (kind !== "toy") drawPartAtOrigin(icon, kind, false, iu);
      const ib = icon.getLocalBounds();
      icon.position.set(slotW / 2 - (ib.x + ib.width / 2), (slotH - 22) / 2 - (ib.y + ib.height / 2) + 2);
      c.addChild(icon);
      if (kind === "toy") {
        const s = this.sprite("toy", iu * 1.9);
        s.position.set(slotW / 2, slotH - 24);
        c.addChild(s);
      }
      const name = new Text({ text: PART_NAMES[kind], style: { fontFamily: "Georgia, serif", fontSize: slotW < 80 ? 11 : 13, fill: PAL.ink } });
      name.anchor.set(0.5, 1);
      name.position.set(slotW / 2, slotH - 5);
      if (name.width > slotW - 6) name.scale.set((slotW - 6) / name.width);
      c.addChild(name);
      const badge = new Graphics();
      badge.circle(slotW - 12, 12, 11).fill(left > 0 ? PAL.terracotta : PAL.stoneDark).stroke({ width: 2, color: PAL.ink });
      c.addChild(badge);
      const cnt = new Text({ text: String(left), style: { fontFamily: "Georgia, serif", fontSize: 13, fontWeight: "700", fill: 0xffffff } });
      cnt.anchor.set(0.5);
      cnt.position.set(slotW - 12, 12.5);
      c.addChild(cnt);
      c.alpha = left > 0 && !this.running && this.build.phase === "build" ? 1 : 0.45;
      this.trayLayer.addChild(c);
      this.traySlots.push({ kind, x, y, w: slotW, h: slotH });
    });
    if (dropMode) {
      const over = this.drag?.overTray;
      const g = new Graphics();
      g.roundRect(6, y0 + 4, avail, th - 8, 12).fill({ color: over ? PAL.bad : PAL.ink, alpha: over ? 0.35 : 0.18 }).stroke({ width: 2, color: over ? PAL.bad : PAL.paper, alpha: 0.8 });
      const t = new Text({ text: "Drop here to put it back", style: { fontFamily: "Georgia, serif", fontSize: 16, fontWeight: "700", fill: 0xffffff } });
      t.anchor.set(0.5);
      t.position.set(6 + avail / 2, y0 + th / 2);
      if (t.width > avail - 12) t.scale.set((avail - 12) / t.width);
      this.trayLayer.addChild(g, t);
    }
  }

  /* ---------------- input ---------------- */

  private editable(): boolean {
    return !this.running && this.build.phase === "build";
  }

  private toCell(px: number, py: number, kind: PartKind, touch: boolean): { gx: number; gy: number } {
    const f = FOOTPRINT[kind];
    const wx = (px - this.ox) / this.u;
    const wy = (py - this.oy) / this.u - (touch ? 1.2 : 0);
    return { gx: Math.round(wx - f.w / 2), gy: Math.round(wy - f.h / 2) };
  }

  private hitPart(px: number, py: number): Placement | null {
    const cx = Math.floor((px - this.ox) / this.u);
    const cy = Math.floor((py - this.oy) / this.u);
    for (let i = this.build.placements.length - 1; i >= 0; i--) {
      const p = this.build.placements[i]!;
      const f = FOOTPRINT[p.kind];
      const cells = p.kind === "lever" ? occupiedCells(p.kind, p.gx, p.gy, p.flip) : [];
      const inBox = cx >= p.gx && cx < p.gx + f.w && cy >= p.gy && cy < p.gy + f.h;
      if (inBox || cells.some(([x, y]) => x === cx && y === cy)) return p;
    }
    return null;
  }

  private onDown(e: FederatedPointerEvent): void {
    if (!this.level) return;
    const { x, y } = e.global;
    const touch = e.pointerType === "touch";
    const H = this.app.screen.height;
    if (y >= H - this.layout.tray) {
      if (!this.editable()) return;
      const slot = this.traySlots.find((s) => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
      if (!slot) return;
      if (remaining(this.level, this.build.placements, slot.kind) <= 0) { this.cb.onHint("None of those left — drag one off the scene to reuse it."); return; }
      this.drag = { kind: slot.kind, flip: false, startX: x, startY: y, moved: true, touch, gx: 0, gy: 0, valid: false, overTray: true };
      sfx.pop();
      this.updateGhost(x, y);
      return;
    }
    if (this.editable()) {
      const p = this.hitPart(x, y);
      if (p) {
        if (this.range && !this.inRange(p)) { this.cb.onHint("That part belongs to your partner's stretch."); return; }
        this.drag = { kind: p.kind, flip: p.flip, id: p.id, startX: x, startY: y, moved: false, touch, gx: p.gx, gy: p.gy, valid: true, overTray: false };
        return;
      }
    }
    if (this.pannable) this.pan = { x, cam: this.camX };
  }

  private onMove(e: FederatedPointerEvent): void {
    const { x, y } = e.global;
    if (this.pan) {
      this.camX = this.pan.cam - (x - this.pan.x);
      this.clampCam();
      return;
    }
    const d = this.drag;
    if (!d) return;
    if (!d.moved && Math.hypot(x - d.startX, y - d.startY) > 8) {
      d.moved = true;
      this.drawStatic();
      this.updateDynamic();
      this.drawTray();
    }
    if (d.moved) this.updateGhost(x, y);
  }

  private onUp(e: FederatedPointerEvent): void {
    if (this.pan) { this.pan = null; return; }
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    this.ghostLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    const { x, y } = e.global;
    if (d.id && !d.moved) {
      const p = this.build.placements.find((v) => v.id === d.id)!;
      const ok = canPlace(this.level, this.build.placements, p.kind, p.gx, p.gy, !p.flip, p.id, this.range);
      if (ok.ok) { sfx.clack(); this.cb.onCommand({ type: "flip", id: d.id }); }
      else this.cb.onHint(`Can't flip it here: ${ok.reason.toLowerCase()}`);
    } else {
      this.updateGhost(x, y, true);
      if (d.overTray) {
        if (d.id) { sfx.pop(); this.cb.onCommand({ type: "remove", id: d.id }); }
      } else if (d.valid) {
        sfx.clack();
        if (d.id) this.cb.onCommand({ type: "move", id: d.id, gx: d.gx, gy: d.gy });
        else this.cb.onCommand({ type: "place", kind: d.kind, gx: d.gx, gy: d.gy, flip: d.flip });
      } else {
        const r = canPlace(this.level, this.build.placements, d.kind, d.gx, d.gy, d.flip, d.id, this.range);
        if (!r.ok) this.cb.onHint(r.reason);
      }
    }
    this.drawStatic();
    this.updateDynamic();
    this.drawTray();
  }

  private updateGhost(x: number, y: number, silent = false): void {
    const d = this.drag;
    if (!d) return;
    const H = this.app.screen.height;
    d.overTray = y >= H - this.layout.tray;
    const { gx, gy } = this.toCell(x, y, d.kind, d.touch);
    const changed = gx !== d.gx || gy !== d.gy;
    d.gx = gx;
    d.gy = gy;
    d.valid = !d.overTray && canPlace(this.level, this.build.placements, d.kind, gx, gy, d.flip, d.id, this.range).ok;
    if (silent) return;
    if (changed && d.valid && !d.overTray) sfx.roll();
    this.ghostLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    const u = this.u;
    const f = FOOTPRINT[d.kind];
    const c = new Container();
    if (d.overTray) {
      // ghost floats under the pointer while hovering the tray
      c.position.set(x - this.ox - (f.w * u) / 2, y - this.oy - (f.h * u) / 2);
      c.alpha = 0.6;
    } else {
      c.position.set(gx * u, gy * u);
      const tint = new Graphics();
      for (const [cx, cy] of occupiedCells(d.kind, 0, 0, d.flip)) tint.rect(cx * u + 1, cy * u + 1, u - 2, u - 2);
      tint.fill({ color: d.valid ? PAL.ok : PAL.bad, alpha: 0.28 }).stroke({ width: 2, color: d.valid ? PAL.ok : PAL.bad, alpha: 0.9 });
      c.addChild(tint);
    }
    const g = new Container();
    drawPartAtOrigin(g, d.kind, d.flip, u);
    c.addChild(g);
    if (d.kind === "toy") {
      const s = this.sprite("toy", u * 1.05);
      s.position.set(u / 2, u);
      if (!d.flip) s.scale.x *= -1;
      c.addChild(s);
    }
    if (!d.overTray) g.alpha = d.valid ? 0.95 : 0.55;
    this.ghostLayer.addChild(c);
    if (d.id || d.overTray !== this.lastOverTray) { this.lastOverTray = d.overTray; this.drawTray(); }
  }
  private lastOverTray = false;

  /* ---------------- playback ---------------- */

  private frame(dtMs: number): void {
    if (!this.level || !this.sim) return;
    this.time += dtMs;
    if (this.running && !this.finished) {
      this.acc += Math.min(100, dtMs) * this.speed;
      let steps = 0;
      while (this.acc >= 1000 / 60 && steps < 12 && !this.sim.done) {
        stepSim(this.world, this.sim);
        this.acc -= 1000 / 60;
        steps++;
      }
      this.consumeEvents();
      if (this.sim.done) {
        this.finished = true;
        const v = verdictOf(this.world, this.sim);
        if (v.success) sfx.win(); else sfx.lose();
        this.cb.onRunEnd(v);
      }
      this.follow();
    }
    this.updateDynamic();
    this.updateParticles(dtMs);
  }

  private follow(): void {
    if (!this.pannable || this.pan) return;
    const st = this.sim;
    let fx: number | null = null;
    const tr = st.trolleys.find((t) => t.mode === "roll" || t.mode === "fell");
    if (tr) fx = tr.x + tr.w / 2;
    else {
      const m = st.marbles.find((v) => (v.mode === "air" || v.mode === "roll") && v.still < 30);
      if (m) fx = m.x;
      else {
        const d = st.dominoes.find((v) => v.state === "falling");
        if (d) fx = d.bx;
        else {
          const t = st.toys.find((v) => v.mode === "walk");
          if (t) fx = t.x;
        }
      }
    }
    if (fx === null) return;
    const target = (fx / C) * this.u - this.app.screen.width / 2;
    this.camX += (target - this.camX) * 0.08;
    this.clampCam();
  }

  private consumeEvents(): void {
    const evs = this.sim.events;
    for (; this.eventCursor < evs.length; this.eventCursor++) this.onEvent(evs[this.eventCursor]!);
  }

  private onEvent(e: SimEvent): void {
    const k = this.u / C;
    const x = e.x * k;
    const y = e.y * k;
    switch (e.type) {
      case "ring": sfx.ring(); this.ringFx(x, y); break;
      case "stamp":
      case "stampWrongOrder": {
        const i = this.level.stamps.findIndex((s) => s.id === e.id);
        const ok = e.type === "stamp";
        this.litStamps[i] = ok ? "lit" : "wrong";
        this.drawBadges();
        if (ok) sfx.stamp(); else sfx.wrong();
        this.stampFx(x, y, this.level.stamps[i]!.label, ok);
        this.cb.onStamp(i, ok);
        break;
      }
      case "topple": sfx.clack(); break;
      case "tip": sfx.tip(); this.dust(x, y, 4); break;
      case "catch": sfx.thud(); break;
      case "launch": sfx.pop(); break;
      case "release": sfx.tip(); break;
      case "crash": sfx.splat(); this.dust(x, y, 10); break;
      case "fall": sfx.lose(); break;
      case "safe": sfx.thud(); break;
      case "splat": sfx.splat(); this.splatFx(x, y); break;
      case "bounce": sfx.clack(); this.dust(x, y, 2); break;
      case "plop": sfx.plop(); this.splashFx(x, y); break;
      case "push": sfx.clack(); break;
      default: break;
    }
  }

  private ringFx(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      const g = new Graphics();
      g.arc(0, 0, this.u * (0.6 + i * 0.35), -Math.PI * 0.85, -Math.PI * 0.15).stroke({ width: 3, color: PAL.brass });
      g.position.set(x, y + this.u * 0.6);
      this.fxLayer.addChild(g);
      this.particles.push({ g, life: 0, max: 700 + i * 120, vx: 0, vy: 0, spin: 0 });
    }
  }

  private stampFx(x: number, y: number, label: string, ok: boolean): void {
    const c = new Container();
    const t = new Text({ text: ok ? label : `${label} — TOO EARLY`, style: { fontFamily: "Georgia, serif", fontSize: Math.max(14, Math.round(this.u * 0.42)), fontWeight: "700", fill: ok ? PAL.ok : PAL.bad, letterSpacing: 1 } });
    t.anchor.set(0.5);
    const pad = 10;
    const g = new Graphics();
    g.roundRect(-t.width / 2 - pad, -t.height / 2 - pad / 2, t.width + pad * 2, t.height + pad, 6).fill({ color: PAL.paper, alpha: 0.95 }).stroke({ width: 3, color: ok ? PAL.ok : PAL.bad });
    c.addChild(g, t);
    const half = t.width / 2 + pad + 6;
    const minX = -this.ox + half + 4;
    const maxX = Math.min(this.level.cols * this.u, this.app.screen.width - this.ox) - half - 4;
    c.position.set(Math.max(minX, Math.min(maxX, x)), Math.max(t.height, y - this.u * 1.2));
    c.rotation = -0.06;
    this.fxLayer.addChild(c);
    this.particles.push({ g: c as unknown as Graphics, life: 0, max: 1800, vx: 0, vy: 0, spin: -1 });
  }

  private dust(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const g = new Graphics();
      g.circle(0, 0, this.u * (0.06 + ((i * 37) % 10) / 120)).fill({ color: PAL.paperDark, alpha: 0.9 });
      g.position.set(x, y);
      this.fxLayer.addChild(g);
      const a = (i / n) * Math.PI - Math.PI;
      this.particles.push({ g, life: 0, max: 450, vx: Math.cos(a) * 0.05 * this.u, vy: Math.sin(a) * 0.05 * this.u, spin: 0 });
    }
  }

  private splatFx(x: number, y: number): void {
    for (let i = 0; i < 12; i++) {
      const g = new Graphics();
      g.circle(0, 0, this.u * (0.08 + (i % 3) * 0.04)).fill(i % 3 === 0 ? PAL.red : 0xfbf4e6).stroke({ width: 1, color: PAL.ink, alpha: 0.5 });
      g.position.set(x, y);
      this.fxLayer.addChild(g);
      const a = (i / 12) * Math.PI * 2;
      this.particles.push({ g, life: 0, max: 700, vx: Math.cos(a) * 0.09 * this.u, vy: Math.sin(a) * 0.09 * this.u - 0.05 * this.u, spin: 0.002 });
    }
  }

  private splashFx(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const g = new Graphics();
      g.circle(0, 0, this.u * 0.08).fill(PAL.waterLight);
      g.position.set(x, y - this.u * 1.2);
      this.fxLayer.addChild(g);
      this.particles.push({ g, life: 0, max: 600, vx: (i - 3.5) * 0.02 * this.u, vy: -0.12 * this.u, spin: 0.003 });
    }
  }

  private updateParticles(dt: number): void {
    const f = dt / 16.7;
    this.particles = this.particles.filter((p) => {
      p.life += dt;
      const tt = p.life / p.max;
      if (p.spin === -1) {
        const s = tt < 0.12 ? 1.6 - (tt / 0.12) * 0.6 : 1;
        p.g.scale.set(s);
        p.g.alpha = tt > 0.75 ? 1 - (tt - 0.75) / 0.25 : 1;
      } else {
        p.g.x += p.vx * f;
        p.g.y += p.vy * f;
        p.vy += p.spin * this.u * f;
        p.g.alpha = 1 - tt;
        if (p.vx === 0 && p.vy === 0) p.g.scale.set(1 + tt * 0.6);
      }
      if (tt >= 1) { p.g.destroy({ children: true }); return false; }
      return true;
    });
  }
}

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}

/** Flatbed cake cart; origin = bottom-left of the trolley footprint. */
function drawCart(g: Graphics, u: number): void {
  const w = 3 * u;
  g.roundRect(u * 0.1, -u * 1.0 + u * 0.08, w - u * 0.2, u * 0.55, u * 0.08).fill({ color: 0x2a1a0e, alpha: 0.18 });
  g.roundRect(u * 0.05, -u * 1.02, w - u * 0.1, u * 0.18, u * 0.05).fill(PAL.brass).stroke({ width: Math.max(1.5, u * 0.045), color: PAL.ink });
  g.roundRect(u * 0.15, -u * 0.86, w - u * 0.3, u * 0.5, u * 0.08).fill(PAL.red).stroke({ width: Math.max(1.5, u * 0.045), color: PAL.ink });
  g.rect(u * 0.3, -u * 0.76, w - u * 0.6, u * 0.06).fill(PAL.brass);
  for (const wx of [u * 0.6, w - u * 0.6]) {
    g.circle(wx, -u * 0.24, u * 0.24).fill(0x2b2420).stroke({ width: Math.max(1.5, u * 0.045), color: PAL.ink });
    g.circle(wx, -u * 0.24, u * 0.09).fill(PAL.brass);
  }
}

function drawSplat(g: Graphics, u: number, size: number): void {
  const r = u * 0.35 * size;
  g.ellipse(0, -r * 0.25, r * 1.4, r * 0.45).fill(0xfbf4e6).stroke({ width: 1.5, color: PAL.ink });
  g.circle(-r * 0.6, -r * 0.35, r * 0.18).fill(PAL.red);
  g.circle(r * 0.5, -r * 0.3, r * 0.14).fill(PAL.red);
  g.circle(r * 0.05, -r * 0.55, r * 0.22).fill(0xfbf4e6).stroke({ width: 1, color: PAL.ink });
}

/** Draw a placeable part at its footprint origin (used for ghost + tray). */
function drawPartAtOrigin(c: Container, kind: PartKind, flip: boolean, u: number): void {
  const f = FOOTPRINT[kind];
  const g = new Graphics();
  c.addChild(g);
  if (kind === "ramp" || kind === "rampLong") drawRamp(g, u, f.w, f.h, flip);
  else if (kind === "domino") { drawDomino(g, u); g.position.set(u / 2, 2 * u); }
  else if (kind === "lever") {
    drawFulcrum(g, u);
    const p = new Graphics();
    drawPlank(p, u);
    p.position.set(2 * u, u / 2);
    p.rotation = Math.atan2(6144, 30720) * (flip ? 1 : -1);
    c.addChild(p);
  } else if (kind === "bucket") { drawBucket(g, u); g.position.set(u / 2, u); }
}

export { leverEnds };
