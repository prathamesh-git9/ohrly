import { normalize, tokenize } from './check';
import { findUnit, unitsThrough } from './course';
import type {
  Course,
  Exercise,
  PathNode,
  Section,
  Sentence,
  Tile,
  Unit,
  Word,
} from './types';

/**
 * Lessons are generated from unit data, not hand-authored. That is what lets a course file stay
 * a list of words and sentences, and makes every retry of a lesson feel fresh.
 */

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function pick<T>(items: readonly T[], n: number, rng: Rng): T[] {
  return shuffled(items, rng).slice(0, Math.max(0, n));
}

export interface GenerateOptions {
  speakAvailable: boolean;
  /** Listening exercises need sound. Off when the learner says they can't listen right now. */
  listenAvailable: boolean;
}

interface Ctx {
  course: Course;
  rng: Rng;
  opts: GenerateOptions;
  /** Everything taught so far: the pool for distractors. */
  taughtUnits: readonly Unit[];
  nextKey: () => string;
}

function makeCtx(course: Course, taughtUnits: readonly Unit[], rng: Rng, opts: GenerateOptions): Ctx {
  let n = 0;
  return { course, rng, opts, taughtUnits, nextKey: () => `ex${n++}` };
}

/** Lowercases a sentence-initial word unless that word only exists capitalised ("Anna", "I"). */
function tileTokens(text: string, lexicon: ReadonlySet<string>): string[] {
  const toks = tokenize(text);
  const first = toks[0];
  if (first) {
    const lower = first.toLowerCase();
    if (first !== lower && lexicon.has(lower)) toks[0] = lower;
  }
  return toks;
}

function caseSensitiveLexicon(units: readonly Unit[], side: 'target' | 'source'): Set<string> {
  const out = new Set<string>();
  for (const u of units) {
    for (const w of u.words) {
      const toks = tokenize(w[side]);
      // Only non-initial positions tell us the natural case of a word; so does a one-word entry.
      toks.forEach((t, i) => {
        if (i > 0 || toks.length === 1) out.add(t);
      });
    }
    for (const s of u.sentences) {
      tokenize(s[side]).slice(1).forEach((t) => out.add(t));
    }
  }
  return out;
}

function buildTiles(sentence: Sentence, side: 'target' | 'source', ctx: Ctx): Tile[] {
  const lang = side === 'target' ? ctx.course.to : ctx.course.from;
  const lexicon = caseSensitiveLexicon(ctx.taughtUnits, side);
  const answer = tileTokens(sentence[side], lexicon);

  // A distractor must never let the learner build an accepted alternative and be marked wrong,
  // so no token from any accepted answer can appear as an "extra" unless it is in the primary.
  const accepts = side === 'target' ? sentence.targetAccept : sentence.sourceAccept;
  const blocked = new Set<string>(
    [sentence[side], ...(accepts ?? [])].flatMap((a) =>
      tokenize(a).map((t) => normalize(t, lang)),
    ),
  );

  const pool = new Map<string, string>();
  const recent = ctx.taughtUnits.slice(-4);
  for (const unit of recent) {
    for (const s of unit.sentences) {
      for (const tok of tileTokens(s[side], lexicon)) {
        const key = normalize(tok, lang);
        if (key && !blocked.has(key) && !pool.has(key)) pool.set(key, tok);
      }
    }
  }
  const extraCount = Math.min(answer.length <= 3 ? 3 : 4, 11 - answer.length);
  const extras = pick([...pool.values()], extraCount, ctx.rng);
  return shuffled(
    [...answer, ...extras].map((text, i) => ({ id: `t${i}-${text}`, text })),
    ctx.rng,
  );
}

function wordOptions(word: Word, pool: readonly Word[], ctx: Ctx, needEmoji: boolean): Word[] {
  const seenTarget = new Set([word.target]);
  const seenSource = new Set([word.source]);
  const others: Word[] = [];
  // Same part of speech first: choosing between a noun and a verb is too easy a tell.
  const ordered = [
    ...shuffled(pool.filter((w) => w.pos === word.pos), ctx.rng),
    ...shuffled(pool.filter((w) => w.pos !== word.pos), ctx.rng),
  ];
  for (const w of ordered) {
    if (w.id === word.id || seenTarget.has(w.target) || seenSource.has(w.source)) continue;
    if (needEmoji && (!w.emoji || w.emoji === word.emoji)) continue;
    // Words sharing a meaning would make two options correct.
    if (word.sourceAccept?.includes(w.source) || w.sourceAccept?.includes(word.source)) continue;
    seenTarget.add(w.target);
    seenSource.add(w.source);
    others.push(w);
    if (others.length === 3) break;
  }
  return shuffled([word, ...others], ctx.rng);
}

function wordCheck(word: Word, pool: readonly Word[], ctx: Ctx): Exercise | null {
  const pictures = word.emoji ? wordOptions(word, pool, ctx, true) : [];
  if (word.emoji && pictures.length >= 3) {
    return { kind: 'picture', key: ctx.nextKey(), word, options: pictures };
  }
  const options = wordOptions(word, pool, ctx, false);
  if (options.length < 3) return null;
  return { kind: 'wordChoice', key: ctx.nextKey(), word, options };
}

function listenChoice(word: Word, pool: readonly Word[], ctx: Ctx): Exercise | null {
  if (!ctx.opts.listenAvailable) return wordCheck(word, pool, ctx);
  const options = wordOptions(word, pool, ctx, false);
  if (options.length < 3) return null;
  return { kind: 'listenChoice', key: ctx.nextKey(), word, options };
}

function matchPairs(words: readonly Word[], ctx: Ctx): Exercise | null {
  const uniqueT = new Set<string>();
  const uniqueS = new Set<string>();
  const chosen: Word[] = [];
  for (const w of shuffled(words, ctx.rng)) {
    if (uniqueT.has(w.target) || uniqueS.has(w.source)) continue;
    uniqueT.add(w.target);
    uniqueS.add(w.source);
    chosen.push(w);
    if (chosen.length === 5) break;
  }
  if (chosen.length < 3) return null;
  return { kind: 'match', key: ctx.nextKey(), words: chosen };
}

function bank(sentence: Sentence, direction: 'toTarget' | 'toSource', ctx: Ctx): Exercise {
  const side = direction === 'toTarget' ? 'target' : 'source';
  return {
    kind: 'bank',
    key: ctx.nextKey(),
    direction,
    sentence,
    tiles: buildTiles(sentence, side, ctx),
  };
}

function listenBank(sentence: Sentence, ctx: Ctx): Exercise {
  if (!ctx.opts.listenAvailable) return bank(sentence, 'toTarget', ctx);
  return {
    kind: 'listenBank',
    key: ctx.nextKey(),
    sentence,
    tiles: buildTiles(sentence, 'target', ctx),
  };
}

function cloze(sentence: Sentence, ctx: Ctx): Exercise | null {
  if (!sentence.cloze) return null;
  return {
    kind: 'cloze',
    key: ctx.nextKey(),
    sentence,
    options: shuffled([sentence.cloze.answer, ...sentence.cloze.distractors], ctx.rng),
  };
}

function speak(sentence: Sentence, ctx: Ctx): Exercise | null {
  if (!ctx.opts.speakAvailable) return null;
  return { kind: 'speak', key: ctx.nextKey(), sentence };
}

function typeOrListen(sentence: Sentence, ctx: Ctx, listen: boolean): Exercise {
  if (listen && ctx.opts.listenAvailable) {
    return { kind: 'listenType', key: ctx.nextKey(), sentence };
  }
  return {
    kind: 'type',
    key: ctx.nextKey(),
    direction: ctx.rng() < 0.65 ? 'toTarget' : 'toSource',
    sentence,
  };
}

function compact(items: (Exercise | null)[]): Exercise[] {
  return items.filter((e): e is Exercise => e !== null);
}

/* ------------------------------- Recipes ------------------------------- */

function halves<T>(items: readonly T[]): [T[], T[]] {
  const mid = Math.ceil(items.length / 2);
  return [items.slice(0, mid), items.slice(mid)];
}

/** Sentences built only from words the learner has met. */
function usable(sentences: readonly Sentence[], known: ReadonlySet<string>): Sentence[] {
  return sentences.filter((s) => s.words.every((id) => known.has(id)));
}

function wordsLesson(unit: Unit, index: 0 | 1, ctx: Ctx): Exercise[] {
  const [firstHalf, secondHalf] = halves(unit.words);
  const fresh = index === 0 ? firstHalf : secondHalf;
  const priorInUnit = index === 0 ? [] : firstHalf;
  const earlier = ctx.taughtUnits.filter((u) => u.id !== unit.id).flatMap((u) => u.words);
  const pool = [...fresh, ...priorInUnit, ...earlier];

  const out: (Exercise | null)[] = [];
  for (const word of fresh) {
    out.push({ kind: 'intro', key: ctx.nextKey(), word });
    out.push(wordCheck(word, pool, ctx));
  }
  out.push(matchPairs(fresh.length >= 3 ? fresh : [...fresh, ...priorInUnit, ...earlier], ctx));

  const known = new Set(
    [...fresh, ...priorInUnit, ...earlier].map((w) => w.id),
  );
  const sentences = pick(usable(unit.sentences, known), 3, ctx.rng);
  sentences.forEach((s, i) => out.push(bank(s, i % 2 === 0 ? 'toSource' : 'toTarget', ctx)));

  const recall = pick(fresh, 2, ctx.rng);
  for (const word of recall) out.push(listenChoice(word, pool, ctx));
  return compact(out);
}

function sentencesLesson(unit: Unit, ctx: Ctx): Exercise[] {
  const chosen = pick(unit.sentences, 8, ctx.rng);
  const pool = ctx.taughtUnits.flatMap((u) => u.words);
  const out: (Exercise | null)[] = [matchPairs(unit.words, ctx)];
  chosen.forEach((s, i) => {
    if (s.cloze && i % 3 === 2) out.push(cloze(s, ctx));
    else out.push(bank(s, i % 2 === 0 ? 'toTarget' : 'toSource', ctx));
  });
  const word = pick(unit.words, 2, ctx.rng);
  word.forEach((w) => out.push(wordCheck(w, pool, ctx)));
  return compact(out);
}

function listeningLesson(unit: Unit, ctx: Ctx): Exercise[] {
  const chosen = pick(unit.sentences, 8, ctx.rng);
  const pool = ctx.taughtUnits.flatMap((u) => u.words);
  const out: (Exercise | null)[] = pick(unit.words, 3, ctx.rng).map((w) =>
    listenChoice(w, pool, ctx),
  );
  chosen.forEach((s, i) => {
    if (i % 4 === 3) out.push(speak(s, ctx) ?? listenBank(s, ctx));
    else if (i % 3 === 2) out.push(typeOrListen(s, ctx, true));
    else out.push(listenBank(s, ctx));
  });
  return compact(out);
}

function reviewLesson(unit: Unit, ctx: Ctx): Exercise[] {
  const chosen = pick(unit.sentences, 9, ctx.rng);
  const out: (Exercise | null)[] = [matchPairs(unit.words, ctx)];
  chosen.forEach((s, i) => {
    if (s.cloze && i % 3 === 0) out.push(cloze(s, ctx));
    else if (i % 3 === 1) out.push(typeOrListen(s, ctx, false));
    else if (i % 3 === 2) out.push(typeOrListen(s, ctx, true));
    else out.push(bank(s, 'toTarget', ctx));
  });
  const last = chosen[chosen.length - 1];
  if (last) out.push(speak(last, ctx));
  return compact(out);
}

function checkpointLesson(section: Section, ctx: Ctx): Exercise[] {
  const sentences = pick(section.units.flatMap((u) => u.sentences), 16, ctx.rng);
  const words = section.units.flatMap((u) => u.words);
  const out: (Exercise | null)[] = [matchPairs(words, ctx)];
  sentences.forEach((s, i) => {
    if (s.cloze && i % 4 === 0) out.push(cloze(s, ctx));
    else if (i % 4 === 1) out.push(typeOrListen(s, ctx, true));
    else if (i % 4 === 2) out.push(typeOrListen(s, ctx, false));
    else out.push(listenBank(s, ctx));
  });
  out.push(matchPairs(words, ctx));
  return compact(out);
}

function passagesLesson(unit: Unit, ctx: Ctx): Exercise[] {
  return (unit.passages ?? []).flatMap((passage) =>
    passage.questions.map((question): Exercise => ({
      kind: 'passage',
      key: ctx.nextKey(),
      passage,
      question,
      options: shuffled(question.options, ctx.rng),
      showText: passage.kind === 'reading' || !ctx.opts.listenAvailable,
    })),
  );
}

export function generateLesson(
  course: Course,
  node: PathNode,
  rng: Rng,
  opts: GenerateOptions,
): Exercise[] {
  // Exams have their own screen and rules, not a generated lesson.
  if (node.kind === 'exam') return [];
  if (node.kind === 'checkpoint') {
    const section = course.sections.find((s) => s.id === node.sectionId);
    if (!section) return [];
    const lastUnit = section.units[section.units.length - 1];
    const taught = lastUnit ? unitsThrough(course, lastUnit.id) : [];
    return checkpointLesson(section, makeCtx(course, taught, rng, opts));
  }
  const found = node.unitId ? findUnit(course, node.unitId) : null;
  if (!found) return [];
  const ctx = makeCtx(course, unitsThrough(course, found.unit.id), rng, opts);
  switch (node.kind) {
    case 'words':
      return wordsLesson(found.unit, node.lessonIndex === 0 ? 0 : 1, ctx);
    case 'sentences':
      return sentencesLesson(found.unit, ctx);
    case 'listening':
      return listeningLesson(found.unit, ctx);
    case 'review':
      return reviewLesson(found.unit, ctx);
    case 'passages':
      return passagesLesson(found.unit, ctx);
  }
}

/** A practice session over specific words, typically those spaced repetition says are due. */
export function generatePractice(
  course: Course,
  wordIds: readonly string[],
  rng: Rng,
  opts: GenerateOptions,
  mode: 'mixed' | 'listening' = 'mixed',
): Exercise[] {
  const units = course.sections.flatMap((s) => s.units);
  const byId = new Map(units.flatMap((u) => u.words).map((w) => [w.id, w]));
  const words = wordIds.map((id) => byId.get(id)).filter((w): w is Word => !!w);
  if (words.length === 0) return [];
  const wanted = new Set(words.map((w) => w.id));

  // Only units the learner has reached supply distractors and sentences.
  let lastReached = 0;
  units.forEach((u, i) => {
    if (u.words.some((w) => wanted.has(w.id))) lastReached = i;
  });
  const reached = units.slice(0, lastReached + 1);
  const ctx = makeCtx(course, reached, rng, opts);
  const pool = reached.flatMap((u) => u.words);

  const known = new Set(pool.map((w) => w.id));
  const related = usable(
    reached.flatMap((u) => u.sentences).filter((s) => s.words.some((id) => wanted.has(id))),
    known,
  );

  const out: (Exercise | null)[] = [];
  for (const w of pick(words, 8, rng)) {
    out.push(mode === 'listening' ? listenChoice(w, pool, ctx) : wordCheck(w, pool, ctx));
  }
  out.push(matchPairs(words.length >= 3 ? words : pool, ctx));
  pick(related, 5, rng).forEach((s, i) => {
    if (mode === 'listening') out.push(i % 2 ? typeOrListen(s, ctx, true) : listenBank(s, ctx));
    else if (s.cloze && i % 2) out.push(cloze(s, ctx));
    else out.push(i % 2 ? typeOrListen(s, ctx, false) : bank(s, 'toTarget', ctx));
  });
  return shuffled(compact(out), rng);
}

/** The words an exercise tests, for spaced-repetition grading. */
export function wordsTested(ex: Exercise): string[] {
  switch (ex.kind) {
    case 'intro':
    case 'passage':
      return [];
    case 'picture':
    case 'wordChoice':
    case 'listenChoice':
      return [ex.word.id];
    case 'match':
      return ex.words.map((w) => w.id);
    default:
      return ex.sentence.words;
  }
}
