/**
 * The course contract. Course files in src/content/courses/*.json must match this exactly;
 * scripts/validate-courses.ts enforces it plus the teaching rules on top.
 *
 * "target" is always the language being learned, "source" the language the learner knows.
 * So in en-de, target is German. In de-en, target is English.
 */
export type LangCode = 'en' | 'de' | 'es' | 'fr' | 'it' | 'hi';

export interface Word {
  /** Unique within the course, for example "de-hund". Stable: progress is keyed on it. */
  id: string;
  /** As taught, with the article for German nouns: "der Hund". */
  target: string;
  source: string;
  /** Other correct target-language answers when the source is the prompt. */
  targetAccept?: string[];
  /** Other correct source-language answers when the target is the prompt. */
  sourceAccept?: string[];
  /**
   * Inflected forms this entry also teaches, which sentences may then use: for "sein", the forms
   * bin, bist, ist, sind, seid. Forms are not accepted as translations of the word itself.
   */
  forms?: string[];
  /** Plural as taught, for nouns in languages where it is unpredictable: "die Hunde". */
  plural?: string;
  /** Only when a single emoji really does depict the word. Enables picture exercises. */
  emoji?: string;
  pos: 'noun' | 'verb' | 'adj' | 'adv' | 'pron' | 'prep' | 'det' | 'conj' | 'phrase' | 'num' | 'other';
  note?: string;
}

/** A fill-the-gap question: `answer` appears exactly once as a token of the target sentence. */
export interface Cloze {
  answer: string;
  /** Exactly 2 or 3 wrong options. Each must be wrong in this sentence. */
  distractors: string[];
}

export interface Sentence {
  id: string;
  target: string;
  source: string;
  /** Every other natural correct translation. The checker has no other way to know them. */
  targetAccept?: string[];
  sourceAccept?: string[];
  /** Ids of the course words this sentence uses. Decides when it can appear. */
  words: string[];
  cloze?: Cloze;
  note?: string;
}

export interface Tip {
  title: string;
  /** Written in the source language. Paragraphs split by a blank line. `**bold**` allowed. */
  body: string;
  examples: { target: string; source: string }[];
}

export interface Unit {
  id: string;
  title: string;
  /** Learner-facing, in the source language: "Say hello and introduce yourself". */
  canDo: string;
  tip: Tip;
  words: Word[];
  sentences: Sentence[];
  /** Reading and listening texts with questions. Required from A2 up. */
  passages?: Passage[];
}

/** A question with one defensible key. `answer` must be exactly one of `options`. */
export interface Question {
  q: string;
  options: string[];
  answer: string;
}

export interface Passage {
  id: string;
  kind: 'reading' | 'listening';
  title: string;
  /** In the target language. Listening texts are spoken and shown only after answering. */
  text: string;
  questions: Question[];
}

/** One gap, in the target language, marked with ___ . */
export interface LanguageItem {
  id: string;
  text: string;
  options: string[];
  answer: string;
}

/** Writing and speaking cannot be machine-marked, so these are never scored. */
export interface SelfCheckTask {
  id: string;
  kind: 'writing' | 'speaking';
  prompt: string;
  model: string;
  checklist: string[];
}

export interface LevelExam {
  level: string;
  reading: Passage[];
  listening: Passage[];
  language: LanguageItem[];
  production: SelfCheckTask[];
}

/** A chapter on the path. */
export interface Section {
  id: string;
  title: string;
  cefr: string;
  description: string;
  units: Unit[];
}

export interface Course {
  id: string;
  from: LangCode;
  to: LangCode;
  title: string;
  version: number;
  /** Names that may appear in sentences without being taught: Anna, Berlin. */
  names?: string[];
  sections: Section[];
  exams?: LevelExam[];
}

/* ------------------------------ Exercises ------------------------------ */

export interface Tile {
  /** Unique within an exercise so repeated words animate independently. */
  id: string;
  text: string;
}

export type Exercise =
  | { kind: 'intro'; key: string; word: Word }
  | { kind: 'picture'; key: string; word: Word; options: Word[] }
  | { kind: 'wordChoice'; key: string; word: Word; options: Word[] }
  | { kind: 'listenChoice'; key: string; word: Word; options: Word[] }
  | { kind: 'match'; key: string; words: Word[] }
  | {
      kind: 'bank';
      key: string;
      direction: 'toTarget' | 'toSource';
      sentence: Sentence;
      tiles: Tile[];
    }
  | { kind: 'listenBank'; key: string; sentence: Sentence; tiles: Tile[] }
  | { kind: 'type'; key: string; direction: 'toTarget' | 'toSource'; sentence: Sentence }
  | { kind: 'listenType'; key: string; sentence: Sentence }
  | { kind: 'cloze'; key: string; sentence: Sentence; options: string[] }
  | { kind: 'speak'; key: string; sentence: Sentence }
  | { kind: 'passage'; key: string; passage: Passage; question: Question; options: string[]; showText: boolean };

export type ExerciseKind = Exercise['kind'];

/* -------------------------------- Path --------------------------------- */

export type NodeKind = 'words' | 'sentences' | 'listening' | 'review' | 'passages' | 'checkpoint' | 'exam';

export interface PathNode {
  /** "unitId:0" or "sectionId:checkpoint". Stable: progress is keyed on it. */
  id: string;
  kind: NodeKind;
  sectionId: string;
  unitId: string | null;
  lessonIndex: number;
}
