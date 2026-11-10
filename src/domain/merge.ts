import type { Card } from './srs';

/**
 * Combining progress from two devices without losing any of it. Every rule keeps the better of the
 * two, so syncing can only ever add progress, never take it away.
 */
export interface SyncedCourse {
  done: Record<string, { best: number; count: number }>;
  cards: Record<string, Card>;
  examBest?: Record<string, number>;
}

export interface SyncedState {
  courseId: string | null;
  dailyGoal: number;
  xp: number;
  xpByDay: Record<string, number>;
  gems: number;
  perfectLessons: number;
  streak: { count: number; best: number; lastDay: string | null; freezes: number };
  courses: Record<string, SyncedCourse>;
  seenAchievements?: string[];
}

function mergeRecord<T>(a: Record<string, T> = {}, b: Record<string, T> = {}, pick: (x: T, y: T) => T) {
  const out: Record<string, T> = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = k in out ? pick(out[k]!, v) : v;
  return out;
}

/** The card reviewed most recently is the truth about that word. */
function newerCard(a: Card, b: Card): Card {
  const at = a.due - a.i * 86_400_000;
  const bt = b.due - b.i * 86_400_000;
  if (at === bt) return a.reps >= b.reps ? a : b;
  return at > bt ? a : b;
}

function laterDay(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

export function mergeState(local: SyncedState, remote: SyncedState): SyncedState {
  const courses = mergeRecord(local.courses, remote.courses, (a, b) => ({
    done: mergeRecord(a.done, b.done, (x, y) => ({ best: Math.max(x.best, y.best), count: Math.max(x.count, y.count) })),
    cards: mergeRecord(a.cards, b.cards, newerCard),
    examBest: mergeRecord(a.examBest, b.examBest, Math.max),
  }));
  const xpByDay = mergeRecord(local.xpByDay, remote.xpByDay, Math.max);
  // The streak belongs to whichever device practised most recently; the best ever is kept either way.
  const streakSource = laterDay(local.streak.lastDay, remote.streak.lastDay) === local.streak.lastDay
    ? local.streak
    : remote.streak;
  return {
    courseId: local.courseId ?? remote.courseId,
    dailyGoal: local.dailyGoal,
    xp: Math.max(local.xp, remote.xp, Object.values(xpByDay).reduce((n, v) => n + v, 0)),
    xpByDay,
    gems: Math.max(local.gems, remote.gems),
    perfectLessons: Math.max(local.perfectLessons, remote.perfectLessons),
    streak: {
      ...streakSource,
      best: Math.max(local.streak.best, remote.streak.best),
      freezes: Math.max(local.streak.freezes, remote.streak.freezes),
    },
    courses,
    seenAchievements: [...new Set([...(local.seenAchievements ?? []), ...(remote.seenAchievements ?? [])])],
  };
}
