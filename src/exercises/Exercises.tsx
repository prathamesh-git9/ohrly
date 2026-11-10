import { Mic, MicOff } from 'lucide-react';
import { LayoutGroup, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buzz, sfx } from '../audio/sfx';
import { canRecognizeSpeech, listen, speak, type Listening } from '../audio/speech';
import { Character, speakerFor } from '../components/Cast';
import { Fenn } from '../components/Fenn';
import { Btn, HintText, SpeakerButton } from '../components/ui';
import { checkAnswer, speechScore, tokenize, type Verdict } from '../domain/check';
import type { Glossary } from '../domain/course';
import type { Course, Exercise, Passage, Sentence, Tile, Word } from '../domain/types';
import type { Translate } from '../i18n';

export interface ExerciseContext {
  course: Course;
  t: Translate;
  /** True once the answer is submitted: inputs freeze until the next exercise. */
  locked: boolean;
  glossary: Glossary;
  targetKnown: ReadonlySet<string>;
  sourceKnown: ReadonlySet<string>;
  /** Registers how to grade the current answer, or null when there is no answer yet. */
  setSubmit: (submit: (() => Verdict) | null) => void;
  /** For exercises that finish themselves. */
  complete: (result: { mistakes: number; skipped?: boolean }) => void;
  onMiss: () => void;
  disableSpeaking: () => void;
}

type Props<K extends Exercise['kind']> = { ex: Extract<Exercise, { kind: K }>; ctx: ExerciseContext };

function useAutoplay(text: string | null, ctx: ExerciseContext) {
  const lang = ctx.course.to;
  useEffect(() => {
    if (text) void speak(text, lang);
    // Only when a new exercise appears, never when the answer state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
}

function Prompt({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <>
      <h2 className="ex-title">{title}</h2>
      {children}
    </>
  );
}

/** Speech bubble beside Fenn: the mascot gives the sentence, not a text box. */
function Bubble({
  children,
  mood,
  sentence,
}: {
  children: React.ReactNode;
  mood?: 'idle' | 'think';
  /** When set, a member of the cast says it instead of Fenn, mouth moving while it plays. */
  sentence?: Sentence;
}) {
  return (
    <div className="bubble-row">
      {sentence ? (
        <Character id={speakerFor(sentence.id, sentence.target)} size={96} line={sentence.target} />
      ) : (
        <Fenn size={92} mood={mood ?? 'idle'} />
      )}
      <motion.div
        className="bubble"
        initial={{ scale: 0.6, opacity: 0, x: -14 }}
        animate={{ scale: 1, opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 520, damping: 26, delay: 0.08 }}
        style={{ transformOrigin: '0% 80%' }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/* ------------------------------- Intro ------------------------------- */

export function IntroEx({ ex, ctx }: Props<'intro'>) {
  useAutoplay(ex.word.target, ctx);
  const { setSubmit } = ctx;
  useEffect(() => {
    setSubmit(() => ({ result: 'correct' }));
    return () => setSubmit(null);
  }, [setSubmit]);
  return (
    <div className="ex-intro">
      <h2 className="ex-title ex-title-accent">{ctx.t('newWord')}</h2>
      <motion.div
        className="intro-card"
        initial={{ scale: 0.85, opacity: 0, rotate: -2 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
      >
        {ex.word.emoji && <div className="intro-emoji">{ex.word.emoji}</div>}
        <div className="intro-target">
          {ex.word.target}
          <SpeakerButton text={ex.word.target} lang={ctx.course.to} size="sm" />
        </div>
        <div className="intro-source">{ex.word.source}</div>
        {ex.word.plural && <div className="intro-note">Pl. {ex.word.plural}</div>}
        {ex.word.note && <div className="intro-note">{ex.word.note}</div>}
      </motion.div>
    </div>
  );
}

/* --------------------------- Option exercises --------------------------- */

function useOptionKeys(count: number, locked: boolean, choose: (i: number) => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (locked) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= count) choose(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, locked, choose]);
}

function useChoice(
  options: readonly Word[],
  correct: Word,
  ctx: ExerciseContext,
  speakOnPick: boolean,
) {
  const [picked, setPicked] = useState<number | null>(null);
  const { setSubmit, course } = ctx;
  const choose = useCallback(
    (i: number) => {
      setPicked(i);
      sfx.tap();
      if (speakOnPick) void speak(options[i]!.target, course.to);
    },
    [options, speakOnPick, course.to],
  );
  useEffect(() => {
    if (picked === null) return setSubmit(null);
    setSubmit(() =>
      options[picked]!.id === correct.id
        ? { result: 'correct' }
        : { result: 'wrong', expected: `${correct.target} = ${correct.source}` },
    );
  }, [picked, options, correct, setSubmit]);
  useOptionKeys(options.length, ctx.locked, choose);
  return { picked, choose };
}

export function PictureEx({ ex, ctx }: Props<'picture'>) {
  const { picked, choose } = useChoice(ex.options, ex.word, ctx, true);
  return (
    <div>
      <Prompt title={ctx.t('selectPicture')}>
        <p className="ex-prompt">{ex.word.source}</p>
      </Prompt>
      <div className={`pic-grid pic-grid-${ex.options.length}`}>
        {ex.options.map((w, i) => (
          <button
            type="button"
            key={w.id}
            disabled={ctx.locked}
            className={`card-option pic-card${picked === i ? ' is-picked' : ''}${
              ctx.locked && w.id === ex.word.id ? ' is-answer' : ''
            }`}
            onClick={() => choose(i)}
          >
            <span className="pic-emoji">{w.emoji}</span>
            <span className="pic-label">{w.target}</span>
            <span className="key-hint">{i + 1}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function OptionList({
  labels,
  picked,
  answerIndex,
  locked,
  onPick,
}: {
  labels: string[];
  picked: number | null;
  answerIndex: number;
  locked: boolean;
  onPick: (i: number) => void;
}) {
  return (
    <div className="option-list">
      {labels.map((label, i) => (
        <button
          type="button"
          key={label}
          disabled={locked}
          className={`card-option${picked === i ? ' is-picked' : ''}${
            locked && i === answerIndex ? ' is-answer' : ''
          }`}
          onClick={() => onPick(i)}
        >
          <span className="key-hint key-hint-inline">{i + 1}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

export function WordChoiceEx({ ex, ctx }: Props<'wordChoice'>) {
  useAutoplay(ex.word.target, ctx);
  const { picked, choose } = useChoice(ex.options, ex.word, ctx, false);
  return (
    <div>
      <Prompt title={ctx.t('selectMeaning')} />
      <Bubble>
        <span className="bubble-speak">
          <SpeakerButton text={ex.word.target} lang={ctx.course.to} size="sm" />
          <strong>{ex.word.target}</strong>
        </span>
      </Bubble>
      <OptionList
        labels={ex.options.map((w) => w.source)}
        picked={picked}
        answerIndex={ex.options.findIndex((w) => w.id === ex.word.id)}
        locked={ctx.locked}
        onPick={choose}
      />
    </div>
  );
}

export function ListenChoiceEx({ ex, ctx }: Props<'listenChoice'>) {
  useAutoplay(ex.word.target, ctx);
  const { picked, choose } = useChoice(ex.options, ex.word, ctx, false);
  return (
    <div>
      <Prompt title={ctx.t('whatDidYouHear')} />
      <div className="listen-stage">
        <SpeakerButton
          text={ex.word.target}
          lang={ctx.course.to}
          withSlow
          slowLabel={ctx.t('slow')}
        />
      </div>
      <OptionList
        labels={ex.options.map((w) => w.source)}
        picked={picked}
        answerIndex={ex.options.findIndex((w) => w.id === ex.word.id)}
        locked={ctx.locked}
        onPick={choose}
      />
    </div>
  );
}

/* -------------------------------- Match --------------------------------- */

export function MatchEx({ ex, ctx }: Props<'match'>) {
  const columns = useMemo(() => {
    // Display order is derived from the id, so a re-render can never reshuffle the columns.
    const byHash = (salt: string) => (a: Word, b: Word) =>
      hash(a.id + salt) - hash(b.id + salt);
    return {
      left: [...ex.words].sort(byHash('L')),
      right: [...ex.words].sort(byHash('R')),
    };
  }, [ex.words]);
  const [selected, setSelected] = useState<{ side: 'L' | 'R'; id: string } | null>(null);
  const [done, setDone] = useState<ReadonlySet<string>>(new Set());
  const [flash, setFlash] = useState<{ left: string; right: string; ok: boolean } | null>(null);
  const mistakes = useRef(0);
  const { complete, onMiss, course } = ctx;

  const tap = (side: 'L' | 'R', word: Word) => {
    if (done.has(word.id) || flash) return;
    if (side === 'L') void speak(word.target, course.to);
    if (!selected || selected.side === side) {
      setSelected({ side, id: word.id });
      if (side === 'R') sfx.tap();
      return;
    }
    const left = side === 'L' ? word.id : selected.id;
    const right = side === 'R' ? word.id : selected.id;
    const ok = left === right;
    setFlash({ left, right, ok });
    setSelected(null);
    if (ok) {
      sfx.match();
      buzz(10);
    } else {
      sfx.wrong();
      mistakes.current++;
      onMiss();
    }
    window.setTimeout(
      () => {
        setFlash(null);
        if (!ok) return;
        setDone((prev) => {
          const next = new Set(prev).add(word.id);
          if (next.size === ex.words.length) {
            window.setTimeout(() => complete({ mistakes: mistakes.current }), 260);
          }
          return next;
        });
      },
      ok ? 260 : 480,
    );
  };

  const stateClass = (side: 'L' | 'R', word: Word) => {
    if (done.has(word.id)) return ' is-done';
    if (flash && (side === 'L' ? flash.left : flash.right) === word.id) {
      return flash.ok ? ' is-right' : ' is-wrong';
    }
    return selected?.side === side && selected.id === word.id ? ' is-picked' : '';
  };

  return (
    <div>
      <Prompt title={ctx.t('matchPairs')} />
      <LayoutGroup>
        <div className="match-grid">
          <div className="match-col">
            {columns.left.map((w) => (
              <button
                type="button"
                key={w.id}
                disabled={done.has(w.id)}
                className={`card-option match-card${stateClass('L', w)}`}
                onClick={() => tap('L', w)}
              >
                {w.target}
              </button>
            ))}
          </div>
          <div className="match-col">
            {columns.right.map((w) => (
              <button
                type="button"
                key={w.id}
                disabled={done.has(w.id)}
                className={`card-option match-card${stateClass('R', w)}`}
                onClick={() => tap('R', w)}
              >
                {w.source}
              </button>
            ))}
          </div>
        </div>
      </LayoutGroup>
    </div>
  );
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/* ---------------------------- Word-bank tiles ---------------------------- */

const tileSpring = { type: 'spring', stiffness: 620, damping: 38, mass: 0.7 } as const;

function TileBoard({
  tiles,
  answer,
  setAnswer,
  locked,
  speakLang,
}: {
  tiles: readonly Tile[];
  answer: readonly string[];
  setAnswer: (next: string[]) => void;
  locked: boolean;
  speakLang?: Course['to'];
}) {
  const byId = useMemo(() => new Map(tiles.map((t) => [t.id, t])), [tiles]);
  const used = new Set(answer);

  const add = (t: Tile) => {
    if (locked) return;
    setAnswer([...answer, t.id]);
    sfx.place();
    if (speakLang) void speak(t.text, speakLang);
  };
  const remove = (id: string) => {
    if (locked) return;
    setAnswer(answer.filter((a) => a !== id));
    sfx.remove();
  };

  return (
    <LayoutGroup>
      <div className="tile-answer" aria-label="Your answer">
        {answer.map((id) => {
          const t = byId.get(id);
          return t ? (
            <motion.button
              type="button"
              key={id}
              layoutId={id}
              className="tile"
              transition={tileSpring}
              onClick={() => remove(id)}
            >
              {t.text}
            </motion.button>
          ) : null;
        })}
      </div>
      <div className="tile-bank">
        {tiles.map((t) => (
          <span className="tile-slot" key={t.id}>
            <span className="tile tile-ghost" aria-hidden="true">
              {t.text}
            </span>
            {!used.has(t.id) && (
              <motion.button
                type="button"
                layoutId={t.id}
                className="tile tile-live"
                transition={tileSpring}
                onClick={() => add(t)}
              >
                {t.text}
              </motion.button>
            )}
          </span>
        ))}
      </div>
    </LayoutGroup>
  );
}

function useTileAnswer(
  tiles: readonly Tile[],
  accepted: readonly string[],
  lang: Course['to'],
  ctx: ExerciseContext,
) {
  const [answer, setAnswer] = useState<string[]>([]);
  const { setSubmit } = ctx;
  useEffect(() => {
    if (answer.length === 0) return setSubmit(null);
    const text = answer.map((id) => tiles.find((t) => t.id === id)?.text ?? '').join(' ');
    setSubmit(() => checkAnswer(text, accepted, lang, { allowTypos: false }));
  }, [answer, tiles, accepted, lang, setSubmit]);
  return [answer, setAnswer] as const;
}

function targetAccepted(s: Sentence): string[] {
  return [s.target, ...(s.targetAccept ?? [])];
}
function sourceAccepted(s: Sentence): string[] {
  return [s.source, ...(s.sourceAccept ?? [])];
}

export function BankEx({ ex, ctx }: Props<'bank'>) {
  const toTarget = ex.direction === 'toTarget';
  const { sentence } = ex;
  useAutoplay(toTarget ? null : sentence.target, ctx);
  const accepted = useMemo(
    () => (toTarget ? targetAccepted(sentence) : sourceAccepted(sentence)),
    [toTarget, sentence],
  );
  const lang = toTarget ? ctx.course.to : ctx.course.from;
  const [answer, setAnswer] = useTileAnswer(ex.tiles, accepted, lang, ctx);
  return (
    <div>
      <Prompt title={ctx.t('translateSentence')} />
      <Bubble sentence={sentence}>
        {toTarget ? (
          <HintText text={sentence.source} gloss={ctx.glossary.source} />
        ) : (
          <span className="bubble-speak">
            <SpeakerButton text={sentence.target} lang={ctx.course.to} size="sm" />
            <HintText
              text={sentence.target}
              gloss={ctx.glossary.target}
              speakLang={ctx.course.to}
            />
          </span>
        )}
      </Bubble>
      <TileBoard
        tiles={ex.tiles}
        answer={answer}
        setAnswer={setAnswer}
        locked={ctx.locked}
        speakLang={toTarget ? ctx.course.to : undefined}
      />
    </div>
  );
}

export function ListenBankEx({ ex, ctx }: Props<'listenBank'>) {
  const { sentence } = ex;
  useAutoplay(sentence.target, ctx);
  const accepted = useMemo(() => [sentence.target], [sentence]);
  const [answer, setAnswer] = useTileAnswer(ex.tiles, accepted, ctx.course.to, ctx);
  return (
    <div>
      <Prompt title={ctx.t('tapWhatYouHear')} />
      <div className="listen-stage">
        <SpeakerButton text={sentence.target} lang={ctx.course.to} withSlow slowLabel={ctx.t('slow')} />
      </div>
      <TileBoard tiles={ex.tiles} answer={answer} setAnswer={setAnswer} locked={ctx.locked} />
    </div>
  );
}

/* ------------------------------- Typing ------------------------------- */

const SPECIAL_KEYS: Partial<Record<Course['to'], string[]>> = {
  de: ['ä', 'ö', 'ü', 'ß'],
};

function TypeBox({
  value,
  setValue,
  locked,
  placeholder,
  lang,
}: {
  value: string;
  setValue: (v: string) => void;
  locked: boolean;
  placeholder: string;
  lang: Course['to'];
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  const insert = (ch: string) => {
    const el = ref.current;
    if (!el) return setValue(value + ch);
    const start = el.selectionStart;
    const end = el.selectionEnd;
    setValue(value.slice(0, start) + ch + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + ch.length, start + ch.length);
    });
    sfx.tap();
  };
  return (
    <div className="type-wrap">
      <textarea
        ref={ref}
        className="type-box"
        lang={lang}
        rows={3}
        value={value}
        disabled={locked}
        placeholder={placeholder}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          // Enter submits; the lesson's window listener handles it.
          if (e.key === 'Enter') e.preventDefault();
        }}
      />
      {SPECIAL_KEYS[lang] && (
        <div className="special-keys">
          {SPECIAL_KEYS[lang]!.map((ch) => (
            <button
              type="button"
              key={ch}
              className="special-key"
              disabled={locked}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insert(ch)}
            >
              {ch}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function useTypedAnswer(
  accepted: readonly string[],
  lang: Course['to'],
  known: ReadonlySet<string>,
  ctx: ExerciseContext,
) {
  const [value, setValue] = useState('');
  const { setSubmit } = ctx;
  useEffect(() => {
    if (value.trim().length === 0) return setSubmit(null);
    setSubmit(() => checkAnswer(value, accepted, lang, { knownTokens: known }));
  }, [value, accepted, lang, known, setSubmit]);
  return [value, setValue] as const;
}

export function TypeEx({ ex, ctx }: Props<'type'>) {
  const toTarget = ex.direction === 'toTarget';
  const { sentence } = ex;
  useAutoplay(toTarget ? null : sentence.target, ctx);
  const accepted = useMemo(
    () => (toTarget ? targetAccepted(sentence) : sourceAccepted(sentence)),
    [toTarget, sentence],
  );
  const lang = toTarget ? ctx.course.to : ctx.course.from;
  const [value, setValue] = useTypedAnswer(
    accepted,
    lang,
    toTarget ? ctx.targetKnown : ctx.sourceKnown,
    ctx,
  );
  return (
    <div>
      <Prompt title={ctx.t('typeTranslation')} />
      <Bubble sentence={sentence}>
        {toTarget ? (
          <HintText text={sentence.source} gloss={ctx.glossary.source} />
        ) : (
          <span className="bubble-speak">
            <SpeakerButton text={sentence.target} lang={ctx.course.to} size="sm" />
            <HintText text={sentence.target} gloss={ctx.glossary.target} speakLang={ctx.course.to} />
          </span>
        )}
      </Bubble>
      <TypeBox value={value} setValue={setValue} locked={ctx.locked} placeholder={ctx.t('typeHere')} lang={lang} />
    </div>
  );
}

export function ListenTypeEx({ ex, ctx }: Props<'listenType'>) {
  const { sentence } = ex;
  useAutoplay(sentence.target, ctx);
  const accepted = useMemo(() => [sentence.target], [sentence]);
  const [value, setValue] = useTypedAnswer(accepted, ctx.course.to, ctx.targetKnown, ctx);
  return (
    <div>
      <Prompt title={ctx.t('typeWhatYouHear')} />
      <div className="listen-stage">
        <SpeakerButton text={sentence.target} lang={ctx.course.to} withSlow slowLabel={ctx.t('slow')} />
      </div>
      <TypeBox value={value} setValue={setValue} locked={ctx.locked} placeholder={ctx.t('typeHere')} lang={ctx.course.to} />
    </div>
  );
}

/* ------------------------------- Cloze -------------------------------- */

export function ClozeEx({ ex, ctx }: Props<'cloze'>) {
  const { sentence, options } = ex;
  const [picked, setPicked] = useState<number | null>(null);
  const answer = sentence.cloze!.answer;
  const { setSubmit, course } = ctx;
  const choose = useCallback(
    (i: number) => {
      setPicked(i);
      sfx.tap();
    },
    [],
  );
  useOptionKeys(options.length, ctx.locked, choose);
  useEffect(() => {
    if (picked === null) return setSubmit(null);
    setSubmit(() =>
      options[picked] === answer
        ? { result: 'correct' }
        : { result: 'wrong', expected: sentence.target },
    );
  }, [picked, options, answer, sentence.target, setSubmit]);
  useEffect(() => {
    if (ctx.locked) void speak(sentence.target, course.to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.locked]);

  const parts = sentence.target.split(/(\s+)/);
  return (
    <div>
      <Prompt title={ctx.t('fillBlank')}>
        <p className="ex-sub">{sentence.source}</p>
      </Prompt>
      <div className="cloze-line" lang={course.to}>
        {parts.map((part, i) => {
          const token = tokenize(part)[0];
          // The validator compares without case, so a sentence-initial answer must still blank out.
          if (token?.toLowerCase() !== answer.toLowerCase()) return <span key={i}>{part}</span>;
          const trailing = part.slice(part.indexOf(token) + token.length);
          return (
            <span key={i}>
              <span className={`cloze-gap${picked !== null ? ' is-filled' : ''}`}>
                {picked !== null ? options[picked] : ' '}
              </span>
              {trailing}
            </span>
          );
        })}
      </div>
      <OptionList
        labels={[...options]}
        picked={picked}
        answerIndex={options.indexOf(answer)}
        locked={ctx.locked}
        onPick={choose}
      />
    </div>
  );
}

/* ------------------------------ Passages ------------------------------ */

export function PassageEx({ ex, ctx }: Props<'passage'>) {
  const { passage, question, options, showText } = ex;
  const [picked, setPicked] = useState<number | null>(null);
  const { setSubmit, t, course } = ctx;
  const choose = useCallback((i: number) => {
    setPicked(i);
    sfx.tap();
  }, []);
  useOptionKeys(options.length, ctx.locked, choose);
  useEffect(() => {
    if (picked === null) return setSubmit(null);
    setSubmit(() =>
      options[picked] === question.answer
        ? { result: 'correct' }
        : { result: 'wrong', expected: question.answer },
    );
  }, [picked, options, question, setSubmit]);
  return (
    <div>
      <Prompt title={passage.kind === 'reading' ? t('readingTitle') : t('listeningTitle')} />
      <PassageBody passage={passage} lang={course.to} t={t} showText={showText || ctx.locked} />
      <p className="passage-q">{question.q}</p>
      <OptionList
        labels={[...options]}
        picked={picked}
        answerIndex={options.indexOf(question.answer)}
        locked={ctx.locked}
        onPick={choose}
      />
    </div>
  );
}

export function PassageBody({
  passage,
  lang,
  t,
  showText,
}: {
  passage: Passage;
  lang: Course['to'];
  t: Translate;
  showText: boolean;
}) {
  return (
    <>
      {passage.kind === 'listening' && (
        <div className="listen-stage">
          <SpeakerButton text={passage.text} lang={lang} withSlow slowLabel={t('slow')} />
        </div>
      )}
      {showText && (
        <article className="passage" lang={lang}>
          <h3>{passage.title}</h3>
          {passage.text.split(/\n\s*\n/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </article>
      )}
    </>
  );
}

/* ------------------------------- Speak -------------------------------- */

export function SpeakEx({ ex, ctx }: Props<'speak'>) {
  const { sentence } = ex;
  useAutoplay(sentence.target, ctx);
  const [state, setState] = useState<'idle' | 'listening' | 'denied'>('idle');
  const [heard, setHeard] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const session = useRef<Listening | null>(null);
  const { setSubmit, complete, course, t, disableSpeaking } = ctx;

  useEffect(() => () => session.current?.stop(), []);

  const start = () => {
    if (!canRecognizeSpeech()) return complete({ mistakes: 0, skipped: true });
    setState('listening');
    setMessage(null);
    setHeard('');
    let latest = '';
    session.current = listen(
      course.to,
      (text) => {
        latest = text;
        setHeard(text);
      },
      (error) => {
        session.current = null;
        if (error === 'not-allowed' || error === 'service-not-allowed') {
          setState('denied');
          setMessage(t('micDenied'));
          return;
        }
        setState('idle');
        if (!latest) {
          setMessage(t('micNothing'));
          return;
        }
        // Speaking is forgiving by design: recognizers mishear, and an accent is not a mistake.
        if (speechScore(latest, sentence.target, course.to) >= 0.6) {
          setSubmit(() => ({ result: 'correct' }));
          setMessage(t('micHeard', { text: latest }));
        } else {
          setMessage(`${t('micHeard', { text: latest })} ${t('micNothing')}`);
        }
      },
    );
    if (!session.current) {
      setState('denied');
      setMessage(t('micDenied'));
    }
  };

  return (
    <div>
      <Prompt title={t('speakThis')} />
      <Bubble sentence={sentence}>
        <span className="bubble-speak">
          <SpeakerButton text={sentence.target} lang={course.to} size="sm" />
          <HintText text={sentence.target} gloss={ctx.glossary.target} speakLang={course.to} />
        </span>
      </Bubble>
      <div className="speak-stage">
        <button
          type="button"
          className={`mic-btn${state === 'listening' ? ' is-listening' : ''}`}
          disabled={ctx.locked || state === 'denied'}
          onClick={() => (state === 'listening' ? session.current?.stop() : start())}
        >
          {state === 'denied' ? <MicOff /> : <Mic />}
          <span>{state === 'listening' ? t('listeningNow') : t('tapToSpeak')}</span>
        </button>
        {state === 'listening' && heard && <p className="mic-heard">{heard}</p>}
        {message && <p className="mic-heard">{message}</p>}
        <p className="mic-privacy">{t('micPrivacy')}</p>
        {!ctx.locked && (
          <Btn
            variant="ghost"
            onClick={() => {
              disableSpeaking();
              complete({ mistakes: 0, skipped: true });
            }}
          >
            {t('cantSpeak')}
          </Btn>
        )}
      </div>
    </div>
  );
}

export function ExerciseView({ ex, ctx }: { ex: Exercise; ctx: ExerciseContext }) {
  switch (ex.kind) {
    case 'intro':
      return <IntroEx ex={ex} ctx={ctx} />;
    case 'picture':
      return <PictureEx ex={ex} ctx={ctx} />;
    case 'wordChoice':
      return <WordChoiceEx ex={ex} ctx={ctx} />;
    case 'listenChoice':
      return <ListenChoiceEx ex={ex} ctx={ctx} />;
    case 'match':
      return <MatchEx ex={ex} ctx={ctx} />;
    case 'bank':
      return <BankEx ex={ex} ctx={ctx} />;
    case 'listenBank':
      return <ListenBankEx ex={ex} ctx={ctx} />;
    case 'type':
      return <TypeEx ex={ex} ctx={ctx} />;
    case 'listenType':
      return <ListenTypeEx ex={ex} ctx={ctx} />;
    case 'cloze':
      return <ClozeEx ex={ex} ctx={ctx} />;
    case 'speak':
      return <SpeakEx ex={ex} ctx={ctx} />;
    case 'passage':
      return <PassageEx ex={ex} ctx={ctx} />;
  }
}

