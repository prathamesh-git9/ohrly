/**
 * Every sound effect is synthesized here with Web Audio, so nothing is copied from anywhere and
 * there are no files to download. A context can only start after a user gesture, which is fine
 * because every sound here responds to one.
 *
 * The "correct" chime is built like a small bell: each note sums inharmonic partials (the ratios a
 * struck metal bar rings at) that die away at different rates, which is what makes it ring rather
 * than beep.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;

export function setSfxEnabled(on: boolean): void {
  enabled = on;
}

function audio(): { ac: AudioContext; out: GainNode } | null {
  if (!enabled || typeof window === 'undefined' || !('AudioContext' in window)) return null;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.55;
    // A touch of compression keeps stacked notes from clipping on phone speakers.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return { ac: ctx, out: master! };
}

/** One bell strike: partials at bell-like ratios, upper ones fading faster. */
function bell(ac: AudioContext, out: AudioNode, freq: number, at: number, length: number, volume: number) {
  const partials: [ratio: number, gain: number, decay: number][] = [
    [1, 1, 1],
    [2, 0.42, 0.62],
    [2.76, 0.32, 0.42],
    [4.07, 0.16, 0.28],
    [5.4, 0.08, 0.18],
  ];
  const t0 = ac.currentTime + at;
  for (const [ratio, gain, decay] of partials) {
    const osc = ac.createOscillator();
    const env = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * ratio, t0);
    const peak = volume * gain;
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(peak, t0 + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + length * decay);
    osc.connect(env).connect(out);
    osc.start(t0);
    osc.stop(t0 + length * decay + 0.05);
  }
}

/** A short pitched blip, for taps and soft feedback. */
function blip(
  ac: AudioContext,
  out: AudioNode,
  from: number,
  to: number,
  at: number,
  length: number,
  volume: number,
  type: OscillatorType = 'sine',
) {
  const t0 = ac.currentTime + at;
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(to, t0 + length);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(volume, t0 + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + length);
  osc.connect(env).connect(out);
  osc.start(t0);
  osc.stop(t0 + length + 0.02);
}

/** A soft wooden click: a very short burst of filtered noise. */
function click(ac: AudioContext, out: AudioNode, volume: number, tone = 2400) {
  const t0 = ac.currentTime;
  const length = 0.035;
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * length), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = tone;
  filter.Q.value = 1.4;
  const env = ac.createGain();
  env.gain.value = volume;
  src.connect(filter).connect(env).connect(out);
  src.start(t0);
}

// Notes in E major: bright and cheerful.
const E6 = 1318.51;
const GS6 = 1661.22;
const B6 = 1975.53;
const E7 = 2637.02;
const B5 = 987.77;
const GS5 = 830.61;
const E5 = 659.25;

function play(fn: (ac: AudioContext, out: GainNode) => void) {
  const a = audio();
  if (a) fn(a.ac, a.out);
}

export const sfx = {
  /** Any button or option press. */
  tap: () => play((ac, out) => click(ac, out, 0.5)),
  /** A word tile flying into the answer. */
  place: () =>
    play((ac, out) => {
      click(ac, out, 0.35, 3000);
      blip(ac, out, 900, 1300, 0, 0.06, 0.12);
    }),
  /** A word tile going back to the bank. */
  remove: () =>
    play((ac, out) => {
      click(ac, out, 0.3, 1800);
      blip(ac, out, 1100, 700, 0, 0.06, 0.1);
    }),
  /** The right answer: two quick rising bell strikes, ding-ding. */
  correct: () =>
    play((ac, out) => {
      bell(ac, out, E6, 0, 0.9, 0.32);
      bell(ac, out, GS6, 0.09, 1.3, 0.36);
    }),
  /** Not quite: a soft low double thud, kind rather than harsh. */
  wrong: () =>
    play((ac, out) => {
      blip(ac, out, 330, 220, 0, 0.16, 0.32, 'triangle');
      blip(ac, out, 260, 165, 0.14, 0.24, 0.3, 'triangle');
    }),
  /** A pair matched. */
  match: () =>
    play((ac, out) => {
      bell(ac, out, B6, 0, 0.6, 0.22);
    }),
  /** Lesson complete: a rising bell arpeggio with a shimmer on top. */
  complete: () =>
    play((ac, out) => {
      [E5, GS5, B5, E6].forEach((f, i) => bell(ac, out, f, i * 0.11, 1.1, 0.28));
      bell(ac, out, GS6, 0.46, 1.6, 0.3);
      bell(ac, out, B6, 0.46, 1.6, 0.2);
      bell(ac, out, E7, 0.62, 1.8, 0.14);
    }),
  /** Streak and combo moments. */
  streak: () =>
    play((ac, out) => {
      blip(ac, out, 600, 1800, 0, 0.32, 0.16);
      bell(ac, out, B6, 0.26, 1.2, 0.26);
      bell(ac, out, E7, 0.36, 1.2, 0.16);
    }),
};

export function buzz(pattern: number | number[]): void {
  if (!enabled) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Vibration is decorative; unsupported or blocked is fine.
  }
}
