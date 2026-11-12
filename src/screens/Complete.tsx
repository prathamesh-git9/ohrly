import { Check, Clock, Flame, Heart, Moon, Sparkle, Target, Zap } from 'lucide-react';
import { animate, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { sfx } from '../audio/sfx';
import { Fenn } from '../components/Fenn';
import { Btn, Confetti } from '../components/ui';
import { dayKey, nextMilestone } from '../domain/gamify';
import type { Translate } from '../i18n';
import { useStore, type LessonSummary } from '../state/store';

/** Monday to Sunday of this week: which days had practice, and which is today. */
function WeekRow({ t }: { t: Translate }) {
  const xpByDay = useStore((s) => s.xpByDay);
  const lang = typeof document !== 'undefined' ? document.documentElement.lang || 'en' : 'en';
  const days = useMemo(() => {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    const today = dayKey(now);
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = dayKey(d);
      return {
        key,
        label: d.toLocaleDateString(lang, { weekday: 'narrow' }),
        active: (xpByDay[key] ?? 0) > 0,
        today: key === today,
        future: key > today,
      };
    });
  }, [xpByDay, lang]);
  return (
    <div className="week-row" role="list" aria-label={t('streakCalendar')}>
      {days.map((d, i) => (
        <motion.span
          key={d.key}
          role="listitem"
          className={`week-day${d.active ? ' is-active' : ''}${d.today ? ' is-today' : ''}${d.future ? ' is-future' : ''}`}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.35 + i * 0.05, type: 'spring', stiffness: 500, damping: 22 }}
        >
          <small>{d.label}</small>
          <span className="week-dot">{d.active ? <Check size={16} strokeWidth={3.5} /> : null}</span>
        </motion.span>
      ))}
    </div>
  );
}

function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? to : 0);
  useEffect(() => {
    if (reduced) return;
    const controls = animate(0, to, {
      duration: 0.6,
      delay: 0.3,
      ease: 'easeOut',
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [to, reduced]);
  return (
    <>
      {value}
      {suffix}
    </>
  );
}

function StatCard({
  tone,
  label,
  icon,
  children,
  delay,
}: {
  tone: string;
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.div
      className={`done-stat done-stat-${tone}`}
      initial={{ y: 18, opacity: 0, scale: 0.92 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26, delay }}
    >
      <div className="done-stat-label">{label}</div>
      <div className="done-stat-value">
        {icon}
        <span>{children}</span>
      </div>
    </motion.div>
  );
}

export function Complete({
  summary,
  seconds,
  isPractice,
  t,
  onDone,
}: {
  summary: LessonSummary;
  total: number;
  seconds: number;
  isPractice: boolean;
  t: Translate;
  onDone: () => void;
}) {
  const [step, setStep] = useState<'stats' | 'streak'>('stats');
  const mins = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, '0');

  const next = () => {
    if (step === 'stats' && summary.streakExtended) {
      sfx.streak();
      setStep('streak');
    } else {
      onDone();
    }
  };

  if (step === 'streak') {
    return (
      <div className="done">
        <Confetti count={18} />
        <div className="done-main">
          <motion.div
            className="streak-flame"
            initial={{ scale: 0.3, rotate: -14 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 14 }}
          >
            <Flame fill="currentColor" size={110} strokeWidth={1.5} />
            <span className="streak-num">{summary.streakCount}</span>
          </motion.div>
          <h1 className="done-title done-title-streak">
            {t('streakDays', { n: summary.streakCount })}
          </h1>
          <p className="done-sub">{summary.streakLost ? t('streakRestarted') : t('streakBody')}</p>
          <WeekRow t={t} />
          {summary.milestoneSparks > 0 && (
            <motion.p
              className="done-badge done-badge-milestone"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 18, delay: 0.8 }}
            >
              <Sparkle size={18} fill="currentColor" /> {t('streakMilestone', { n: summary.streakCount, gems: summary.milestoneSparks })}
            </motion.p>
          )}
          {summary.freezesUsed > 0 && (
            <p className="done-badge done-badge-rest">
              <Moon size={18} /> {t('restDayUsed', { n: summary.freezesUsed })}
            </p>
          )}
          {summary.milestoneSparks === 0 && nextMilestone(summary.streakCount) !== null && (
            <p className="streak-next">{t('streakNextMilestone', { n: nextMilestone(summary.streakCount)! - summary.streakCount, m: nextMilestone(summary.streakCount)! })}</p>
          )}
        </div>
        <div className="done-foot">
          <Btn block onClick={onDone}>
            {t('continue')}
          </Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="done">
      <Confetti count={summary.perfect ? 26 : 18} />
      <div className="done-main">
        <Fenn mood="cheer" size={170} />
        <h1 className="done-title">
          {summary.perfect ? t('perfectLesson') : isPractice ? t('practiceComplete') : t('lessonComplete')}
        </h1>
        {summary.dailyGoalReached && (
          <motion.p
            className="done-badge"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 20, delay: 0.5 }}
          >
            <Target size={18} /> {t('goalReached')}
          </motion.p>
        )}
        {summary.heartEarned && (
          <p className="done-badge done-badge-heart">
            <Heart size={18} fill="currentColor" /> {t('heartEarned')}
          </p>
        )}
        <div className="done-stats">
          <StatCard tone="xp" label={t('totalXp')} icon={<Zap fill="currentColor" size={20} />} delay={0.15}>
            <CountUp to={summary.xp} />
          </StatCard>
          <StatCard tone="acc" label={t('accuracy')} icon={<Target size={20} />} delay={0.25}>
            <CountUp to={Math.round(summary.accuracy * 100)} suffix="%" />
          </StatCard>
          <StatCard tone="time" label={t('time')} icon={<Clock size={20} />} delay={0.35}>
            {mins}:{secs}
          </StatCard>
          <StatCard tone="gem" label={t('gemsEarned')} icon={<Sparkle size={20} />} delay={0.45}>
            <CountUp to={summary.gems} />
          </StatCard>
        </div>
      </div>
      <div className="done-foot">
        <Btn block onClick={next} autoFocus>
          {t('continue')}
        </Btn>
      </div>
    </div>
  );
}
