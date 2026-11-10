import { Clock, Flame, Heart, Sparkle, Target, Zap } from 'lucide-react';
import { animate, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { sfx } from '../audio/sfx';
import { Fenn } from '../components/Fenn';
import { Btn, Confetti } from '../components/ui';
import type { Translate } from '../i18n';
import type { LessonSummary } from '../state/store';

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
          <p className="done-sub">{t('streakBody')}</p>
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
