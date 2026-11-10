import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, progressTowards, unlocked, type AchievementInput } from '../../src/domain/achievements';
import { cefrPosition } from '../../src/domain/levels';
import { mergeState, type SyncedState } from '../../src/domain/merge';

const zero: AchievementInput = {
  xp: 0, bestStreak: 0, perfectLessons: 0, wordsMet: 0, lessonsDone: 0, checkpointsPassed: 0, examsPassed: 0, coursesStarted: 0,
};

describe('achievements', () => {
  it('has unique ids', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
  it('unlocks nothing at the start', () => {
    expect(unlocked(zero).size).toBe(0);
  });
  it('unlocks each rung exactly at its goal', () => {
    const got = unlocked({ ...zero, bestStreak: 7, lessonsDone: 1 });
    expect(got.has('streak-3')).toBe(true);
    expect(got.has('streak-7')).toBe(true);
    expect(got.has('streak-30')).toBe(false);
    expect(got.has('lessons-1')).toBe(true);
  });
  it('reports partial progress', () => {
    const a = ACHIEVEMENTS.find((x) => x.id === 'streak-30')!;
    expect(progressTowards(a, { ...zero, bestStreak: 15 })).toBeCloseTo(0.5);
    expect(progressTowards(a, { ...zero, bestStreak: 99 })).toBe(1);
  });
});

describe('CEFR position', () => {
  const statuses = (p: number[]) =>
    ['A1', 'A2', 'B1', 'B2'].map((level, i) => ({
      level, available: true, total: 10, done: 0, progress: p[i] ?? 0, complete: (p[i] ?? 0) >= 1, targetMet: false,
    })) as Parameters<typeof cefrPosition>[0];
  it('is zero for a beginner and counts whole levels plus the part done', () => {
    expect(cefrPosition(statuses([0, 0, 0, 0]))).toBe(0);
    expect(cefrPosition(statuses([1, 0.5, 0, 0]))).toBeCloseTo(1.5);
  });
  it('does not count progress in a later level while an earlier one is unfinished', () => {
    expect(cefrPosition(statuses([0.5, 0.9, 0, 0]))).toBeCloseTo(0.5);
  });
});

const base: SyncedState = {
  courseId: 'en-de',
  dailyGoal: 20,
  xp: 0,
  xpByDay: {},
  gems: 100,
  perfectLessons: 0,
  streak: { count: 0, best: 0, lastDay: null, freezes: 0 },
  courses: {},
};
const card = (due: number, i: number, reps: number) => ({ n: 1, i, ef: 2.5, due, reps, lapses: 0 });

describe('mergeState', () => {
  it('keeps lessons done on either device', () => {
    const a = { ...base, courses: { 'en-de': { done: { 'u01:0': { best: 1, count: 1 } }, cards: {} } } };
    const b = { ...base, courses: { 'en-de': { done: { 'u01:1': { best: 0.8, count: 2 } }, cards: {} } } };
    const m = mergeState(a, b);
    expect(Object.keys(m.courses['en-de']!.done).sort()).toEqual(['u01:0', 'u01:1']);
  });
  it('keeps the best score and the most recently reviewed card', () => {
    const day = 86_400_000;
    const a = { ...base, courses: { x: { done: { n: { best: 0.6, count: 1 } }, cards: { w: card(10 * day, 1, 2) } } } };
    const b = { ...base, courses: { x: { done: { n: { best: 0.9, count: 1 } }, cards: { w: card(20 * day, 6, 3) } } } };
    const m = mergeState(a, b);
    expect(m.courses.x!.done.n!.best).toBe(0.9);
    expect(m.courses.x!.cards.w!.i).toBe(6);
  });
  it('never loses XP and takes the streak from the device used last', () => {
    const a = { ...base, xp: 50, xpByDay: { '2026-11-01': 50 }, streak: { count: 4, best: 9, lastDay: '2026-11-01', freezes: 1 } };
    const b = { ...base, xp: 30, xpByDay: { '2026-11-02': 30 }, streak: { count: 2, best: 2, lastDay: '2026-11-02', freezes: 0 } };
    const m = mergeState(a, b);
    expect(m.xp).toBe(80);
    expect(m.streak).toEqual({ count: 2, best: 9, lastDay: '2026-11-02', freezes: 1 });
  });
  it('is the same whichever side goes first, apart from local preferences', () => {
    const a = { ...base, xp: 10, gems: 300, xpByDay: { d1: 10 } };
    const b = { ...base, xp: 20, gems: 200, xpByDay: { d2: 20 } };
    const ab = mergeState(a, b);
    const ba = mergeState(b, a);
    expect(ab.xp).toBe(ba.xp);
    expect(ab.gems).toBe(ba.gems);
    expect(ab.xpByDay).toEqual(ba.xpByDay);
  });
});
