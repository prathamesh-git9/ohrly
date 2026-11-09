/**
 * SM-2 spaced repetition: small, deterministic, and easy to audit offline.
 *
 * One departure from the textbook: a correct answer before a card is due does not advance it. A
 * lesson can test the same word several times in minutes, and textbook SM-2 would read that as
 * days of proven memory. A wrong answer always counts, whenever it happens.
 */
export interface Card {
  /** Successful repetitions in a row. */
  n: number;
  /** Current interval in days. */
  i: number;
  /** Easiness factor. */
  ef: number;
  /** Next review, epoch ms. */
  due: number;
  reps: number;
  lapses: number;
}

const DAY = 86_400_000;
const MAX_INTERVAL = 180;
const START_EF = 2.5;

/** Quality: 5 perfect, 4 correct, 3 correct with a slip, below 3 not recalled. */
export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

export function nextEf(ef: number, q: Quality): number {
  const miss = 5 - q;
  return Math.max(1.3, ef + 0.1 - miss * (0.08 + miss * 0.02));
}

export function review(card: Card | undefined, q: Quality, now: number): Card {
  const c: Card = card ?? { n: 0, i: 0, ef: START_EF, due: 0, reps: 0, lapses: 0 };
  const correct = q >= 3;
  if (correct && card && now < card.due) {
    return { ...c, reps: c.reps + 1 };
  }
  const ef = nextEf(c.ef, q);
  let n: number;
  let i: number;
  if (!correct) {
    n = 0;
    i = 1;
  } else if (c.n === 0) {
    n = 1;
    i = 1;
  } else if (c.n === 1) {
    n = 2;
    i = 6;
  } else {
    n = c.n + 1;
    i = Math.round(c.i * ef);
  }
  i = Math.min(MAX_INTERVAL, i);
  return { n, i, ef, due: now + i * DAY, reps: c.reps + 1, lapses: c.lapses + (correct ? 0 : 1) };
}

export function isDue(card: Card, now: number): boolean {
  return now >= card.due;
}

/** Word ids most overdue first. */
export function dueWords(cards: Record<string, Card>, now: number, limit = 12): string[] {
  return Object.entries(cards)
    .filter(([, c]) => isDue(c, now))
    .sort((a, b) => a[1].due - b[1].due)
    .slice(0, limit)
    .map(([id]) => id);
}

/** Word ids most often missed, for the "weak words" practice. */
export function weakWords(cards: Record<string, Card>, limit = 12): string[] {
  return Object.entries(cards)
    .filter(([, c]) => c.lapses > 0)
    .sort((a, b) => b[1].lapses / b[1].reps - a[1].lapses / a[1].reps)
    .slice(0, limit)
    .map(([id]) => id);
}

/** 0 to 4 bars for the word list. */
export function strength(card: Card | undefined, now: number): number {
  if (!card) return 0;
  if (isDue(card, now)) return 1;
  if (card.i >= 21) return 4;
  if (card.i >= 6) return 3;
  return 2;
}
