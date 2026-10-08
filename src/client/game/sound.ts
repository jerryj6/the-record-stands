/** Tiny procedural sound kit (WebAudio, no assets). */
let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(m: boolean): void { muted = m; }
export function isMuted(): boolean { return muted; }

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0): void {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise(dur: number, gain: number, freq: number): void {
  const a = ac();
  if (!a) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(a.destination);
  src.start();
}

export const sfx = {
  ring(): void { tone(880, 1.2, "sine", 0.25); tone(1320, 0.9, "sine", 0.12); tone(2210, 0.5, "sine", 0.05); },
  clack(): void { noise(0.06, 0.5, 2200); },
  thud(): void { tone(110, 0.18, "triangle", 0.3); noise(0.08, 0.25, 400); },
  tip(): void { tone(330, 0.12, "square", 0.06); noise(0.05, 0.3, 1200); },
  pop(): void { tone(660, 0.08, "triangle", 0.15); },
  stamp(): void { noise(0.09, 0.7, 700); tone(180, 0.15, "triangle", 0.25); },
  wrong(): void { tone(220, 0.25, "sawtooth", 0.08); tone(207, 0.35, "sawtooth", 0.08, 0.12); },
  splat(): void { noise(0.25, 0.6, 500); tone(90, 0.3, "triangle", 0.2); },
  plop(): void { tone(520, 0.12, "sine", 0.18); tone(260, 0.2, "sine", 0.12, 0.05); },
  win(): void { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.5, "triangle", 0.16, i * 0.11)); },
  lose(): void { tone(196, 0.5, "triangle", 0.15); tone(165, 0.7, "triangle", 0.15, 0.18); },
  roll(): void { noise(0.04, 0.12, 900); },
};
