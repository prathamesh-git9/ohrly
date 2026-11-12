import { describe, expect, it } from 'vitest';
import {
  computeRewards,
  daysBetween,
  milestoneSparks,
  nextMilestone,
  streakNudge,
  displayedStreak,
  gainHeart,
  HEART_REGEN_MS,
  loseHeart,
  MAX_HEARTS,
  recordActivity,
  settleHearts,
} from '../../src/domain/gamify';

const base = { count: 5, best: 5, lastDay: '2026-03-10', freezes: 0 };

describe('streak', () => {
  it('starts at one', () => {
    const r = recordActivity({ count: 0, best: 0, lastDay: null, freezes: 0 }, '2026-03-10');
    expect(r.next.count).toBe(1);
    expect(r.extended).toBe(true);
  });
  it('does not grow twice in a day', () => {
    const r = recordActivity(base, '2026-03-10');
    expect(r.next.count).toBe(5);
    expect(r.extended).toBe(false);
  });
  it('grows on the next day', () => {
    expect(recordActivity(base, '2026-03-11').next.count).toBe(6);
  });
  it('resets after a missed day with no freeze, keeping the best', () => {
    const r = recordActivity(base, '2026-03-12');
    expect(r.next.count).toBe(1);
    expect(r.next.best).toBe(5);
    expect(r.lost).toBe(true);
  });
  it('spends freezes on missed days', () => {
    const r = recordActivity({ ...base, freezes: 2 }, '2026-03-13');
    expect(r.next.count).toBe(6);
    expect(r.next.freezes).toBe(0);
    expect(r.freezesUsed).toBe(2);
  });
  it('resets when the gap exceeds the freezes', () => {
    expect(recordActivity({ ...base, freezes: 1 }, '2026-03-14').next.count).toBe(1);
  });
  it('ignores a clock moved backwards', () => {
    expect(recordActivity(base, '2026-03-01').next).toEqual(base);
  });
  it('counts days correctly across daylight saving', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
  });
  it('displays zero once the streak is really gone', () => {
    expect(displayedStreak(base, '2026-03-11')).toBe(5);
    expect(displayedStreak(base, '2026-03-12')).toBe(0);
    expect(displayedStreak({ ...base, freezes: 1 }, '2026-03-12')).toBe(5);
  });
});

describe('hearts', () => {
  const t0 = 1_000_000;
  it('starts the regen clock on the first loss', () => {
    expect(loseHeart({ count: MAX_HEARTS, regenFrom: null }, t0)).toEqual({ count: 4, regenFrom: t0 });
  });
  it('does not restart the clock on a second loss', () => {
    expect(loseHeart({ count: 4, regenFrom: t0 }, t0 + 5).regenFrom).toBe(t0);
  });
  it('regenerates over time and keeps partial progress', () => {
    const s = settleHearts({ count: 1, regenFrom: t0 }, t0 + HEART_REGEN_MS * 2 + 7);
    expect(s).toEqual({ count: 3, regenFrom: t0 + HEART_REGEN_MS * 2 });
  });
  it('stops at the maximum', () => {
    expect(settleHearts({ count: 4, regenFrom: t0 }, t0 + HEART_REGEN_MS * 50)).toEqual({
      count: MAX_HEARTS,
      regenFrom: null,
    });
  });
  it('never drops below zero', () => {
    expect(loseHeart({ count: 0, regenFrom: t0 }, t0).count).toBe(0);
  });
  it('gaining the last heart clears the clock', () => {
    expect(gainHeart({ count: 4, regenFrom: t0 }, t0)).toEqual({ count: 5, regenFrom: null });
  });
});

describe('rewards', () => {
  it('pays a perfect bonus', () => {
    const r = computeRewards({ total: 10, mistakes: 0, seconds: 60, isCheckpoint: false, isReplay: false });
    expect(r).toMatchObject({ xp: 15, perfect: true, accuracy: 1 });
  });
  it('computes accuracy from attempts', () => {
    const r = computeRewards({ total: 8, mistakes: 2, seconds: 60, isCheckpoint: false, isReplay: false });
    expect(r.accuracy).toBeCloseTo(0.8);
    expect(r.xp).toBe(10);
  });
});

describe('streak milestones and nudges', () => {
  const base = { count: 5, best: 5, lastDay: '2026-11-11', freezes: 0 };
  const at = (day: string, hour: number) => {
    const [y, m, d] = day.split('-').map(Number);
    return new Date(y!, m! - 1, d!, hour);
  };

  it('pays sparks only on milestone days and knows the next one', () => {
    expect(milestoneSparks(7)).toBe(50);
    expect(milestoneSparks(8)).toBe(0);
    expect(milestoneSparks(365)).toBe(1000);
    expect(nextMilestone(5)).toBe(7);
    expect(nextMilestone(7)).toBe(14);
    expect(nextMilestone(1000)).toBeNull();
  });

  it('says nothing once today is done', () => {
    expect(streakNudge({ ...base, lastDay: '2026-11-12' }, at('2026-11-12', 20))).toEqual({ kind: 'done' });
  });

  it('asks to keep a live streak, urgently from 6 pm', () => {
    expect(streakNudge(base, at('2026-11-12', 9))).toEqual({ kind: 'keep', count: 5, late: false, covered: false });
    expect(streakNudge(base, at('2026-11-12', 18))).toMatchObject({ kind: 'keep', late: true });
  });

  it('knows when a rest day would cover today', () => {
    expect(streakNudge({ ...base, freezes: 1 }, at('2026-11-12', 20))).toMatchObject({ covered: true });
    // Yesterday was already missed and used the only rest day's cover: today is not covered.
    expect(streakNudge({ ...base, freezes: 1 }, at('2026-11-13', 20))).toMatchObject({ kind: 'keep', covered: false });
  });

  it('invites a start when there is no streak to keep', () => {
    expect(streakNudge({ ...base, count: 0, lastDay: null }, at('2026-11-12', 10))).toEqual({ kind: 'start' });
    expect(streakNudge(base, at('2026-11-14', 10))).toEqual({ kind: 'start' });
  });
});
