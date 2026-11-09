import { describe, expect, it } from 'vitest';
import { dueWords, nextEf, review, strength, weakWords } from '../../src/domain/srs';

const DAY = 86_400_000;
const t0 = 1_700_000_000_000;

describe('SM-2', () => {
  it('follows the 1, 6, then EF-scaled interval sequence', () => {
    const a = review(undefined, 4, t0);
    expect(a).toMatchObject({ n: 1, i: 1 });
    const b = review(a, 4, a.due);
    expect(b).toMatchObject({ n: 2, i: 6 });
    const c = review(b, 4, b.due);
    expect(c.n).toBe(3);
    expect(c.i).toBe(Math.round(6 * c.ef));
  });

  it('applies the published easiness formula with a floor of 1.3', () => {
    expect(nextEf(2.5, 5)).toBeCloseTo(2.6);
    expect(nextEf(2.5, 4)).toBeCloseTo(2.5);
    expect(nextEf(2.5, 3)).toBeCloseTo(2.36);
    expect(nextEf(1.3, 0)).toBe(1.3);
  });

  it('resets the run on a miss and counts the lapse', () => {
    const a = review(review(undefined, 4, t0), 4, t0 + DAY);
    const b = review(a, 1, a.due);
    expect(b).toMatchObject({ n: 0, i: 1, lapses: 1 });
  });

  it('does not let repeats inside one lesson inflate the interval', () => {
    const a = review(undefined, 4, t0);
    const b = review(a, 4, t0 + 60_000);
    const c = review(b, 4, t0 + 120_000);
    expect(c.i).toBe(1);
    expect(c.n).toBe(1);
    expect(c.reps).toBe(3);
  });

  it('counts a miss even before the card is due', () => {
    const a = review(undefined, 4, t0);
    expect(review(a, 1, t0 + 60_000).lapses).toBe(1);
  });

  it('caps the interval', () => {
    let c = review(undefined, 5, t0);
    for (let k = 0; k < 12; k++) c = review(c, 5, c.due);
    expect(c.i).toBe(180);
  });

  it('lists due and weak words in priority order', () => {
    const cards = {
      old: { n: 2, i: 6, ef: 2.5, due: t0 - 5 * DAY, reps: 4, lapses: 0 },
      newer: { n: 2, i: 6, ef: 2.5, due: t0 - DAY, reps: 4, lapses: 3 },
      future: { n: 2, i: 6, ef: 2.5, due: t0 + DAY, reps: 4, lapses: 1 },
    };
    expect(dueWords(cards, t0)).toEqual(['old', 'newer']);
    expect(weakWords(cards)).toEqual(['newer', 'future']);
  });

  it('reports strength bars', () => {
    expect(strength(undefined, t0)).toBe(0);
    expect(strength({ n: 1, i: 1, ef: 2.5, due: t0 - 1, reps: 1, lapses: 0 }, t0)).toBe(1);
    expect(strength({ n: 5, i: 30, ef: 2.5, due: t0 + DAY, reps: 5, lapses: 0 }, t0)).toBe(4);
  });
});
