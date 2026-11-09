import { editDistance, normalize, tokenize } from './check';
import type { Course, Passage, Question, Sentence, Unit, Word } from './types';

/**
 * Teaching rules a course must satisfy on top of its shape. Errors block the build; warnings
 * are for a human or auditor to look at. Keeping this strict is what makes bulk-written content
 * safe to accept.
 */
export interface Issue {
  level: 'error' | 'warning';
  where: string;
  message: string;
}

const LIMITS = {
  wordsPerUnit: [6, 14],
  sentencesPerUnit: [10, 30],
  clozePerUnit: 3,
  sentenceTokens: 12,
  sentencesPerWord: 2,
  /** The same wrong options again and again means the clozes were not really written. */
  distractorSetRepeats: 3,
} as const;

/** Longest sentence for a word bank, and passage word counts, rising with the level. */
const BY_LEVEL: Record<string, { tokens: number; reading: [number, number]; listening: [number, number] }> = {
  A1: { tokens: 12, reading: [15, 90], listening: [15, 80] },
  A2: { tokens: 12, reading: [50, 140], listening: [40, 120] },
  B1: { tokens: 16, reading: [110, 260], listening: [90, 230] },
  B2: { tokens: 20, reading: [180, 450], listening: [150, 340] },
};
/** Items in each scored section of a practice exam: reading, listening, language in context. */
const EXAM_ITEMS: Record<string, [number, number, number]> = {
  A1: [15, 15, 10],
  A2: [20, 20, 10],
  B1: [30, 30, 20],
  B2: [30, 30, 20],
};

const ARTICLES = new Set(['der', 'die', 'das', 'ein', 'eine', 'the', 'a', 'an', 'to']);

function str(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function hasEmojiPresentation(s: string): boolean {
  return /\p{Extended_Pictographic}/u.test(s);
}

export function validateCourse(course: Course): Issue[] {
  const issues: Issue[] = [];
  const err = (where: string, message: string) => issues.push({ level: 'error', where, message });
  const warn = (where: string, message: string) =>
    issues.push({ level: 'warning', where, message });

  if (!str(course.id) || course.id !== `${course.from}-${course.to}`) {
    err(course.id, 'course id must be "<from>-<to>"');
  }
  if (!Array.isArray(course.sections) || course.sections.length === 0) {
    err(course.id, 'course has no sections');
    return issues;
  }

  let currentLevel = 'A1';
  const ids = new Set<string>();
  const uniqueId = (id: unknown, where: string) => {
    if (!str(id)) return err(where, 'missing id');
    if (ids.has(id)) err(where, `duplicate id "${id}"`);
    ids.add(id);
  };

  const taughtWords = new Set<string>();
  const taughtTokens = new Set<string>();
  const seenTargetWord = new Map<string, string>();
  const seenSentence = new Map<string, string>();
  const seenTemplate = new Map<string, string>();
  const distractorSets = new Map<string, number>();
  const tokenOwners = new Map<string, Set<string>>();
  const wordTokens = new Map<string, Set<string>>();
  const names = new Set(
    (course.names ?? []).flatMap((n) => normalize(n, course.to).split(' ')).filter(Boolean),
  );

  for (const name of course.names ?? []) {
    for (const t of normalize(name, course.to).split(' ')) if (t) taughtTokens.add(t);
  }

  const learn = (word: Word) => {
    const own = new Set<string>();
    for (const form of [word.target, ...(word.targetAccept ?? []), ...(word.forms ?? []), word.plural ?? '']) {
      const tokens = normalize(form, course.to).split(' ').filter(Boolean);
      for (const t of tokens) {
        // The article of "der Hund" belongs to every noun, so it says nothing about this word.
        if (tokens.length > 1 && ARTICLES.has(t)) continue;
        own.add(t);
        if (!tokenOwners.has(t)) tokenOwners.set(t, new Set());
        tokenOwners.get(t)!.add(word.id);
      }
    }
    wordTokens.set(word.id, own);
    for (const form of [word.target, ...(word.targetAccept ?? []), ...(word.forms ?? []), word.plural ?? '']) {
      for (const t of normalize(form, course.to).split(' ')) if (t) taughtTokens.add(t);
    }
  };

  for (const section of course.sections) {
    uniqueId(section.id, 'section');
    if (!str(section.title) || !str(section.description) || !str(section.cefr)) {
      err(section.id, 'section needs title, description and cefr');
    }
    if (!Array.isArray(section.units) || section.units.length === 0) {
      err(section.id, 'section has no units');
      continue;
    }
    const level = section.cefr.slice(0, 2).toUpperCase();
    currentLevel = level;
    for (const unit of section.units) {
      validateUnit(unit);
      if (level !== 'A1' && !unit.passages?.some((x) => x.kind === 'reading')) {
        err(unit.id, 'needs a reading passage from A2 up');
      }
      if (level !== 'A1' && !unit.passages?.some((x) => x.kind === 'listening')) {
        err(unit.id, 'needs a listening passage from A2 up');
      }
      for (const passage of unit.passages ?? []) validatePassage(passage, `${unit.id}/${passage.id}`, level);
    }
  }

  function validateQuestion(q: Question, where: string) {
    if (!str(q.q)) err(where, 'question has no text');
    if (!Array.isArray(q.options) || q.options.length < 3 || q.options.length > 4) {
      return err(where, 'question needs 3 or 4 options');
    }
    if (new Set(q.options).size !== q.options.length) err(where, 'question repeats an option');
    if (!q.options.includes(q.answer)) err(where, `answer "${q.answer}" is not one of the options`);
    // The right answer standing out by length is a giveaway test-takers learn to exploit.
    const others = q.options.filter((o) => o !== q.answer).map((o) => o.length);
    if (others.length && q.answer.length > 2.5 * Math.max(...others, 12)) {
      err(where, 'the answer is far longer than every other option');
    }
  }

  function validatePassage(p: Passage, where: string, level: string) {
    uniqueId(p.id, where);
    if (!str(p.title) || !str(p.text)) return err(where, 'passage needs a title and text');
    const limits = BY_LEVEL[level] ?? BY_LEVEL.A1!;
    const count = tokenize(p.text).length;
    const [min, max] = p.kind === 'reading' ? limits.reading : limits.listening;
    if (count < min || count > max) {
      err(where, `${p.kind} passage has ${count} words, level ${level} needs ${min}-${max}`);
    }
    if (!Array.isArray(p.questions) || p.questions.length === 0) {
      return err(where, 'passage has no questions');
    }
    p.questions.forEach((q, i) => validateQuestion(q, `${where}/q${i + 1}`));
  }

  function validateUnit(unit: Unit) {
    const at = unit.id;
    uniqueId(unit.id, 'unit');
    if (!str(unit.title) || !str(unit.canDo)) err(at, 'unit needs title and canDo');
    if (!unit.tip || !str(unit.tip.title) || !str(unit.tip.body)) {
      err(at, 'unit needs a tip with title and body');
    } else if (!Array.isArray(unit.tip.examples) || unit.tip.examples.length === 0) {
      err(at, 'tip needs at least one example');
    }

    const [minW, maxW] = LIMITS.wordsPerUnit;
    if (!Array.isArray(unit.words) || unit.words.length < minW || unit.words.length > maxW) {
      err(at, `unit needs ${minW}-${maxW} words, has ${unit.words?.length ?? 0}`);
    }
    const [minS, maxS] = LIMITS.sentencesPerUnit;
    if (
      !Array.isArray(unit.sentences) ||
      unit.sentences.length < minS ||
      unit.sentences.length > maxS
    ) {
      err(at, `unit needs ${minS}-${maxS} sentences, has ${unit.sentences?.length ?? 0}`);
    }

    for (const word of unit.words ?? []) {
      const where = `${at}/${word.id}`;
      uniqueId(word.id, where);
      if (!str(word.target) || !str(word.source)) err(where, 'word needs target and source');
      if (!str(word.pos)) err(where, 'word needs pos');
      if (word.emoji !== undefined && !hasEmojiPresentation(word.emoji)) {
        err(where, 'emoji field is not an emoji');
      }
      if (course.to === 'de' && word.pos === 'noun') {
        const hasArticle = /^(der|die|das) /.test(word.target);
        if (!hasArticle) warn(where, `German noun without an article: "${word.target}"`);
        if (hasArticle && !word.plural) warn(where, `German noun without a plural: "${word.target}"`);
      }
      const key = normalize(word.target, course.to);
      const prior = seenTargetWord.get(key);
      if (prior) warn(where, `same target word as ${prior}`);
      seenTargetWord.set(key, word.id);
      taughtWords.add(word.id);
      learn(word);
    }

    let clozeCount = 0;
    for (const sentence of unit.sentences ?? []) {
      if (sentence.cloze) clozeCount++;
      validateSentence(unit, sentence);
    }
    if (clozeCount < LIMITS.clozePerUnit) {
      err(at, `unit needs at least ${LIMITS.clozePerUnit} cloze sentences, has ${clozeCount}`);
    }
    for (const word of unit.words ?? []) {
      const uses = (unit.sentences ?? []).filter((x) => x.words?.includes(word.id)).length;
      if (uses < LIMITS.sentencesPerWord) {
        err(`${at}/${word.id}`, `word is used by only ${uses} sentences of its unit, needs ${LIMITS.sentencesPerWord}`);
      }
    }
    // Word lessons need at least a few sentences that fit the words taught so far.
    const firstHalf = new Set(
      (unit.words ?? []).slice(0, Math.ceil((unit.words?.length ?? 0) / 2)).map((w) => w.id),
    );
    const unitIds = new Set((unit.words ?? []).map((w) => w.id));
    const earlyOk = (unit.sentences ?? []).filter((s) =>
      s.words?.every((id) => !unitIds.has(id) || firstHalf.has(id)),
    );
    if (earlyOk.length < 2) {
      warn(at, 'fewer than 2 sentences usable in the first word lesson');
    }
  }

  function validateSentence(unit: Unit, s: Sentence) {
    const where = `${unit.id}/${s.id}`;
    uniqueId(s.id, where);
    if (!str(s.target) || !str(s.source)) return err(where, 'sentence needs target and source');
    if (!Array.isArray(s.words) || s.words.length === 0) {
      return err(where, 'sentence lists no words');
    }
    for (const id of s.words) {
      if (!taughtWords.has(id)) err(where, `uses word "${id}" not taught by this unit or earlier`);
    }
    const unitWordIds = new Set(unit.words.map((w) => w.id));
    if (!s.words.some((id) => unitWordIds.has(id))) {
      err(where, 'sentence practises no word from its own unit');
    }

    const toks = tokenize(s.target);
    if (toks.length > (BY_LEVEL[currentLevel]?.tokens ?? LIMITS.sentenceTokens)) {
      err(where, `sentence too long for a word bank: ${toks.length} tokens`);
    }
    // No untaught vocabulary: every target word must be taught already, or this sentence
    // would quiz the learner on a word nobody showed them.
    const unknown = normalize(s.target, course.to)
      .split(' ')
      .filter((t) => t && !taughtTokens.has(t));
    if (unknown.length > 0) {
      err(where, `untaught target words: ${unknown.join(', ')} in "${s.target}"`);
    }

    const key = normalize(s.target, course.to);
    const prior = seenSentence.get(key);
    if (prior) err(where, `same sentence as ${prior}`);
    seenSentence.set(key, s.id);

    // "Anna likes bread" and "Ben likes bread" are one sentence, not two.
    const template = key
      .split(' ')
      .map((t) => (names.has(t) ? '#' : t))
      .join(' ');
    if (template.includes('#')) {
      const twin = seenTemplate.get(template);
      if (twin && twin !== key) err(where, `only a name differs from "${twin}"`);
      if (!twin) seenTemplate.set(template, key);
    }

    // The word list decides when a sentence may appear, so it has to be the truth.
    const sentenceTokens = new Set(key.split(' ').filter(Boolean));
    for (const id of s.words) {
      const own = wordTokens.get(id);
      if (own && ![...own].some((t) => sentenceTokens.has(t))) {
        err(where, `lists word "${id}" but "${s.target}" does not contain it`);
      }
    }
    const listed = new Set(s.words);
    for (const t of sentenceTokens) {
      const owners = tokenOwners.get(t);
      if (!owners || !unit.words.some((w) => owners.has(w.id))) continue;
      if (![...owners].some((id) => listed.has(id))) {
        err(where, `uses "${t}" from this unit but does not list its word`);
      }
    }

    for (const alt of s.targetAccept ?? []) {
      if (!str(alt)) err(where, 'blank targetAccept');
    }
    for (const alt of s.sourceAccept ?? []) {
      if (!str(alt)) err(where, 'blank sourceAccept');
    }

    if (s.cloze) {
      const answer = normalize(s.cloze.answer, course.to);
      const tokens = key.split(' ');
      const hits = tokens.filter((t) => t === answer).length;
      if (answer.includes(' ') || hits !== 1) {
        err(where, `cloze answer "${s.cloze.answer}" must be one token, once, in "${s.target}"`);
      }
      if (names.has(answer)) {
        err(where, `cloze blanks out the name "${s.cloze.answer}": that tests nothing`);
      }
      const d = s.cloze.distractors;
      if (!Array.isArray(d) || d.length < 2 || d.length > 3) {
        err(where, 'cloze needs 2 or 3 distractors');
      } else {
        const seen = new Set([answer]);
        for (const option of d) {
          const n = normalize(option, course.to);
          if (seen.has(n)) err(where, `cloze option "${option}" repeats another option`);
          seen.add(n);
          // An option must be a word the learner knows, or a variant of the answer that tests
          // its grammar (den/dem, goes/go). Random words give the answer away.
          const related = n.slice(0, 2) === answer.slice(0, 2) || editDistance(n, answer) <= 2;
          if (!taughtTokens.has(n) && !related) {
            err(where, `cloze option "${option}" is neither taught nor a variant of "${s.cloze.answer}"`);
          }
        }
        const setKey = [...d].map((o) => normalize(o, course.to)).sort().join('|');
        const repeats = (distractorSets.get(setKey) ?? 0) + 1;
        distractorSets.set(setKey, repeats);
        if (repeats > LIMITS.distractorSetRepeats) {
          err(where, `cloze options "${setKey}" used ${repeats} times in the course`);
        }
      }
    }
  }

  for (const exam of course.exams ?? []) {
    const where = `exam ${exam.level}`;
    const need = EXAM_ITEMS[exam.level];
    if (!need) {
      err(where, 'unknown level');
      continue;
    }
    if (!course.sections.some((x) => x.cefr.slice(0, 2).toUpperCase() === exam.level)) {
      err(where, 'exam for a level with no chapters');
    }
    const reading = exam.reading.flatMap((x) => x.questions).length;
    const listening = exam.listening.flatMap((x) => x.questions).length;
    if (reading !== need[0]) err(where, `needs ${need[0]} reading items, has ${reading}`);
    if (listening !== need[1]) err(where, `needs ${need[1]} listening items, has ${listening}`);
    if (exam.language.length !== need[2]) err(where, `needs ${need[2]} language items, has ${exam.language.length}`);
    for (const x of exam.reading) validatePassage(x, `${where}/${x.id}`, exam.level);
    for (const x of exam.listening) validatePassage(x, `${where}/${x.id}`, exam.level);
    for (const item of exam.language) {
      const at = `${where}/${item.id}`;
      uniqueId(item.id, at);
      if ((item.text.match(/_{3,}/g) ?? []).length !== 1) err(at, 'language item needs exactly one ___ gap');
      validateQuestion({ q: item.text, options: item.options, answer: item.answer }, at);
    }
    const kinds = new Set(exam.production.map((t) => t.kind));
    if (!kinds.has('writing') || !kinds.has('speaking')) err(where, 'needs a writing and a speaking self-check');
    for (const task of exam.production) {
      const at = `${where}/${task.id}`;
      uniqueId(task.id, at);
      if (!str(task.prompt) || !str(task.model)) err(at, 'task needs a prompt and a model answer');
      if (!Array.isArray(task.checklist) || task.checklist.length < 3) err(at, 'task needs at least 3 checklist points');
    }
  }

  return issues;
}
