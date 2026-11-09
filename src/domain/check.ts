import type { LangCode } from './types';

/**
 * Answer checking. The rule that matters most: forgiving typos must never forgive grammar.
 * "den" and "dem" are one keystroke apart and mean different things, so a token only counts
 * as a typo when it is not itself a real word the learner could have meant.
 */

export type Verdict =
  | { result: 'correct' }
  /** Accepted, but the learner should see what they should have written. */
  | { result: 'typo'; expected: string; reason: 'typo' | 'umlaut' }
  | { result: 'wrong'; expected: string };

const EN_CONTRACTIONS: [RegExp, string][] = [
  [/\bi'm\b/g, 'i am'],
  [/\byou're\b/g, 'you are'],
  [/\bwe're\b/g, 'we are'],
  [/\bthey're\b/g, 'they are'],
  [/\bhe's\b/g, 'he is'],
  [/\bshe's\b/g, 'she is'],
  [/\bit's\b/g, 'it is'],
  [/\bthat's\b/g, 'that is'],
  [/\bwhat's\b/g, 'what is'],
  [/\bwho's\b/g, 'who is'],
  [/\bwhere's\b/g, 'where is'],
  [/\bthere's\b/g, 'there is'],
  [/\bisn't\b/g, 'is not'],
  [/\baren't\b/g, 'are not'],
  [/\bwasn't\b/g, 'was not'],
  [/\bweren't\b/g, 'were not'],
  [/\bdon't\b/g, 'do not'],
  [/\bdoesn't\b/g, 'does not'],
  [/\bdidn't\b/g, 'did not'],
  [/\bcan't\b/g, 'can not'],
  [/\bcannot\b/g, 'can not'],
  [/\bwon't\b/g, 'will not'],
  [/\bi've\b/g, 'i have'],
  [/\bwe've\b/g, 'we have'],
  [/\byou've\b/g, 'you have'],
  [/\bthey've\b/g, 'they have'],
  [/\bi'll\b/g, 'i will'],
  [/\bi'd\b/g, 'i would'],
];

/** Function words whose letters carry grammar. Never treated as a typo of one another. */
const PROTECTED: Partial<Record<LangCode, Set<string>>> = {
  de: new Set(
    `der die das den dem des ein eine einen einem einer eines kein keine keinen keinem keiner
     mein meine meinen meinem meiner dein deine deinen deinem deiner sein seine seinen seinem
     seiner ihr ihre ihren ihrem ihrer unser unsere unseren unserem euer eure euren eurem
     ich du er sie es wir mich dich ihn ihm uns euch
     bin bist ist sind seid war hat habe hast habt haben
     in im an am auf aus bei mit nach von vom zu zum zur`.split(/\s+/),
  ),
  en: new Set(
    `a an the this that these those i you he she it we they me him her us them his my your
     our their is am are was were has have had do does did in on at to of for from`.split(/\s+/),
  ),
};

export function normalize(text: string, lang: LangCode): string {
  let s = text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[.,!?;:"“”„«»¿¡()]/g, ' ')
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (lang === 'en') {
    for (const [re, full] of EN_CONTRACTIONS) s = s.replace(re, full);
  }
  return s;
}

/** Folds spelling a keyboard may not offer: ä to ae, ß to ss. */
function foldGerman(s: string): string {
  return s
    .replace(/ß/g, 'ss')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue');
}

/** Damerau-Levenshtein distance, but gives up early above 2, which is all we ever ask. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 3;
  const d: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i++) d[i]![0] = i;
  for (let j = 0; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, d[i - 2]![j - 2]! + 1);
      }
      d[i]![j] = best;
    }
  }
  return d[a.length]![b.length]!;
}

export interface CheckOptions {
  /** Every real word the course teaches, normalized. A real word is never a typo. */
  knownTokens?: ReadonlySet<string>;
  /** Off for word-bank answers, where a typo is impossible. */
  allowTypos?: boolean;
}

function isTypoOf(given: string, expected: string, lang: LangCode, known?: ReadonlySet<string>) {
  if (given === expected) return true;
  if (PROTECTED[lang]?.has(given) || PROTECTED[lang]?.has(expected)) return false;
  if (known?.has(given)) return false;
  if (expected.length < 4) return false;
  const allowed = expected.length >= 8 ? 2 : 1;
  return editDistance(given, expected) <= allowed;
}

/**
 * @param accepted the primary answer first, then alternatives. Feedback shows accepted[0].
 */
export function checkAnswer(
  given: string,
  accepted: readonly string[],
  lang: LangCode,
  opts: CheckOptions = {},
): Verdict {
  const primary = accepted[0] ?? '';
  const answer = normalize(given, lang);
  const candidates = accepted.map((a) => normalize(a, lang));

  if (answer.length > 0 && candidates.includes(answer)) return { result: 'correct' };
  if (answer.length === 0 || opts.allowTypos === false) {
    return { result: 'wrong', expected: primary };
  }

  if (lang === 'de') {
    const folded = foldGerman(answer);
    for (let i = 0; i < candidates.length; i++) {
      if (foldGerman(candidates[i]!) === folded) {
        return { result: 'typo', expected: accepted[i]!, reason: 'umlaut' };
      }
    }
  }

  const tokens = answer.split(' ');
  for (let i = 0; i < candidates.length; i++) {
    const expected = candidates[i]!.split(' ');
    if (expected.length !== tokens.length) continue;
    const everyTokenClose = expected.every((tok, j) =>
      isTypoOf(tokens[j]!, tok, lang, opts.knownTokens),
    );
    if (everyTokenClose) return { result: 'typo', expected: accepted[i]!, reason: 'typo' };
  }
  return { result: 'wrong', expected: primary };
}

/** Speech recognition is looser: it mishears, so we ask for most of the words in order. */
export function speechScore(heard: string, expected: string, lang: LangCode): number {
  const h = normalize(heard, lang).split(' ').filter(Boolean);
  const e = normalize(expected, lang).split(' ').filter(Boolean);
  if (e.length === 0) return 0;
  let hit = 0;
  let from = 0;
  for (const tok of e) {
    for (let i = from; i < h.length; i++) {
      if (h[i] === tok || (tok.length >= 5 && editDistance(h[i]!, tok) <= 1)) {
        hit++;
        from = i + 1;
        break;
      }
    }
  }
  return hit / e.length;
}

/** Splits text into the pieces shown on word tiles and tap-for-hint words. */
export function tokenize(text: string): string[] {
  return text
    .split(/\s+/)
    .map((t) => t.replace(/^[.,!?;:"“”„«»¿¡()]+|[.,!?;:"“”„«»()]+$/g, ''))
    .filter(Boolean);
}
