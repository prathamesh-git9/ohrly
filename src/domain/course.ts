import { normalize, tokenize } from './check';
import type { Course, NodeKind, PathNode, Section, Sentence, Unit, Word } from './types';

/** Each unit is five lessons, in this order. */
export const UNIT_LESSONS: NodeKind[] = ['words', 'words', 'sentences', 'listening', 'review'];

export function buildPath(course: Course): PathNode[] {
  const nodes: PathNode[] = [];
  for (const section of course.sections) {
    for (const unit of section.units) {
      UNIT_LESSONS.forEach((kind, lessonIndex) => {
        nodes.push({
          id: `${unit.id}:${lessonIndex}`,
          kind,
          sectionId: section.id,
          unitId: unit.id,
          lessonIndex,
        });
      });
      if (unit.passages?.length) {
        nodes.push({
          id: `${unit.id}:${UNIT_LESSONS.length}`,
          kind: 'passages',
          sectionId: section.id,
          unitId: unit.id,
          lessonIndex: UNIT_LESSONS.length,
        });
      }
    }
    nodes.push({
      id: `${section.id}:checkpoint`,
      kind: 'checkpoint',
      sectionId: section.id,
      unitId: null,
      lessonIndex: 0,
    });
    // A level's practice exam closes its last chapter.
    const level = section.cefr.slice(0, 2).toUpperCase();
    const next = course.sections[course.sections.indexOf(section) + 1];
    const lastOfLevel = !next || next.cefr.slice(0, 2).toUpperCase() !== level;
    if (lastOfLevel && course.exams?.some((e) => e.level === level)) {
      nodes.push({
        id: `${level}:exam`,
        kind: 'exam',
        sectionId: section.id,
        unitId: null,
        lessonIndex: 0,
      });
    }
  }
  return nodes;
}

export function findUnit(course: Course, unitId: string): { section: Section; unit: Unit } | null {
  for (const section of course.sections) {
    const unit = section.units.find((u) => u.id === unitId);
    if (unit) return { section, unit };
  }
  return null;
}

export function allWords(course: Course): Word[] {
  return course.sections.flatMap((s) => s.units.flatMap((u) => u.words));
}

export function allSentences(course: Course): Sentence[] {
  return course.sections.flatMap((s) => s.units.flatMap((u) => u.sentences));
}

/** All units up to and including `unitId`, in teaching order. */
export function unitsThrough(course: Course, unitId: string): Unit[] {
  const out: Unit[] = [];
  for (const section of course.sections) {
    for (const unit of section.units) {
      out.push(unit);
      if (unit.id === unitId) return out;
    }
  }
  return out;
}

/** Normalized target-language tokens the course contains. A real word is never a "typo". */
export function targetVocabulary(course: Course): Set<string> {
  const known = new Set<string>();
  const add = (text: string) => {
    for (const tok of normalize(text, course.to).split(' ')) if (tok) known.add(tok);
  };
  for (const w of allWords(course)) {
    add(w.target);
    w.targetAccept?.forEach(add);
    w.forms?.forEach(add);
  }
  course.names?.forEach(add);
  for (const s of allSentences(course)) {
    add(s.target);
    s.targetAccept?.forEach(add);
    if (s.cloze) {
      add(s.cloze.answer);
      s.cloze.distractors.forEach(add);
    }
  }
  return known;
}

export function sourceVocabulary(course: Course): Set<string> {
  const known = new Set<string>();
  const add = (text: string) => {
    for (const tok of normalize(text, course.from).split(' ')) if (tok) known.add(tok);
  };
  for (const w of allWords(course)) {
    add(w.source);
    w.sourceAccept?.forEach(add);
  }
  for (const s of allSentences(course)) {
    add(s.source);
    s.sourceAccept?.forEach(add);
  }
  return known;
}

const ARTICLE_LIKE = new Set([
  'the', 'a', 'an', 'to', 'der', 'die', 'das', 'ein', 'eine',
]);

export interface Glossary {
  target: Map<string, string>;
  source: Map<string, string>;
}

/**
 * Powers tap-a-word hints. Only entries that are unambiguous about which word they gloss:
 * "der Hund" glosses Hund, but "How are you?" must not gloss "you".
 */
export function buildGlossary(units: readonly Unit[]): Glossary {
  const target = new Map<string, string>();
  const source = new Map<string, string>();
  const headword = (phrase: string): string | null => {
    const toks = tokenize(phrase);
    if (toks.length === 1) return toks[0]!.toLowerCase();
    if (toks.length === 2 && ARTICLE_LIKE.has(toks[0]!.toLowerCase())) {
      return toks[1]!.toLowerCase();
    }
    return null;
  };
  for (const unit of units) {
    for (const w of unit.words) {
      const t = headword(w.target);
      const s = headword(w.source);
      if (t && !target.has(t)) target.set(t, w.source);
      if (s && !source.has(s)) source.set(s, w.target);
    }
  }
  return { target, source };
}
