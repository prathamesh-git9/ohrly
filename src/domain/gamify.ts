/** Pure rules for hearts, streaks and XP, kept free of React and storage so they can be tested. */

export const MAX_HEARTS = 5;
export const HEART_REGEN_MS = 30 * 60 * 1000;
export const STREAK_FREEZE_COST = 200;
export const HEART_REFILL_COST = 100;
export const MAX_FREEZES = 2;

export function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** Whole calendar days from a to b. Noon on both sides makes it immune to daylight saving. */
export function daysBetween(a: string, b: string): number {
  const parse = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y!, m! - 1, d!, 12).getTime();
  };
  return Math.round((parse(b) - parse(a)) / 86_400_000);
}

export interface StreakState {
  count: number;
  best: number;
  /** The last day a lesson was completed. */
  lastDay: string | null;
  freezes: number;
}

export interface StreakOutcome {
  next: StreakState;
  extended: boolean;
  freezesUsed: number;
  lost: boolean;
}

/** Called when a lesson finishes. Only the first lesson of a day extends the streak. */
export function recordActivity(state: StreakState, today: string): StreakOutcome {
  if (state.lastDay === today) {
    return { next: state, extended: false, freezesUsed: 0, lost: false };
  }
  if (state.lastDay === null) {
    return {
      next: { ...state, count: 1, best: Math.max(state.best, 1), lastDay: today },
      extended: true,
      freezesUsed: 0,
      lost: false,
    };
  }
  const gap = daysBetween(state.lastDay, today);
  if (gap <= 0) {
    // The device clock went backwards. Never punish the learner for that.
    return { next: state, extended: false, freezesUsed: 0, lost: false };
  }
  const missed = gap - 1;
  if (missed <= state.freezes) {
    const count = state.count + 1;
    return {
      next: {
        ...state,
        count,
        best: Math.max(state.best, count),
        lastDay: today,
        freezes: state.freezes - missed,
      },
      extended: true,
      freezesUsed: missed,
      lost: false,
    };
  }
  return {
    next: { ...state, count: 1, best: Math.max(state.best, 1), lastDay: today },
    extended: true,
    freezesUsed: 0,
    lost: state.count > 1,
  };
}

/** The streak as it should read right now, before any activity today. */
export function displayedStreak(state: StreakState, today: string): number {
  if (state.lastDay === null) return 0;
  const gap = daysBetween(state.lastDay, today);
  return gap - 1 <= state.freezes ? state.count : 0;
}

/** Streak lengths worth a celebration, and the sparks each one pays. */
export const STREAK_MILESTONES: ReadonlyMap<number, number> = new Map([
  [3, 20],
  [7, 50],
  [14, 75],
  [30, 150],
  [50, 200],
  [100, 500],
  [150, 300],
  [200, 400],
  [365, 1000],
  [500, 750],
  [1000, 2000],
]);

/** The sparks a streak of this length earns on the day it is reached, or 0 if it is not a milestone. */
export function milestoneSparks(count: number): number {
  return STREAK_MILESTONES.get(count) ?? 0;
}

/** The next milestone above this streak, if any. */
export function nextMilestone(count: number): number | null {
  for (const m of STREAK_MILESTONES.keys()) if (m > count) return m;
  return null;
}

export type StreakNudge =
  | { kind: 'done' }
  /** No streak to protect: invite the learner to start one. */
  | { kind: 'start' }
  /** A streak is alive and today is not done yet. `late` from 18:00, when it is more urgent. */
  | { kind: 'keep'; count: number; late: boolean; covered: boolean };

/**
 * What the path should say about the streak right now. `covered` means a rest day would save the
 * streak if today is missed, so the message can be gentler.
 */
export function streakNudge(state: StreakState, now: Date): StreakNudge {
  const today = dayKey(now);
  if (state.lastDay === today) return { kind: 'done' };
  const count = displayedStreak(state, today);
  if (count === 0) return { kind: 'start' };
  const missedSoFar = daysBetween(state.lastDay!, today) - 1;
  return { kind: 'keep', count, late: now.getHours() >= 18, covered: state.freezes - missedSoFar > 0 };
}

export interface HeartState {
  count: number;
  /** When the next heart started regenerating. Null while full. */
  regenFrom: number | null;
}

export function settleHearts(state: HeartState, now: number): HeartState {
  if (state.count >= MAX_HEARTS || state.regenFrom === null) {
    return state.count >= MAX_HEARTS ? { count: MAX_HEARTS, regenFrom: null } : state;
  }
  const earned = Math.floor((now - state.regenFrom) / HEART_REGEN_MS);
  if (earned <= 0) return state;
  const count = Math.min(MAX_HEARTS, state.count + earned);
  return {
    count,
    regenFrom: count >= MAX_HEARTS ? null : state.regenFrom + earned * HEART_REGEN_MS,
  };
}

export function loseHeart(state: HeartState, now: number): HeartState {
  const settled = settleHearts(state, now);
  return {
    count: Math.max(0, settled.count - 1),
    regenFrom: settled.regenFrom ?? now,
  };
}

export function gainHeart(state: HeartState, now: number): HeartState {
  const settled = settleHearts(state, now);
  const count = Math.min(MAX_HEARTS, settled.count + 1);
  return { count, regenFrom: count >= MAX_HEARTS ? null : settled.regenFrom };
}

export function msUntilNextHeart(state: HeartState, now: number): number | null {
  const settled = settleHearts(state, now);
  if (settled.regenFrom === null) return null;
  return settled.regenFrom + HEART_REGEN_MS - now;
}

export interface LessonResult {
  total: number;
  mistakes: number;
  seconds: number;
  isCheckpoint: boolean;
  isReplay: boolean;
}

export interface Rewards {
  xp: number;
  gems: number;
  accuracy: number;
  perfect: boolean;
}

export function computeRewards(r: LessonResult): Rewards {
  const attempts = r.total + r.mistakes;
  const accuracy = attempts === 0 ? 1 : r.total / attempts;
  const perfect = r.mistakes === 0;
  const base = r.isCheckpoint ? 30 : r.isReplay ? 5 : 10;
  const bonus = perfect ? 5 : 0;
  const gems = r.isReplay ? 2 : r.isCheckpoint ? 50 : perfect ? 15 : 10;
  return { xp: base + bonus, gems, accuracy, perfect };
}
