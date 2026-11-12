import { Flame } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { streakNudge } from '../domain/gamify';
import type { Translate } from '../i18n';
import { useStore } from '../state/store';
import { Btn } from './ui';

/**
 * A reminder at the top of the path until today's lesson is done: start a streak, keep one alive,
 * or, from 6 pm, save one before midnight. Hidden once the learner has practised today.
 */
export function StreakNudge({ t, onGo }: { t: Translate; onGo: () => void }) {
  const streak = useStore((s) => s.streak);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const nudge = streakNudge(streak, now);
  if (nudge.kind === 'done') return null;

  const late = nudge.kind === 'keep' && nudge.late && !nudge.covered;
  const text =
    nudge.kind === 'start'
      ? t('nudgeStart')
      : late
        ? t('nudgeLate', { n: nudge.count })
        : t('nudgeKeep', { n: nudge.count });

  return (
    <motion.div
      className={`streak-nudge${late ? ' is-late' : ''}${nudge.kind === 'start' ? ' is-start' : ''}`}
      role="status"
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
    >
      <motion.span
        className="streak-nudge-flame"
        animate={late ? { scale: [1, 1.15, 1] } : undefined}
        transition={late ? { repeat: Infinity, duration: 1.4 } : undefined}
      >
        <Flame size={30} fill="currentColor" strokeWidth={1.5} />
      </motion.span>
      <div className="streak-nudge-text">
        <strong>{text}</strong>
        {nudge.kind === 'keep' && nudge.covered && <small>{t('nudgeCovered')}</small>}
      </div>
      <Btn onClick={onGo}>{t('nudgeGo')}</Btn>
    </motion.div>
  );
}
