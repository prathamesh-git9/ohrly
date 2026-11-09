/**
 * Every sound effect is synthesized here with Web Audio, so nothing is copied from anywhere and
 * there are no files to download. A context can only start after a user gesture, which is fine
 * because every sound here responds to one.
 */
let ctx: AudioContext | null = null;
let enabled = true;

export function setSfxEnabled(on: boolean): void {
  enabled = on;
}

function audio(): AudioContext | null {
  if (!enabled || typeof window === 'undefined' || !('AudioContext' in window)) return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

interface Note {
  freq: number;
  at: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  glideTo?: number;
}

function play(notes: Note[]): void {
  const ac = audio();
  if (!ac) return;
  const master = ac.createGain();
  master.gain.value = 0.5;
  master.connect(ac.destination);
  const now = ac.currentTime + 0.005;
  for (const n of notes) {
    const osc = ac.createOscillator();
    const env = ac.createGain();
    osc.type = n.type ?? 'triangle';
    osc.frequency.setValueAtTime(n.freq, now + n.at);
    if (n.glideTo) osc.frequency.exponentialRampToValueAtTime(n.glideTo, now + n.at + n.dur);
    const peak = n.gain ?? 0.35;
    env.gain.setValueAtTime(0.0001, now + n.at);
    env.gain.exponentialRampToValueAtTime(peak, now + n.at + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, now + n.at + n.dur);
    osc.connect(env).connect(master);
    osc.start(now + n.at);
    osc.stop(now + n.at + n.dur + 0.02);
  }
}

// Scale of D major pentatonic: bright and friendly, and it cannot sound dissonant.
const D5 = 587.33;
const E5 = 659.25;
const FS5 = 739.99;
const A5 = 880;
const B5 = 987.77;
const D6 = 1174.66;

export const sfx = {
  tap: () => play([{ freq: 520, glideTo: 380, at: 0, dur: 0.05, type: 'sine', gain: 0.18 }]),
  place: () => play([{ freq: 440, glideTo: 620, at: 0, dur: 0.07, type: 'sine', gain: 0.2 }]),
  remove: () => play([{ freq: 620, glideTo: 400, at: 0, dur: 0.07, type: 'sine', gain: 0.16 }]),
  correct: () =>
    play([
      { freq: FS5, at: 0, dur: 0.12 },
      { freq: A5, at: 0.09, dur: 0.14 },
      { freq: D6, at: 0.18, dur: 0.26 },
      { freq: D5, at: 0.18, dur: 0.26, type: 'sine', gain: 0.18 },
    ]),
  wrong: () =>
    play([
      { freq: 196, glideTo: 150, at: 0, dur: 0.16, type: 'sawtooth', gain: 0.1 },
      { freq: 147, glideTo: 110, at: 0.12, dur: 0.24, type: 'triangle', gain: 0.3 },
    ]),
  match: () =>
    play([
      { freq: A5, at: 0, dur: 0.08, gain: 0.25 },
      { freq: D6, at: 0.06, dur: 0.12, gain: 0.25 },
    ]),
  complete: () =>
    play([
      { freq: D5, at: 0, dur: 0.14 },
      { freq: FS5, at: 0.12, dur: 0.14 },
      { freq: A5, at: 0.24, dur: 0.14 },
      { freq: B5, at: 0.36, dur: 0.14 },
      { freq: D6, at: 0.48, dur: 0.5 },
      { freq: A5, at: 0.48, dur: 0.5, gain: 0.2 },
      { freq: FS5, at: 0.48, dur: 0.5, gain: 0.2 },
      { freq: E5 * 2, at: 0.72, dur: 0.3, type: 'sine', gain: 0.12 },
    ]),
  streak: () =>
    play([
      { freq: A5, glideTo: D6 * 1.5, at: 0, dur: 0.4, type: 'sine', gain: 0.25 },
      { freq: D6, at: 0.3, dur: 0.3, gain: 0.25 },
    ]),
};

export function buzz(pattern: number | number[]): void {
  if (!enabled) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Vibration is decorative; unsupported or blocked is fine.
  }
}
