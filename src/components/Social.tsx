import { BookOpen, Flame, Globe, GraduationCap, Share2, Sparkles, Star, Trophy, Zap, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { sfx } from '../audio/sfx';
import { ACHIEVEMENTS, progressTowards, unlocked, type Achievement, type AchievementInput } from '../domain/achievements';
import { dayKey, displayedStreak } from '../domain/gamify';
import { CEFR_SCALE, cefrPosition, levelStatuses } from '../domain/levels';
import type { Course } from '../domain/types';
import type { Translate } from '../i18n';
import { useStore } from '../state/store';
import { Btn, Modal } from './ui';

export const ACHIEVEMENT_ICONS: Record<Achievement['icon'], LucideIcon> = {
  flame: Flame,
  star: Star,
  book: BookOpen,
  zap: Zap,
  sparkles: Sparkles,
  trophy: Trophy,
  graduation: GraduationCap,
  globe: Globe,
};

/** Everything achievements are judged on, worked out from the store. */
export function useAchievementInput(): AchievementInput {
  const courses = useStore((s) => s.courses);
  const xp = useStore((s) => s.xp);
  const best = useStore((s) => s.streak.best);
  const perfect = useStore((s) => s.perfectLessons);
  return useMemo(() => {
    const progress = Object.values(courses);
    const doneIds = progress.flatMap((p) => Object.keys(p.done));
    return {
      xp,
      bestStreak: best,
      perfectLessons: perfect,
      wordsMet: progress.reduce((n, p) => n + Object.keys(p.cards).length, 0),
      lessonsDone: doneIds.filter((id) => !id.endsWith(':exam') && !id.endsWith(':checkpoint')).length,
      checkpointsPassed: doneIds.filter((id) => id.endsWith(':checkpoint')).length,
      examsPassed: doneIds.filter((id) => id.endsWith(':exam')).length,
      coursesStarted: progress.filter((p) => Object.keys(p.done).length > 0).length,
    };
  }, [courses, xp, best, perfect]);
}

export function achievementTitle(a: Achievement, t: Translate): string {
  return t(`ach_${a.id.split('-')[0]}` as Parameters<Translate>[0], { n: a.goal });
}

/* --------------------------------- Streak --------------------------------- */

export function StreakModal({ t, lang, onClose }: { t: Translate; lang: string; onClose: () => void }) {
  const streak = useStore((s) => s.streak);
  const xpByDay = useStore((s) => s.xpByDay);
  const today = dayKey(new Date());
  const count = displayedStreak(streak, today);
  // The last five weeks, ending this week, Monday first.
  const days = useMemo(() => {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) - 28);
    return Array.from({ length: 35 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = dayKey(d);
      return { key, day: d.getDate(), active: (xpByDay[key] ?? 0) > 0, today: key === today, future: key > today };
    });
  }, [xpByDay, today]);
  const weekdays = useMemo(() => {
    const base = new Date(2024, 0, 1); // A Monday.
    return Array.from({ length: 7 }, (_, i) =>
      new Date(base.getFullYear(), 0, 1 + i).toLocaleDateString(lang, { weekday: 'narrow' }),
    );
  }, [lang]);

  return (
    <Modal onClose={onClose}>
      <div className={`streak-hero${count > 0 ? ' is-lit' : ''}`}>
        <Flame fill="currentColor" size={64} strokeWidth={1.5} />
        <strong>{count}</strong>
      </div>
      <h3>{t('streakDaysTitle', { n: count })}</h3>
      <p>{count > 0 ? t('streakKeepGoing') : t('streakStart')}</p>
      <div className="streak-calendar" role="grid" aria-label={t('streakCalendar')}>
        {weekdays.map((w, i) => (
          <span key={`h${i}`} className="cal-head">{w}</span>
        ))}
        {days.map((d) => (
          <span
            key={d.key}
            role="gridcell"
            aria-label={`${d.key}${d.active ? ' ✓' : ''}`}
            className={`cal-day${d.active ? ' is-active' : ''}${d.today ? ' is-today' : ''}${d.future ? ' is-future' : ''}`}
          >
            {d.day}
          </span>
        ))}
      </div>
      <div className="streak-facts">
        <span>{t('bestStreak')}: <strong>{streak.best}</strong></span>
        <span>{t('streakFreeze')}: <strong>{streak.freezes}</strong></span>
      </div>
      <ShareButton t={t} kind="streak" value={count} />
    </Modal>
  );
}

/* --------------------------------- Share ---------------------------------- */

const SITE = 'https://prathamesh-git9.github.io/ohrly/';

/** The phone's own share sheet where there is one; otherwise the text is copied. */
export function ShareButton({ t, kind, value, label }: { t: Translate; kind: 'streak' | 'level' | 'achievement'; value: number | string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const text =
    kind === 'streak'
      ? t('shareStreak', { n: value })
      : kind === 'level'
        ? t('shareLevel', { level: value })
        : t('shareAchievement', { name: label ?? String(value) });
  const share = async () => {
    sfx.tap();
    const data = { title: 'Ohrly', text, url: SITE };
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
        await navigator.share(data);
        return;
      }
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return; // The learner closed the sheet.
    }
    try {
      await navigator.clipboard.writeText(`${text} ${SITE}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t('shareCopyPrompt'), `${text} ${SITE}`);
    }
  };
  return (
    <Btn variant="secondary" onClick={share} quiet className="share-btn">
      <Share2 size={18} /> {copied ? t('shareCopied') : t('share')}
    </Btn>
  );
}

/* ---------------------------------- Level --------------------------------- */

/** Where the learner sits on the full A1 to C2 scale. C1 and C2 are shown so the scale is honest. */
export function LevelScale({ course, t }: { course: Course; t: Translate }) {
  const done = useStore((s) => s.courses[course.id]?.done) ?? EMPTY;
  const statuses = useMemo(() => levelStatuses(course, done), [course, done]);
  const position = cefrPosition(statuses);
  const current = CEFR_SCALE[Math.min(CEFR_SCALE.length - 1, Math.floor(position))]!;
  const offered = statuses.filter((s) => s.available).length;
  const percent = (position / CEFR_SCALE.length) * 100;
  return (
    <section className="level-scale" aria-label={t('yourLevel')}>
      <div className="level-scale-head">
        <div>
          <span className="level-scale-kicker">{t('yourLevel')}</span>
          <strong>{position < 0.05 ? t('levelStarting') : t('levelWorkingOn', { level: current })}</strong>
        </div>
        <ShareButton t={t} kind="level" value={position < 0.05 ? 'A1' : current} />
      </div>
      <div className="scale-track">
        <motion.span
          className="scale-fill"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
        <motion.span
          className="scale-marker"
          initial={{ left: '0%' }}
          animate={{ left: `${percent}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
      <div className="scale-labels">
        {CEFR_SCALE.map((level, i) => (
          <span key={level} className={i >= offered ? 'is-beyond' : i < Math.floor(position) ? 'is-done' : undefined}>
            {level}
          </span>
        ))}
      </div>
      <p className="scale-note">{t('levelScaleNote', { max: CEFR_SCALE[Math.max(0, offered - 1)]! })}</p>
    </section>
  );
}
const EMPTY = {};

/* ------------------------------- Achievements ------------------------------ */

export function AchievementGrid({ t }: { t: Translate }) {
  const input = useAchievementInput();
  const got = unlocked(input);
  // One card per ladder: the next rung to reach, or the top rung once all are done.
  const ladders = useMemo(() => {
    const byBase = new Map<string, Achievement[]>();
    for (const a of ACHIEVEMENTS) byBase.set(a.id.split('-')[0]!, [...(byBase.get(a.id.split('-')[0]!) ?? []), a]);
    return [...byBase.values()];
  }, []);
  return (
    <div className="achievement-grid">
      {ladders.map((rungs) => {
        const next = rungs.find((a) => !got.has(a.id)) ?? rungs[rungs.length - 1]!;
        const done = rungs.filter((a) => got.has(a.id)).length;
        const Icon = ACHIEVEMENT_ICONS[next.icon];
        const p = progressTowards(next, input);
        return (
          <div className={`achievement${done === 0 ? ' is-locked' : ''}`} key={next.id}>
            <span className="ach-icon">
              <Icon aria-hidden="true" />
              <span className="ach-tier">{done}/{rungs.length}</span>
            </span>
            <strong>{achievementTitle(next, t)}</strong>
            <span className="ach-bar"><span style={{ width: `${p * 100}%` }} /></span>
            <span className="ach-count">{Math.min(next.value(input), next.goal)} / {next.goal}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Pops up an achievement the moment it is earned, once. */
export function AchievementToasts({ t }: { t: Translate }) {
  const input = useAchievementInput();
  const seen = useStore((s) => s.seenAchievements);
  const markSeen = useStore((s) => s.markAchievementsSeen);
  const [showing, setShowing] = useState<Achievement | null>(null);

  useEffect(() => {
    const got = unlocked(input);
    const fresh = ACHIEVEMENTS.filter((a) => got.has(a.id) && !seen.includes(a.id));
    if (fresh.length === 0) return;
    // A returning learner from before achievements existed gets them quietly, not as a flood.
    if (seen.length === 0 && fresh.length > 2) {
      markSeen(fresh.map((a) => a.id));
      return;
    }
    const top = fresh[fresh.length - 1]!;
    markSeen(fresh.map((a) => a.id));
    setShowing(top);
    sfx.streak();
    const timer = window.setTimeout(() => setShowing(null), 4200);
    return () => window.clearTimeout(timer);
  }, [input, seen, markSeen]);

  const Icon = showing ? ACHIEVEMENT_ICONS[showing.icon] : Trophy;
  return (
    <AnimatePresence>
      {showing && (
        <motion.div
          className="ach-toast"
          role="status"
          initial={{ y: -80, opacity: 0, x: '-50%' }}
          animate={{ y: 0, opacity: 1, x: '-50%' }}
          exit={{ y: -80, opacity: 0, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 420, damping: 26 }}
        >
          <span className="ach-icon"><Icon /></span>
          <span>
            <small>{t('achievementUnlocked')}</small>
            <strong>{achievementTitle(showing, t)}</strong>
          </span>
          <ShareButton t={t} kind="achievement" value={showing.id} label={achievementTitle(showing, t)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
