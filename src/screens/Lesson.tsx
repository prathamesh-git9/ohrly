import { Check, Flag as FlagIcon, Flame, Heart, HeartCrack, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buzz, sfx } from '../audio/sfx';
import { canRecognizeSpeech, preloadVoice, speak, stopSpeech } from '../audio/speech';
import { Fenn } from '../components/Fenn';
import { Btn, Modal, ProgressBar, SpeakerButton } from '../components/ui';
import type { Verdict } from '../domain/check';
import {
  buildGlossary,
  buildPath,
  findUnit,
  sourceVocabulary,
  targetVocabulary,
  unitsThrough,
} from '../domain/course';
import { HEART_REFILL_COST, msUntilNextHeart } from '../domain/gamify';
import { generateLesson, generatePractice, mulberry32, scaffold, wordsTested } from '../domain/generator';
import { dueWords, weakWords } from '../domain/srs';
import type { Course, Exercise } from '../domain/types';
import { ExerciseView, type ExerciseContext } from '../exercises/Exercises';
import type { Translate } from '../i18n';
import { navigate } from '../router';
import { useProgress, useStore, type LessonSummary } from '../state/store';
import { Complete } from './Complete';

export type LessonSpec =
  | { type: 'node'; nodeId: string }
  | { type: 'practice'; mode: 'due' | 'weak' | 'listening' };

const REQUEUE_GAP = 3;
const MAX_REQUEUES = 2;

interface Slot {
  ex: Exercise;
  /** React key: differs on a re-queue so the exercise resets. */
  id: string;
  requeues: number;
}

function buildExercises(
  course: Course,
  spec: LessonSpec,
  cards: ReturnType<typeof useProgress>['cards'],
  opts: { speakAvailable: boolean; listenAvailable: boolean },
): Exercise[] {
  const rng = mulberry32(Date.now() & 0xffffffff);
  if (spec.type === 'node') {
    const node = buildPath(course).find((n) => n.id === spec.nodeId);
    const dueWordIds = dueWords(cards, Date.now(), 20);
    return node ? generateLesson(course, node, rng, { ...opts, dueWordIds }) : [];
  }
  const now = Date.now();
  let ids =
    spec.mode === 'due'
      ? dueWords(cards, now)
      : spec.mode === 'weak'
        ? weakWords(cards)
        : Object.keys(cards).slice(-12);
  // A learner with nothing due can still always practise, which is how a heart is earned back.
  if (ids.length === 0) ids = Object.keys(cards).slice(-12);
  return generatePractice(course, ids, rng, opts, spec.mode === 'listening' ? 'listening' : 'mixed');
}

export function Lesson({ course, spec, t }: { course: Course; spec: LessonSpec; t: Translate }) {
  const store = useStore;
  const hearts = useStore((s) => s.hearts);
  const gems = useStore((s) => s.gems);
  const settings = useStore((s) => s.settings);
  const progress = useProgress(course.id);
  const isPractice = spec.type === 'practice';

  const [slots, setSlots] = useState<Slot[]>(() =>
    buildExercises(course, spec, progress.cards, {
      speakAvailable: settings.speaking && canRecognizeSpeech(),
      listenAvailable: settings.listening,
    }).map((ex) => ({ ex, id: ex.key, requeues: 0 })),
  );
  const [total] = useState(slots.length);
  const [pos, setPos] = useState(0);
  const [done, setDone] = useState(0);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [canSubmit, setCanSubmit] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [outOfHearts, setOutOfHearts] = useState(!isPractice && hearts.count <= 0);
  const [summary, setSummary] = useState<LessonSummary | null>(null);
  const [praise, setPraise] = useState('');
  /** Correct answers in a row, for the combo banner. */
  const [, setCombo] = useState(0);
  const [comboShown, setComboShown] = useState<number | null>(null);
  /** Bumped on each lost heart, to replay the breaking animation. */
  const [heartBreaks, setHeartBreaks] = useState(0);

  const submitRef = useRef<(() => Verdict) | null>(null);
  const mistakes = useRef(0);
  const startedAt = useRef(Date.now());
  const seconds = useRef(0);

  useEffect(() => {
    preloadVoice(course.to);
    return () => stopSpeech();
  }, [course.to]);

  const slot = slots[pos];
  const nodeId = spec.type === 'node' ? spec.nodeId : null;

  const glossary = useMemo(() => {
    if (spec.type !== 'node') return buildGlossary(course.sections.flatMap((s) => s.units));
    const unitId = spec.nodeId.split(':')[0]!;
    const units = findUnit(course, unitId)
      ? unitsThrough(course, unitId)
      : course.sections.flatMap((s) => s.units);
    return buildGlossary(units);
  }, [course, spec]);
  const targetKnown = useMemo(() => targetVocabulary(course), [course]);
  const sourceKnown = useMemo(() => sourceVocabulary(course), [course]);

  const setSubmit = useCallback((fn: (() => Verdict) | null) => {
    submitRef.current = fn;
    setCanSubmit(fn !== null);
  }, []);

  const finish = useCallback(() => {
    seconds.current = Math.round((Date.now() - startedAt.current) / 1000);
    const s = store.getState();
    const result = isPractice
      ? s.finishPractice({
          courseId: course.id,
          total,
          mistakes: mistakes.current,
          seconds: seconds.current,
        })
      : s.finishLesson({
          courseId: course.id,
          nodeId,
          total,
          mistakes: mistakes.current,
          seconds: seconds.current,
          isCheckpoint: nodeId?.endsWith(':checkpoint') ?? false,
        });
    sfx.complete();
    buzz([12, 35, 12]);
    setSummary(result);
  }, [store, isPractice, course.id, total, nodeId]);

  const advance = useCallback(() => {
    setVerdict(null);
    setCanSubmit(false);
    submitRef.current = null;
    setPos((p) => p + 1);
  }, []);

  // Slots can grow (re-queues) or shrink (speaking turned off), so the end is checked here. The
  // ref keeps StrictMode's doubled effects from paying out a lesson's rewards twice.
  const finished = useRef(false);
  useEffect(() => {
    if (slots.length > 0 && pos >= slots.length && !finished.current) {
      finished.current = true;
      finish();
    }
  }, [pos, slots.length, finish]);

  const loseHeartAndCheck = useCallback(() => {
    if (isPractice) return;
    setHeartBreaks((n) => n + 1);
    const s = store.getState();
    s.mistake();
    if (store.getState().hearts.count <= 0) setOutOfHearts(true);
  }, [isPractice, store]);

  const check = useCallback(() => {
    if (!slot || !submitRef.current) return;
    if (slot.ex.kind === 'intro') {
      // Nothing to grade on a new-word card, so no feedback step: straight on to the next one.
      sfx.tap();
      setDone((d) => d + 1);
      advance();
      return;
    }
    const v = submitRef.current();
    setVerdict(v);
    const ids = wordsTested(slot.ex);
    const s = store.getState();
    if (v.result === 'wrong') {
      setCombo(0);
      sfx.wrong();
      mistakes.current++;
      s.gradeWords(course.id, ids, false);
      loseHeartAndCheck();
      if (slot.requeues < MAX_REQUEUES) {
        const again: Slot = {
          // It comes back one step easier: a missed typing task returns as word tiles.
          ex: scaffold(slot.ex, course, mulberry32(pos + 1)),
          id: `${slot.ex.key}-r${slot.requeues + 1}`,
          requeues: slot.requeues + 1,
        };
        setSlots((list) => {
          const at = Math.min(list.length, pos + 1 + REQUEUE_GAP);
          return [...list.slice(0, at), again, ...list.slice(at)];
        });
      } else {
        // Asked three times now. Showing the answer is the lesson; stop blocking on it.
        setDone((d) => d + 1);
      }
    } else {
      sfx.correct();
      buzz(10);
      setCombo((c) => {
        const next = c + 1;
        if (next === 3 || next === 5 || next === 10 || (next > 10 && next % 5 === 0)) {
          setComboShown(next);
          window.setTimeout(() => setComboShown(null), 1600);
          window.setTimeout(() => sfx.streak(), 250);
        }
        return next;
      });
      const lines = t('praise').split('|');
      setPraise(lines[Math.floor(Math.random() * lines.length)]!);
      s.gradeWords(course.id, ids, true);
      setDone((d) => d + 1);
    }
    // After a translation into the target language, hear the sentence said properly.
    const ex = slot.ex;
    if (
      v.result !== 'wrong' &&
      (ex.kind === 'bank' || ex.kind === 'type') &&
      ex.direction === 'toTarget'
    ) {
      void speak(ex.sentence.target, course.to);
    }
  }, [slot, store, course.id, course.to, pos, t, loseHeartAndCheck, advance]);

  const onSelfComplete = useCallback<ExerciseContext['complete']>(
    ({ mistakes: m, skipped }) => {
      if (slot && !skipped) {
        store.getState().gradeWords(course.id, wordsTested(slot.ex), m === 0);
      }
      setDone((d) => d + 1);
      advance();
    },
    [slot, store, course.id, advance],
  );

  const onMiss = useCallback(() => {
    mistakes.current++;
    loseHeartAndCheck();
  }, [loseHeartAndCheck]);

  const disableSpeaking = useCallback(() => {
    store.getState().updateSettings({ speaking: false });
    // Drop the later speaking tasks too, without changing the current one.
    setSlots((list) => list.filter((s, i) => i <= pos || s.ex.kind !== 'speak'));
  }, [store, pos]);

  // Enter is check and continue, on every exercise.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || summary || confirmQuit || outOfHearts) return;
      e.preventDefault();
      if (verdict) advance();
      else if (canSubmit) check();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [verdict, canSubmit, summary, confirmQuit, outOfHearts, advance, check]);

  if (summary) {
    return (
      <Complete
        summary={summary}
        total={total}
        seconds={seconds.current}
        isPractice={isPractice}
        t={t}
        onDone={() => navigate(isPractice ? '/practice' : '/')}
      />
    );
  }

  if (!slot && slots.length > 0) return null;

  if (!slot) {
    return (
      <div className="center-screen">
        <Fenn mood="think" />
        <p>{t('noExercises')}</p>
        <Btn onClick={() => navigate('/')}>{t('back')}</Btn>
      </div>
    );
  }

  const isIntro = slot.ex.kind === 'intro';
  const selfDriven = slot.ex.kind === 'match';
  const ctx: ExerciseContext = {
    course,
    t,
    locked: verdict !== null,
    glossary,
    targetKnown,
    sourceKnown,
    setSubmit,
    complete: onSelfComplete,
    onMiss,
    disableSpeaking,
  };

  const footerTone =
    verdict === null ? '' : verdict.result === 'wrong' ? ' is-wrong' : ' is-right';

  return (
    <div className="lesson">
      <header className="lesson-top">
        <button
          type="button"
          className="icon-btn"
          aria-label={t('quit')}
          onClick={() => setConfirmQuit(true)}
        >
          <X strokeWidth={3} />
        </button>
        <ProgressBar value={Math.min(1, done / Math.max(1, total))} />
        {!isPractice && (
          <div className="heart-slot">
            <motion.div
              className="stat stat-hearts"
              key={hearts.count}
              initial={heartBreaks ? { x: 0, rotate: 0 } : false}
              animate={heartBreaks ? { x: [0, -5, 5, -3, 3, 0], rotate: [0, -8, 8, 0] } : {}}
              transition={{ duration: 0.45 }}
            >
              <Heart fill="currentColor" strokeWidth={2} />
              <span>{hearts.count}</span>
            </motion.div>
            <AnimatePresence>
              {heartBreaks > 0 && (
                <motion.span
                  key={heartBreaks}
                  className="heart-break"
                  initial={{ y: 0, opacity: 1, scale: 1 }}
                  animate={{ y: 46, opacity: 0, scale: 1.5, rotate: 18 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                  aria-hidden="true"
                >
                  <HeartCrack fill="currentColor" strokeWidth={1.6} />
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        )}
      </header>

      <AnimatePresence>
        {comboShown && (
          <motion.div
            className="combo"
            key={comboShown}
            initial={{ y: -30, scale: 0.5, opacity: 0, x: '-50%' }}
            animate={{ y: 0, scale: 1, opacity: 1, x: '-50%' }}
            exit={{ y: -20, opacity: 0, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 520, damping: 18 }}
            role="status"
          >
            <motion.span
              animate={{ rotate: [-10, 10, -10], scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 0.5 }}
              className="combo-flame"
            >
              <Flame fill="currentColor" />
            </motion.span>
            {t('combo', { n: comboShown })}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="lesson-body">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={slot.id}
            className="lesson-stage"
            initial={{ x: 28, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -24, opacity: 0, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.9 }}
          >
            <ExerciseView ex={slot.ex} ctx={ctx} />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className={`lesson-foot${footerTone}`}>
        <AnimatePresence>
          {verdict && (
            <motion.div
              className="feedback"
              role="status"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 12, opacity: 0, transition: { duration: 0.14 } }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            >
              <FeedbackBody verdict={verdict} slot={slot} praise={praise} course={course} t={t} />
            </motion.div>
          )}
        </AnimatePresence>
        <div className="foot-row">
          {verdict ? (
            <Btn
              block
              variant={verdict.result !== 'wrong' ? 'good' : 'bad'}
              onClick={advance}
            >
              {verdict.result === 'wrong' ? t('gotIt') : t('continue')}
            </Btn>
          ) : isIntro ? (
            <Btn block variant="good" onClick={check}>
              {t('continue')}
            </Btn>
          ) : selfDriven ? (
            <span />
          ) : (
            <Btn block quiet variant="good" disabled={!canSubmit} onClick={check}>
              {t('check')}
            </Btn>
          )}
        </div>
      </footer>

      <AnimatePresence>
        {confirmQuit && (
          <Modal onClose={() => setConfirmQuit(false)}>
            <Fenn mood="sad" size={100} />
            <h3>{t('quitTitle')}</h3>
            <p>{t('quitBody')}</p>
            <Btn block onClick={() => setConfirmQuit(false)}>
              {t('keepLearning')}
            </Btn>
            <Btn block variant="ghost" onClick={() => navigate('/')}>
              {t('endLesson')}
            </Btn>
          </Modal>
        )}
        {outOfHearts && (
          <NoHearts
            t={t}
            nextIn={msUntilNextHeart(hearts, Date.now())}
            canRefill={gems >= HEART_REFILL_COST}
            onRefill={() => {
              if (store.getState().refillHearts()) setOutOfHearts(false);
            }}
            onPractice={() => navigate('/lesson-practice/due')}
            onLeave={() => navigate('/')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function expectedMeaning(slot: Slot): string | null {
  const ex = slot.ex;
  if (ex.kind === 'bank' || ex.kind === 'type') {
    return ex.direction === 'toTarget' ? ex.sentence.source : ex.sentence.target;
  }
  if (ex.kind === 'listenBank' || ex.kind === 'listenType' || ex.kind === 'cloze') {
    return ex.sentence.source;
  }
  return null;
}

function FeedbackBody({
  verdict,
  slot,
  praise,
  course,
  t,
}: {
  verdict: Verdict;
  slot: Slot;
  praise: string;
  course: Course;
  t: Translate;
}) {
  const ex = slot.ex;
  const note = 'sentence' in ex ? ex.sentence.note : 'word' in ex ? ex.word.note : undefined;
  const speakText =
    verdict.result === 'wrong' && 'sentence' in ex ? ex.sentence.target : null;
  const meaning = expectedMeaning(slot);

  if (verdict.result === 'correct') {
    return (
      <div className="fb-head">
        <span className="fb-icon"><Check strokeWidth={4} /></span>
        <div>
          <strong className="fb-title">{praise}</strong>
          {meaning && (
            <p className="fb-line">
              {t('meaning')} {meaning}
            </p>
          )}
        </div>
      </div>
    );
  }
  if (verdict.result === 'typo') {
    return (
      <div className="fb-head">
        <span className="fb-icon"><Check strokeWidth={4} /></span>
        <div>
          <strong className="fb-title">
            {verdict.reason === 'umlaut' ? t('umlautTitle') : t('typoTitle')}
          </strong>
          <p className="fb-line fb-answer">{verdict.expected}</p>
        </div>
      </div>
    );
  }
  const reportUrl =
    'sentence' in ex
      ? `https://github.com/prathamesh-git9/ohrly/issues/new?title=${encodeURIComponent(
          `Answer report: ${course.id} ${ex.sentence.id}`,
        )}&body=${encodeURIComponent(
          `Exercise: ${ex.kind}\nSentence: ${ex.sentence.target} / ${ex.sentence.source}\n\nI think this answer should be accepted: `,
        )}`
      : null;
  return (
    <div className="fb-head">
      <span className="fb-icon"><X strokeWidth={4} /></span>
      <div>
        <strong className="fb-title">{t('wrongTitle')}</strong>
        <p className="fb-line fb-label">{t('correctAnswer')}</p>
        <p className="fb-line fb-answer">
          {verdict.expected}
          {speakText && <SpeakerButton text={speakText} lang={course.to} size="sm" />}
        </p>
        {meaning && meaning !== verdict.expected && (
          <p className="fb-line">
            {t('meaning')} {meaning}
          </p>
        )}
        {note && <p className="fb-line">{note}</p>}
        {reportUrl && (
          <a className="fb-report" href={reportUrl} target="_blank" rel="noreferrer">
            <FlagIcon size={14} /> {t('reportAnswer')}
          </a>
        )}
      </div>
    </div>
  );
}

function formatWait(ms: number | null): string {
  if (ms === null) return '';
  const mins = Math.ceil(ms / 60000);
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
}

export function NoHearts({
  t,
  nextIn,
  canRefill,
  onRefill,
  onPractice,
  onLeave,
}: {
  t: Translate;
  nextIn: number | null;
  canRefill: boolean;
  onRefill: () => void;
  onPractice: () => void;
  onLeave: () => void;
}) {
  return (
    <Modal>
      <Fenn mood="sad" size={110} />
      <h3>{t('noHeartsTitle')}</h3>
      <p>{t('noHeartsBody')}</p>
      {nextIn !== null && <p className="muted">{t('nextHeart', { t: formatWait(nextIn) })}</p>}
      <Btn block onClick={onPractice}>
        {t('practiceForHeart')}
      </Btn>
      <Btn block variant="gold" disabled={!canRefill} onClick={onRefill}>
        {t('refillWithGems', { n: HEART_REFILL_COST })}
      </Btn>
      <Btn block variant="ghost" onClick={onLeave}>
        {t('notNow')}
      </Btn>
    </Modal>
  );
}
