import { Brain, Headphones, Heart, Target } from 'lucide-react';
import { useMemo } from 'react';
import { Fenn } from '../components/Fenn';
import { Btn } from '../components/ui';
import { dueWords, weakWords } from '../domain/srs';
import type { Course } from '../domain/types';
import type { Translate } from '../i18n';
import { navigate } from '../router';
import { useProgress } from '../state/store';

export function Practice({ course, t }: { course: Course; t: Translate }) {
  const { cards } = useProgress(course.id);
  const known = Object.keys(cards).length;
  const due = useMemo(() => dueWords(cards, Date.now(), 99).length, [cards]);
  const weak = useMemo(() => weakWords(cards, 99).length, [cards]);

  if (known === 0) {
    return (
      <div className="empty-state">
        <Fenn mood="think" size={130} />
        <h2>{t('navPractice')}</h2>
        <p>{t('practiceEmpty')}</p>
        <Btn onClick={() => navigate('/')}>{t('navLearn')}</Btn>
      </div>
    );
  }

  const rows = [
    {
      mode: 'due',
      Icon: Brain,
      tone: 'violet',
      title: t('practiceDue'),
      body: due > 0 ? t('practiceDueBody', { n: due }) : t('practiceNothingDue'),
    },
    {
      mode: 'weak',
      Icon: Target,
      tone: 'coral',
      title: t('practiceWeak'),
      body: t('practiceWeakBody', { n: weak }),
      disabled: weak === 0,
    },
    {
      mode: 'listening',
      Icon: Headphones,
      tone: 'teal',
      title: t('practiceListening'),
      body: t('practiceListeningBody'),
    },
  ] as const;

  return (
    <div className="page">
      <h1 className="page-title">{t('navPractice')}</h1>
      <p className="practice-note">
        <Heart size={18} fill="currentColor" /> {t('practiceHeartNote')}
      </p>
      <div className="practice-list">
        {rows.map((r) => (
          <button
            type="button"
            key={r.mode}
            className="card-option practice-row"
            disabled={'disabled' in r && r.disabled}
            onClick={() => navigate(`/lesson-practice/${r.mode}`)}
          >
            <span className={`practice-icon tone-${r.tone}`}>
              <r.Icon strokeWidth={2.6} />
            </span>
            <span className="practice-text">
              <strong>{r.title}</strong>
              <span>{r.body}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
