import { buildPath } from './course';
import type { Course, Section } from './types';

/** The CEFR ladder. A section's `cefr` value may be finer ("A1.2"); its first two letters decide. */
export const LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;
export type Level = (typeof LEVELS)[number];

export function levelOf(section: Section): Level {
  const code = section.cefr.slice(0, 2).toUpperCase();
  return (LEVELS as readonly string[]).includes(code) ? (code as Level) : 'A1';
}

export interface LevelStatus {
  level: Level;
  /** False until the course has content for this level. */
  available: boolean;
  total: number;
  done: number;
  /** 0 to 1. */
  progress: number;
  complete: boolean;
  targetMet: boolean;
}

export function examNodeId(level: string): string {
  return `${level}:exam`;
}

export function levelStatuses(course: Course, done: Readonly<Record<string, unknown>>): LevelStatus[] {
  const levelBySection = new Map(course.sections.map((s) => [s.id, levelOf(s)]));
  const path = buildPath(course);
  return LEVELS.map((level) => {
    const nodes = path.filter((n) => levelBySection.get(n.sectionId) === level);
    const finished = nodes.filter((n) => done[n.id]).length;
    // Meeting a level's practice target counts as having finished it: that is how to skip ahead.
    const targetMet = !!done[examNodeId(level)];
    return {
      level,
      available: nodes.length > 0,
      total: nodes.length,
      done: finished,
      progress: targetMet ? 1 : nodes.length === 0 ? 0 : finished / nodes.length,
      complete: nodes.length > 0 && (targetMet || finished === nodes.length),
      targetMet,
    };
  });
}

/** The level a learner is working on: the first one with anything left to do. */
export function currentLevel(statuses: readonly LevelStatus[]): Level {
  return statuses.find((s) => s.available && !s.complete)?.level ?? statuses[0]?.level ?? 'A1';
}

/** The next lesson to do. Levels whose practice target is met are skipped, but stay replayable. */
export function currentNodeId(course: Course, done: Readonly<Record<string, unknown>>): string | null {
  const levelBySection = new Map(course.sections.map((s) => [s.id, levelOf(s)]));
  const next = buildPath(course).find((n) => {
    if (done[n.id]) return false;
    return !done[examNodeId(levelBySection.get(n.sectionId) ?? 'A1')];
  });
  return next?.id ?? null;
}

export interface SectionScore {
  correct: number;
  total: number;
}

/** Ohrly's own practice rule: 60% overall and half of reading and of listening. Not an exam's rule. */
export function practiceTargetMet(scores: {
  reading: SectionScore;
  listening: SectionScore;
  language: SectionScore;
}): boolean {
  const all = [scores.reading, scores.listening, scores.language];
  const correct = all.reduce((n, s) => n + s.correct, 0);
  const total = all.reduce((n, s) => n + s.total, 0);
  return (
    total > 0 &&
    correct >= Math.ceil(total * 0.6) &&
    scores.reading.correct >= Math.ceil(scores.reading.total * 0.5) &&
    scores.listening.correct >= Math.ceil(scores.listening.total * 0.5)
  );
}

/** The full CEFR scale. The course teaches up to B2; C1 and C2 are shown so the scale is honest. */
export const CEFR_SCALE = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

/**
 * Where a learner sits on the scale, from 0 (starting A1) to 6 (finished C2): whole levels completed
 * in order, plus the part done of the next one. Progress in a later level does not count while an
 * earlier one is unfinished, since levels build on each other.
 */
export function cefrPosition(statuses: readonly LevelStatus[]): number {
  let position = 0;
  for (const s of statuses) {
    if (s.complete) {
      position += 1;
      continue;
    }
    position += s.progress;
    break;
  }
  return position;
}
