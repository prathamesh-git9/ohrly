import { describe, expect, it } from 'vitest';
import { buildPath } from '../../src/domain/course';
import { currentLevel, currentNodeId, levelOf, levelStatuses, practiceTargetMet } from '../../src/domain/levels';
import type { Course, Section, Unit } from '../../src/domain/types';

const unit = (id: string): Unit => ({
  id,
  title: id,
  canDo: 'x',
  tip: { title: 't', body: 'b', examples: [] },
  words: [],
  sentences: [],
});
const section = (id: string, cefr: string, units: string[]): Section => ({
  id,
  title: id,
  cefr,
  description: 'd',
  units: units.map(unit),
});
const course: Course = {
  id: 'en-de',
  from: 'en',
  to: 'de',
  title: 'German',
  version: 1,
  sections: [section('c1', 'A1', ['u1']), section('c2', 'A1.2', ['u2']), section('c3', 'A2', ['u3'])],
};

describe('levels', () => {
  it('reads the level from a finer label and falls back safely', () => {
    expect(levelOf(section('s', 'A1.2', []))).toBe('A1');
    expect(levelOf(section('s', 'b2', []))).toBe('B2');
    expect(levelOf(section('s', '??', []))).toBe('A1');
  });

  it('counts lessons per level, and marks levels with no content unavailable', () => {
    const s = levelStatuses(course, { 'u1:0': {}, 'u1:1': {} });
    expect(s.map((x) => x.level)).toEqual(['A1', 'A2', 'B1', 'B2']);
    expect(s[0]).toMatchObject({ available: true, done: 2, total: 12, complete: false });
    expect(s[0]!.progress).toBeCloseTo(2 / 12);
    expect(s[2]).toMatchObject({ available: false, total: 0, progress: 0, complete: false });
  });

  it('moves the learner on when a level is complete', () => {
    const allA1: Record<string, unknown> = {};
    for (const id of ['u1', 'u2']) for (let i = 0; i < 5; i++) allA1[`${id}:${i}`] = {};
    allA1['c1:checkpoint'] = {};
    allA1['c2:checkpoint'] = {};
    const s = levelStatuses(course, allA1);
    expect(s[0]!.complete).toBe(true);
    expect(currentLevel(s)).toBe('A2');
  });
});

const score = (correct: number, total: number) => ({ correct, total });

describe('practice exams', () => {
  const exam = { level: 'A1', reading: [], listening: [], language: [], production: [] };
  const withExam: Course = { ...course, exams: [exam] };

  it('closes the level, after its last chapter test and before the next level', () => {
    const ids = buildPath(withExam).map((n) => n.id);
    expect(ids.indexOf('A1:exam')).toBe(ids.indexOf('c2:checkpoint') + 1);
    expect(ids.indexOf('A1:exam')).toBeLessThan(ids.indexOf('u3:0'));
  });

  it('applies the 24/40 overall and 8/15 per skill rule at A1', () => {
    expect(practiceTargetMet({ reading: score(8, 15), listening: score(8, 15), language: score(8, 10) })).toBe(true);
    // Enough overall, but listening is too weak.
    expect(practiceTargetMet({ reading: score(15, 15), listening: score(7, 15), language: score(10, 10) })).toBe(false);
    // Both skills scrape through, but the total falls short.
    expect(practiceTargetMet({ reading: score(8, 15), listening: score(8, 15), language: score(7, 10) })).toBe(false);
  });

  it('applies the same thresholds at B1: 48/80 and 15/30', () => {
    expect(practiceTargetMet({ reading: score(15, 30), listening: score(15, 30), language: score(18, 20) })).toBe(true);
    expect(practiceTargetMet({ reading: score(15, 30), listening: score(15, 30), language: score(17, 20) })).toBe(false);
  });

  it('never passes an empty exam', () => {
    expect(practiceTargetMet({ reading: score(0, 0), listening: score(0, 0), language: score(0, 0) })).toBe(false);
  });

  it('skips a level once its target is met, marking it complete', () => {
    const done = { 'A1:exam': {} };
    expect(currentNodeId(withExam, done)).toBe('u3:0');
    expect(currentNodeId(withExam, {})).toBe('u1:0');
    const statuses = levelStatuses(withExam, done);
    expect(statuses[0]).toMatchObject({ complete: true, progress: 1, targetMet: true });
    expect(currentLevel(statuses)).toBe('A2');
  });
});
