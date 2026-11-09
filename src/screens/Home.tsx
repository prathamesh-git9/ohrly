import { BookOpen, Check, Dumbbell, FileText, GraduationCap, Headphones, Lock, MessageSquare, Sparkles, Star, Trophy } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Fenn } from '../components/Fenn';
import { Btn, SpeakerButton, Modal } from '../components/ui';
import { buildPath, UNIT_LESSONS } from '../domain/course';
import { examFor } from '../content/exams';
import { currentLevel, currentNodeId, examNodeId, levelOf, levelStatuses } from '../domain/levels';
import type { Course, NodeKind, PathNode, Unit } from '../domain/types';
import type { Translate, UiKey } from '../i18n';
import { navigate } from '../router';
import { useProgress } from '../state/store';

/** Every unit gets its own hue. Night sky to desert, in order, then round again. */
const UNIT_HUES = [
  ['#5b3df5', '#3f27c4'],
  ['#0d9f9a', '#08756f'],
  ['#e8603c', '#b8421f'],
  ['#2f7de1', '#1d5bb0'],
  ['#c2459a', '#942f74'],
  ['#c7860b', '#966405'],
] as const;

const KIND_ICON: Record<NodeKind, typeof Star> = {
  words: Sparkles,
  sentences: MessageSquare,
  listening: Headphones,
  review: Dumbbell,
  passages: FileText,
  checkpoint: Trophy,
  exam: GraduationCap,
};

const KIND_LABEL: Record<NodeKind, UiKey> = {
  words: 'kindWords',
  sentences: 'kindSentences',
  listening: 'kindListening',
  review: 'kindReview',
  passages: 'kindPassages',
  checkpoint: 'checkpoint',
  exam: 'examTitle',
};

/** The path winds around the page's centre line, like a track through dunes. */
function nodeOffset(i: number): number {
  return Math.round(Math.sin(i * 0.95) * 62);
}

export function Home({ course, t }: { course: Course; t: Translate }) {
  const progress = useProgress(course.id);
  const path = useMemo(() => buildPath(course), [course]);
  const currentId = useMemo(() => currentNodeId(course, progress.done), [course, progress.done]);
  const levelBySection = useMemo(
    () => new Map(course.sections.map((s) => [s.id, levelOf(s)])),
    [course],
  );
  const currentIndex = currentId ? path.findIndex((n) => n.id === currentId) : path.length;
  const [openNode, setOpenNode] = useState<string | null>(null);
  const [guide, setGuide] = useState<Unit | null>(null);
  const currentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center' });
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.path-node-wrap')) setOpenNode(null);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const statuses = levelStatuses(course, progress.done);
  const activeLevel = currentLevel(statuses);
  let shownLevel: string | null = null;
  let unitCounter = 0;
  let sectionCounter = 0;
  let serial = 0;

  const renderNode = (node: PathNode, hue: readonly [string, string], unitLabel: string) => {
    const index = path.indexOf(node);
    const isDone = !!progress.done[node.id];
    const isCurrent = node.id === currentId;
    // A met practice target opens the whole level, and an exam can be tried at any time.
    const isLocked =
      !isDone &&
      !isCurrent &&
      node.kind !== 'exam' &&
      !progress.done[examNodeId(levelBySection.get(node.sectionId) ?? 'A1')];
    const isOpen = openNode === node.id;
    const Icon = isDone ? Check : isLocked ? Lock : KIND_ICON[node.kind];
    const isCheckpoint = node.kind === 'checkpoint' || node.kind === 'exam';
    const offset = nodeOffset(serial++);
    const reachedFraction = index < currentIndex;

    const style = isLocked
      ? undefined
      : ({ '--node': isDone ? '#e8a916' : hue[0], '--node-edge': isDone ? '#b17f06' : hue[1] } as React.CSSProperties);

    return (
      <div
        key={node.id}
        className={`path-node-wrap${isOpen ? ' is-open' : ''}`}
        style={{ transform: `translateX(${offset}px)` }}
        ref={isCurrent ? currentRef : undefined}
      >
        {isCurrent && (
          // Fenn waits on the far side of the bend, where the neighbouring nodes leave room.
          <div className={`node-fenn ${offset >= 0 ? 'on-left' : 'on-right'}`} aria-hidden="true">
            <Fenn size={84} />
          </div>
        )}
        {isCurrent && (
          <motion.div
            className="node-flag"
            style={{ color: hue[0] }}
            initial={{ y: 8, opacity: 0, x: '-50%' }}
            animate={{ y: [0, -5, 0], opacity: 1, x: '-50%' }}
            transition={{ y: { repeat: Infinity, duration: 1.8, ease: 'easeInOut' }, opacity: { duration: 0.2 } }}
          >
            {t('start')}
          </motion.div>
        )}
        <button
          type="button"
          style={style}
          aria-label={`${unitLabel}: ${t(KIND_LABEL[node.kind])}`}
          data-node={node.id}
          className={`path-node${isCheckpoint ? ' is-checkpoint' : ''}${isDone ? ' is-done' : ''}${
            isLocked ? ' is-locked' : ''
          }${isCurrent ? ' is-current' : ''}${reachedFraction ? ' is-reached' : ''}`}
          onClick={() => setOpenNode(isOpen ? null : node.id)}
        >
          <Icon strokeWidth={3} size={isCheckpoint ? 36 : 30} />
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className={`node-pop${isLocked ? ' is-locked' : ''}`}
              style={isLocked ? undefined : { background: hue[0], '--pop-edge': hue[1] } as React.CSSProperties}
              initial={{ opacity: 0, y: -8, scale: 0.9, x: `calc(-50% - ${offset}px)` }}
              animate={{ opacity: 1, y: 0, scale: 1, x: `calc(-50% - ${offset}px)` }}
              exit={{ opacity: 0, y: -8, scale: 0.9, x: `calc(-50% - ${offset}px)` }}
              transition={{ type: 'spring', stiffness: 520, damping: 30 }}
            >
              <strong>{t(KIND_LABEL[node.kind])}</strong>
              <p>
                {isLocked
                  ? t('lockedBody')
                  : node.kind === 'exam'
                    ? t('examBody')
                    : isCheckpoint
                    ? t('checkpointBody')
                    : t('lessonOf', { a: node.lessonIndex + 1, b: UNIT_LESSONS.length })}
              </p>
              {!isLocked && (
                <Btn
                  block
                  variant="secondary"
                  onClick={() =>
                    navigate(
                      node.kind === 'exam'
                        ? `/exam/${node.id.split(':')[0]}`
                        : `/lesson/${encodeURIComponent(node.id)}`,
                    )
                  }
                >
                  {node.kind === 'exam'
                    ? t('examStart')
                    : isDone
                      ? t('replay', { n: 5 })
                      : t('startXp', { n: isCheckpoint ? 30 : 10 })}
                </Btn>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="path">
      <div className="level-ladder" role="list" aria-label={t('yourLevel')}>
        {statuses.map((s) => (
          <button
            type="button"
            key={s.level}
            role="listitem"
            disabled={!s.available}
            className={`level-step${s.level === activeLevel ? ' is-active' : ''}${s.complete ? ' is-complete' : ''}`}
            onClick={() =>
              document.getElementById(`level-${s.level}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          >
            <strong>{s.level}</strong>
            <span className="level-name">{t(`level${s.level}`)}</span>
            {s.available ? (
              <span className="level-bar" aria-label={`${Math.round(s.progress * 100)}%`}>
                <span style={{ width: `${s.progress * 100}%` }} />
              </span>
            ) : (
              <span className="level-soon">{t('levelSoon')}</span>
            )}
          </button>
        ))}
      </div>
      {course.sections.map((section) => {
        sectionCounter++;
        const level = levelOf(section);
        const startsLevel = level !== shownLevel;
        shownLevel = level;
        const nodes = path.filter((n) => n.sectionId === section.id);
        const checkpoint = nodes.find((n) => n.kind === 'checkpoint');
        return (
          <section key={section.id} className="chapter">
            {startsLevel && (
              <div className="level-head" id={`level-${level}`}>
                <span className="level-badge">{level}</span>
                <div>
                  <h2>{t(`level${level}`)}</h2>
                  <p>{t(`level${level}Body`)}</p>
                  {(() => {
                    const info = examFor(course, level);
                    return (
                      <p className="level-exam">
                        {info.exam ? t('examTarget', { exam: info.exam }) : t('examNone')}
                        {' · '}
                        {t('examHours', { hours: info.hours })}
                      </p>
                    );
                  })()}
                  {course.exams?.some((e) => e.level === level) && (
                    <a className="level-exam-link" href={`#/exam/${level}`}>
                      <GraduationCap size={16} /> {t('examSkip')}
                      {progress.examBest?.[level] !== undefined &&
                        ` · ${t('examBest', { n: progress.examBest[level]! })}`}
                    </a>
                  )}
                </div>
              </div>
            )}
            <div className="chapter-head">
              <span className="chapter-kicker">
                {t('chapter', { n: sectionCounter })} · {section.cefr}
              </span>
              <h2>{section.title}</h2>
              <p>{section.description}</p>
            </div>
            {section.units.map((unit) => {
              const hue = UNIT_HUES[unitCounter % UNIT_HUES.length]!;
              unitCounter++;
              const label = t('unit', { n: unitCounter });
              const unitNodes = nodes.filter((n) => n.unitId === unit.id);
              return (
                <div key={unit.id} className="unit">
                  <header className="unit-banner" style={{ background: hue[0], borderColor: hue[1] }}>
                    <div>
                      <span className="unit-kicker">{label}</span>
                      <h3>{unit.title}</h3>
                      <p>{unit.canDo}</p>
                    </div>
                    <button
                      type="button"
                      className="unit-guide"
                      style={{ '--guide-edge': hue[1] } as React.CSSProperties}
                      onClick={() => setGuide(unit)}
                    >
                      <BookOpen strokeWidth={2.6} size={20} />
                      <span>{t('guide')}</span>
                    </button>
                  </header>
                  <div className="unit-track">
                    {unitNodes.map((n) => renderNode(n, hue, label))}
                  </div>
                </div>
              );
            })}
            {checkpoint && (
              <div className="unit-track">{renderNode(checkpoint, UNIT_HUES[2], section.title)}</div>
            )}
          </section>
        );
      })}
      {currentId === null && (
        <div className="course-done">
          <Fenn mood="cheer" size={150} />
          <h2>
            <Star fill="currentColor" /> {course.title} A1
          </h2>
        </div>
      )}

      <AnimatePresence>
        {guide && (
          <Modal onClose={() => setGuide(null)}>
            <h3>{guide.tip.title}</h3>
            <div className="guide-body">
              {guide.tip.body.split(/\n\s*\n/).map((para, i) => (
                <p key={i}>
                  {para.split(/(\*\*[^*]+\*\*)/).map((bit, j) =>
                    bit.startsWith('**') ? <strong key={j}>{bit.slice(2, -2)}</strong> : bit,
                  )}
                </p>
              ))}
              <ul className="guide-examples">
                {guide.tip.examples.map((ex) => (
                  <li key={ex.target}>
                    <SpeakerButton text={ex.target} lang={course.to} size="sm" />
                    <span>
                      <strong>{ex.target}</strong>
                      <em>{ex.source}</em>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <Btn block onClick={() => setGuide(null)}>
              {t('gotIt')}
            </Btn>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
