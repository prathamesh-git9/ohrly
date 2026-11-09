import { GraduationCap, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '../audio/sfx';
import { preloadVoice, stopSpeech } from '../audio/speech';
import { Fenn } from '../components/Fenn';
import { Btn, Confetti, Modal, ProgressBar } from '../components/ui';
import { examFor } from '../content/exams';
import { mulberry32 } from '../domain/generator';
import { practiceTargetMet } from '../domain/levels';
import type { Course, LevelExam, Passage, SelfCheckTask } from '../domain/types';
import { OptionList, PassageBody } from '../exercises/Exercises';
import type { Translate, UiKey } from '../i18n';
import { navigate } from '../router';
import { useStore } from '../state/store';

type Section = 'reading' | 'listening' | 'language';

interface Item {
  id: string;
  section: Section;
  passage?: Passage;
  question: string;
  options: string[];
  answer: string;
}

const SECTION_LABEL: Record<Section, UiKey> = {
  reading: 'examSectionReading',
  listening: 'examSectionListening',
  language: 'examSectionLanguage',
};

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function buildExamItems(exam: LevelExam, rng: () => number): Item[] {
  const fromPassage = (section: Section) => (p: Passage) =>
    p.questions.map((q, i) => ({
      id: `${p.id}-${i}`,
      section,
      passage: p,
      question: q.q,
      options: shuffle(q.options, rng),
      answer: q.answer,
    }));
  return [
    ...exam.reading.flatMap(fromPassage('reading')),
    ...exam.listening.flatMap(fromPassage('listening')),
    ...exam.language.map((item) => ({
      id: item.id,
      section: 'language' as const,
      question: item.text,
      options: shuffle(item.options, rng),
      answer: item.answer,
    })),
  ];
}

export function Exam({ course, level, t }: { course: Course; level: string; t: Translate }) {
  const exam = course.exams?.find((e) => e.level === level);
  const finishExam = useStore((s) => s.finishExam);
  const items = useMemo(
    () => (exam ? buildExamItems(exam, mulberry32(Date.now() & 0xffffffff)) : []),
    [exam],
  );
  const [stage, setStage] = useState<'intro' | 'questions' | 'result'>('intro');
  const [pos, setPos] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const answers = useRef<boolean[]>([]);
  const [confirmQuit, setConfirmQuit] = useState(false);

  useEffect(() => {
    preloadVoice(course.to);
    return () => stopSpeech();
  }, [course.to]);

  const info = examFor(course, level);

  if (!exam || items.length === 0) {
    return (
      <div className="center-screen">
        <Fenn mood="think" />
        <p>{t('noExercises')}</p>
        <Btn onClick={() => navigate('/')}>{t('back')}</Btn>
      </div>
    );
  }

  const count = (section: Section) => items.filter((i) => i.section === section).length;

  if (stage === 'intro') {
    return (
      <div className="exam-intro">
        <Fenn mood="think" size={120} />
        <h1>
          {level} · {t('examTitle')}
        </h1>
        <p>{t('examIntroBody')}</p>
        <ul className="exam-sections">
          {(['reading', 'listening', 'language'] as const).map((s) => (
            <li key={s}>
              <strong>{t(SECTION_LABEL[s])}</strong>
              <span>{count(s)}</span>
            </li>
          ))}
        </ul>
        <p className="muted">{t('examSuggested', { n: info.minutes })}</p>
        <Btn block onClick={() => setStage('questions')}>
          {t('examBegin')}
        </Btn>
        <Btn block variant="ghost" onClick={() => navigate('/')}>
          {t('back')}
        </Btn>
      </div>
    );
  }

  if (stage === 'result') {
    return <ExamResult course={course} level={level} exam={exam} items={items} answers={answers.current} t={t} />;
  }

  const item = items[pos]!;
  const next = () => {
    if (picked === null) return;
    answers.current[pos] = item.options[picked] === item.answer;
    sfx.tap();
    setPicked(null);
    if (pos + 1 >= items.length) {
      const scores = sectionScores(items, answers.current);
      const percent = Math.round(
        (100 * (scores.reading.correct + scores.listening.correct + scores.language.correct)) / items.length,
      );
      finishExam({ courseId: course.id, level, percent, targetMet: practiceTargetMet(scores) });
      sfx.complete();
      setStage('result');
    } else {
      setPos(pos + 1);
    }
  };

  return (
    <div className="lesson">
      <header className="lesson-top">
        <button type="button" className="icon-btn" aria-label={t('quit')} onClick={() => setConfirmQuit(true)}>
          <X strokeWidth={3} />
        </button>
        <ProgressBar value={pos / items.length} color="var(--primary)" />
      </header>
      <main className="lesson-body">
        <p className="exam-count">
          {t(SECTION_LABEL[item.section])} · {t('examQuestion', { a: pos + 1, b: items.length })}
        </p>
        {item.passage && (
          // Keyed by passage: a listening clip stays put, and doesn't restart, between its questions.
          <div key={item.passage.id}>
            <PassageBody
              passage={item.passage}
              lang={course.to}
              t={t}
              showText={item.section === 'reading'}
            />
          </div>
        )}
        {item.section === 'language' && <p className="exam-count">{t('examChoose')}</p>}
        <p className="passage-q" lang={item.section === 'language' ? course.to : undefined}>
          {item.question}
        </p>
        <OptionList
          key={item.id}
          labels={item.options}
          picked={picked}
          answerIndex={-1}
          locked={false}
          onPick={(i) => {
            setPicked(i);
            sfx.tap();
          }}
        />
      </main>
      <footer className="lesson-foot">
        <div className="foot-row">
          <Btn block quiet disabled={picked === null} onClick={next}>
            {t('examNext')}
          </Btn>
        </div>
      </footer>
      <AnimatePresence>
        {confirmQuit && (
          <Modal onClose={() => setConfirmQuit(false)}>
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
      </AnimatePresence>
    </div>
  );
}

function sectionScores(items: readonly Item[], answers: readonly boolean[]) {
  const score = (section: Section) => {
    const indexes = items.flatMap((item, i) => (item.section === section ? [i] : []));
    return { correct: indexes.filter((i) => answers[i]).length, total: indexes.length };
  };
  return { reading: score('reading'), listening: score('listening'), language: score('language') };
}

function ExamResult({
  course,
  level,
  exam,
  items,
  answers,
  t,
}: {
  course: Course;
  level: string;
  exam: LevelExam;
  items: readonly Item[];
  answers: readonly boolean[];
  t: Translate;
}) {
  const scores = sectionScores(items, answers);
  const met = practiceTargetMet(scores);
  const percent = Math.round(
    (100 * (scores.reading.correct + scores.listening.correct + scores.language.correct)) / items.length,
  );
  return (
    <div className="exam-result">
      {met && <Confetti count={18} />}
      <Fenn mood={met ? 'cheer' : 'idle'} size={130} />
      <h1 className={met ? 'is-met' : undefined}>{met ? t('examMet') : t('examKeep')}</h1>
      <motion.div
        className="exam-percent"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      >
        {percent}%
      </motion.div>
      <div className="exam-scores">
        {(['reading', 'listening', 'language'] as const).map((s) => (
          <div className="exam-score" key={s}>
            <strong>{t(SECTION_LABEL[s])}</strong>
            <span>
              {scores[s].correct} / {scores[s].total}
            </span>
          </div>
        ))}
      </div>
      <p className="muted">{t('examRule')}</p>
      <div className="exam-disclaimer">
        <strong>{t('examDisclaimerTitle')}</strong>
        <span>{t('examDisclaimer')}</span>
      </div>

      <h2>
        <GraduationCap /> {t('examProduction')}
      </h2>
      <p className="muted">{t('examProductionBody')}</p>
      {exam.production.map((task) => (
        <SelfCheck key={task.id} task={task} lang={course.to} t={t} />
      ))}
      <Btn block onClick={() => navigate('/')}>
        {t('examDone')}
      </Btn>
      <span className="muted">{level}</span>
    </div>
  );
}

function SelfCheck({ task, lang, t }: { task: SelfCheckTask; lang: Course['to']; t: Translate }) {
  const [show, setShow] = useState(false);
  return (
    <section className="task">
      <strong>{t(task.kind === 'writing' ? 'examWriting' : 'examSpeaking')}</strong>
      <p>{task.prompt}</p>
      {task.kind === 'writing' ? (
        <textarea className="type-box" rows={5} lang={lang} placeholder={t('examWriteHere')} aria-label={t('examWriteHere')} />
      ) : (
        <p className="muted">{t('examSayIt')}</p>
      )}
      {show ? (
        <>
          <div className="task-model" lang={lang}>
            {task.model}
          </div>
          <ul>
            {task.checklist.map((point) => (
              <li key={point}>
                <label>
                  <input type="checkbox" /> <span>{point}</span>
                </label>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <Btn variant="secondary" onClick={() => setShow(true)}>
          {t('examShowModel')}
        </Btn>
      )}
    </section>
  );
}
