import { describe, expect, it } from 'vitest';
import { buildPath, buildGlossary } from '../../src/domain/course';
import { generateLesson, mulberry32, scaffold, wordsTested } from '../../src/domain/generator';
import { normalize, tokenize } from '../../src/domain/check';
import type { Course, Exercise, Sentence, Word } from '../../src/domain/types';
import { validateCourse } from '../../src/domain/validate';

const w = (id: string, target: string, source: string, extra: Partial<Word> = {}): Word => ({
  id,
  target,
  source,
  pos: 'noun',
  ...extra,
});

const words = [
  w('hund', 'der Hund', 'the dog', { emoji: '🐕', plural: 'die Hunde' }),
  w('katze', 'die Katze', 'the cat', { emoji: '🐈', plural: 'die Katzen' }),
  w('haus', 'das Haus', 'the house', { emoji: '🏠', plural: 'die Häuser' }),
  w('ist', 'sein', 'to be', { pos: 'verb', forms: ['ist', 'sind'] }),
  w('gross', 'groß', 'big', { pos: 'adj' }),
  w('klein', 'klein', 'small', { pos: 'adj' }),
  w('und', 'und', 'and', { pos: 'conj' }),
  w('hier', 'hier', 'here', { pos: 'adv' }),
];

const s = (id: string, target: string, source: string, ids: string[], extra: Partial<Sentence> = {}): Sentence => ({
  id,
  target,
  source,
  words: ids,
  ...extra,
});

const course: Course = {
  id: 'en-de',
  from: 'en',
  to: 'de',
  title: 'German',
  version: 1,
  sections: [
    {
      id: 'c1',
      title: 'One',
      cefr: 'A1',
      description: 'd',
      units: [
        {
          id: 'u1',
          title: 'Animals',
          canDo: 'Name animals',
          tip: { title: 't', body: 'b', examples: [{ target: 'der Hund', source: 'the dog' }] },
          words,
          sentences: [
            s('s1', 'Der Hund ist groß.', 'The dog is big.', ['hund', 'ist', 'gross'], { cloze: { answer: 'ist', distractors: ['sind', 'sein'] } }),
            s('s2', 'Die Katze ist klein.', 'The cat is small.', ['katze', 'ist', 'klein'], { cloze: { answer: 'die', distractors: ['der', 'das'] } }),
            s('s3', 'Das Haus ist hier.', 'The house is here.', ['haus', 'ist', 'hier'], { cloze: { answer: 'das', distractors: ['der', 'die'] } }),
            s('s4', 'Der Hund und die Katze sind hier.', 'The dog and the cat are here.', ['hund', 'und', 'katze', 'ist', 'hier']),
            s('s5', 'Die Katze ist hier.', 'The cat is here.', ['katze', 'ist', 'hier']),
            s('s6', 'Der Hund ist hier.', 'The dog is here.', ['hund', 'ist', 'hier']),
            s('s7', 'Das Haus ist groß.', 'The house is big.', ['haus', 'ist', 'gross']),
            s('s8', 'Das Haus und der Hund sind klein.', 'The house and the dog are small.', ['haus', 'und', 'hund', 'ist', 'klein']),
            s('s9', 'Die Katze und der Hund sind groß.', 'The cat and the dog are big.', ['katze', 'und', 'hund', 'ist', 'gross']),
            s('s10', 'Der Hund ist klein und die Katze ist groß.', 'The dog is small and the cat is big.', ['hund', 'ist', 'klein', 'und', 'katze', 'gross']),
          ],
        },
      ],
    },
  ],
};

const opts = { speakAvailable: true, listenAvailable: true };

function allLessons(o = opts): Exercise[][] {
  const out: Exercise[][] = [];
  for (const node of buildPath(course)) {
    for (let seed = 1; seed < 25; seed++) out.push(generateLesson(course, node, mulberry32(seed), o));
  }
  return out;
}

describe('fixture', () => {
  it('passes the validator', () => {
    expect(validateCourse(course).filter((i) => i.level === 'error')).toEqual([]);
  });
});

describe('path', () => {
  it('has five lessons per unit plus a chapter test', () => {
    const path = buildPath(course);
    expect(path).toHaveLength(6);
    expect(path[5]!.kind).toBe('checkpoint');
  });
});

describe('generateLesson', () => {
  it('is deterministic for a seed', () => {
    const node = buildPath(course)[2]!;
    const a = generateLesson(course, node, mulberry32(7), opts);
    const b = generateLesson(course, node, mulberry32(7), opts);
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });

  it('builds every lesson with a usable number of exercises', () => {
    for (const lesson of allLessons()) expect(lesson.length).toBeGreaterThanOrEqual(6);
  });

  it('always offers tiles that can build the correct answer', () => {
    for (const lesson of allLessons()) {
      for (const ex of lesson) {
        if (ex.kind !== 'bank' && ex.kind !== 'listenBank') continue;
        const side = ex.kind === 'bank' && ex.direction === 'toSource' ? 'source' : 'target';
        const lang = side === 'target' ? 'de' : 'en';
        const have = ex.tiles.map((t) => normalize(t.text, lang));
        for (const tok of tokenize(ex.sentence[side])) {
          const n = normalize(tok, lang);
          const i = have.indexOf(n);
          expect(i, `missing tile ${n} for ${ex.sentence.target}`).toBeGreaterThanOrEqual(0);
          have.splice(i, 1);
        }
      }
    }
  });

  it('gives tiles unique ids, so repeated words animate independently', () => {
    for (const lesson of allLessons()) {
      for (const ex of lesson) {
        if (ex.kind === 'bank' || ex.kind === 'listenBank') {
          expect(new Set(ex.tiles.map((t) => t.id)).size).toBe(ex.tiles.length);
        }
      }
    }
  });

  it('always includes the right option and no duplicate options', () => {
    for (const lesson of allLessons()) {
      for (const ex of lesson) {
        if (ex.kind === 'picture' || ex.kind === 'wordChoice' || ex.kind === 'listenChoice') {
          expect(ex.options.map((o) => o.id)).toContain(ex.word.id);
          expect(new Set(ex.options.map((o) => o.id)).size).toBe(ex.options.length);
          expect(ex.options.length).toBeGreaterThanOrEqual(3);
        }
        if (ex.kind === 'cloze') expect(ex.options).toContain(ex.sentence.cloze!.answer);
      }
    }
  });

  it('never asks for speech or sound when those are turned off', () => {
    const off = { speakAvailable: false, listenAvailable: false };
    const banned = new Set(['speak', 'listenBank', 'listenType', 'listenChoice']);
    for (const lesson of allLessons(off)) {
      for (const ex of lesson) expect(banned.has(ex.kind), ex.kind).toBe(false);
    }
  });

  it('never shows a sentence with a word from the half of the unit not yet taught', () => {
    const firstHalf = new Set(words.slice(0, 4).map((x) => x.id));
    for (let seed = 1; seed < 40; seed++) {
      const lesson = generateLesson(course, buildPath(course)[0]!, mulberry32(seed), opts);
      for (const ex of lesson) {
        if ('sentence' in ex) {
          for (const id of ex.sentence.words) expect(firstHalf.has(id)).toBe(true);
        }
      }
    }
  });

  it('reports what each exercise tests, and intros test nothing', () => {
    expect(wordsTested({ kind: 'intro', key: 'k', word: words[0]! })).toEqual([]);
  });
});

describe('validator catches lazy content', () => {
  const clone = (): Course => JSON.parse(JSON.stringify(course)) as Course;
  const errors = (c: Course) => validateCourse(c).filter((i) => i.level === 'error').map((i) => i.message);

  it('rejects untaught words', () => {
    const c = clone();
    c.sections[0]!.units[0]!.sentences[0]!.target = 'Der Elefant ist groß.';
    expect(errors(c).join()).toMatch(/untaught target words: elefant/);
  });

  it('rejects a cloze over a name and random distractors', () => {
    const c = clone();
    c.names = ['Anna'];
    const sentences = c.sections[0]!.units[0]!.sentences;
    sentences[0]!.target = 'Anna ist groß.';
    sentences[0]!.cloze = { answer: 'Anna', distractors: ['weil', 'obwohl'] };
    const out = errors(c).join();
    expect(out).toMatch(/blanks out the name/);
    expect(out).toMatch(/neither taught nor a variant/);
  });

  it('rejects sentences differing only by a name', () => {
    const c = clone();
    c.names = ['Anna', 'Ben'];
    const sentences = c.sections[0]!.units[0]!.sentences;
    sentences[0]!.target = 'Anna ist groß.';
    sentences[1]!.target = 'Ben ist groß.';
    expect(errors(c).join()).toMatch(/only a name differs/);
  });

  it('rejects a dishonest word list', () => {
    const c = clone();
    c.sections[0]!.units[0]!.sentences[4]!.words = ['katze', 'hund', 'hier', 'ist'];
    expect(errors(c).join()).toMatch(/does not contain it/);
  });
});

describe('glossary', () => {
  it('glosses a word with its article, never words inside a phrase', () => {
    const g = buildGlossary([
      {
        ...course.sections[0]!.units[0]!,
        words: [w('a', 'der Hund', 'the dog'), w('b', 'Wie geht es dir?', 'How are you?', { pos: 'phrase' })],
      },
    ]);
    expect(g.target.get('hund')).toBe('the dog');
    expect(g.target.has('geht')).toBe(false);
    expect(g.source.has('you')).toBe(false);
  });
});

describe('lesson quality', () => {
  it('gives every new word several meetings in its first lesson', () => {
    const fresh = words.slice(0, 4).map((x) => x.id);
    for (let seed = 1; seed < 20; seed++) {
      const lesson = generateLesson(course, buildPath(course)[0]!, mulberry32(seed), opts);
      for (const id of fresh) {
        const meetings = lesson.filter((ex) =>
          ex.kind === 'intro' ? ex.word.id === id : wordsTested(ex).includes(id),
        ).length;
        expect(meetings, `word ${id}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('opens with a warm-up on due words, but only words already taught', () => {
    const two: Course = JSON.parse(JSON.stringify(course));
    const unit2 = JSON.parse(JSON.stringify(two.sections[0]!.units[0]!));
    unit2.id = 'u2';
    unit2.words = unit2.words.map((w: { id: string }) => ({ ...w, id: `${w.id}2` }));
    unit2.sentences = unit2.sentences.map((s: { id: string; words: string[] }) => ({
      ...s, id: `${s.id}b`, words: s.words.map((id) => `${id}2`),
    }));
    two.sections[0]!.units.push(unit2);
    const node = buildPath(two).find((n) => n.id === 'u2:2')!;
    const lesson = generateLesson(two, node, mulberry32(3), { ...opts, dueWordIds: ['hund', 'nope'] });
    expect(lesson[0]!.key.startsWith('w')).toBe(true);
    expect(wordsTested(lesson[0]!)).toEqual(['hund']);
    const plain = generateLesson(two, node, mulberry32(3), opts);
    expect(plain[0]!.key.startsWith('w')).toBe(false);
  });

  it('brings a missed typing task back as tiles of the same sentence', () => {
    const sentence = course.sections[0]!.units[0]!.sentences[0]!;
    const easier = scaffold({ kind: 'type', key: 'k', direction: 'toTarget', sentence }, course, mulberry32(1));
    expect(easier.kind).toBe('bank');
    expect('sentence' in easier && easier.sentence.id).toBe(sentence.id);
    const heard = scaffold({ kind: 'listenType', key: 'k', sentence }, course, mulberry32(1));
    expect(heard.kind).toBe('listenBank');
  });
});
