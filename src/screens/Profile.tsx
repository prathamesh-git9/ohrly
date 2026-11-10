import {
  BookOpen,
  Check,
  Flame,
  Sparkle as Gem,
  Heart,
  Medal,
  Shield,
  Zap,
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { AchievementGrid, LevelScale } from '../components/Social';
import { Btn, Flag, Modal } from '../components/ui';
import { COURSES } from '../content';
import { dayKey, displayedStreak, HEART_REFILL_COST, MAX_FREEZES, MAX_HEARTS, STREAK_FREEZE_COST } from '../domain/gamify';
import type { Course } from '../domain/types';
import type { Translate } from '../i18n';
import { navigate } from '../router';
import { forgetVisitor } from '../sync/visitors';
import { cloudEnabled } from '../sync/cloud';
import { useStore } from '../state/store';

const GOALS = [10, 20, 30, 50] as const;

export function Profile({ course, t }: { course: Course; t: Translate }) {
  const state = useStore();
  const importRef = useRef<HTMLInputElement>(null);
  const [dataError, setDataError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const progress = Object.values(state.courses);
  const wordsMet = progress.reduce((sum, item) => sum + Object.keys(item.cards).length, 0);
  const lessonsDone = progress.reduce((sum, item) => sum + Object.keys(item.done).length, 0);
  const currentStreak = displayedStreak(state.streak, dayKey(new Date()));

  const week = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      return {
        key: dayKey(date),
        label: date.toLocaleDateString(course.from, { weekday: 'short' }),
        xp: state.xpByDay[dayKey(date)] ?? 0,
      };
    });
    return { days, max: Math.max(1, ...days.map((day) => day.xp)) };
  }, [course.from, state.xpByDay]);


  const exportData = () => {
    const raw = window.localStorage.getItem('ohrly-v1');
    const blob = new Blob([raw ?? JSON.stringify({ state })], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ohrly-progress.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !('state' in parsed) ||
        !parsed.state ||
        typeof parsed.state !== 'object' ||
        !('courses' in parsed.state) ||
        !parsed.state.courses ||
        typeof parsed.state.courses !== 'object' ||
        Array.isArray(parsed.state.courses)
      ) {
        throw new Error('invalid');
      }
      window.localStorage.setItem('ohrly-v1', JSON.stringify(parsed));
      window.location.reload();
    } catch {
      setDataError(t('importError'));
    }
  };

  const stats = [
    { label: t('currentStreak'), value: currentStreak, Icon: Flame },
    { label: t('bestStreak'), value: state.streak.best, Icon: Medal },
    { label: t('totalXp'), value: state.xp, Icon: Zap },
    { label: t('wordsMet'), value: wordsMet, Icon: BookOpen },
    { label: t('lessonsDone'), value: lessonsDone, Icon: Check },
    { label: t('gems'), value: state.gems, Icon: Gem },
  ];

  return (
    <div className="page profile-page">
      <h1 className="page-title">{t('navProfile')}</h1>
      <LevelScale course={course} t={t} />
      <a className="account-row" href="#/account">{t('account')}</a>

      <section className="profile-section" aria-labelledby="profile-stats">
        <h2 id="profile-stats">{t('yourStats')}</h2>
        <div className="profile-stats">
          {stats.map(({ label, value, Icon }) => (
            <div className="profile-stat" key={label}>
              <Icon aria-hidden="true" />
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="profile-section" aria-labelledby="weekly-xp">
        <h2 id="weekly-xp">{t('weeklyXp')}</h2>
        <div className="weekly-chart">
          {week.days.map((day) => (
            <div className="week-day" key={day.key}>
              <span className="week-value">{day.xp}</span>
              <span className="week-track">
                <span style={{ height: `${Math.max(day.xp > 0 ? 8 : 2, (day.xp / week.max) * 100)}%` }} />
              </span>
              <span>{day.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="profile-section" aria-labelledby="achievements">
        <h2 id="achievements">{t('achievements')}</h2>
        <AchievementGrid t={t} />
      </section>

      <section className="profile-section" aria-labelledby="courses">
        <h2 id="courses">{t('courses')}</h2>
        <div className="course-switcher">
          {COURSES.map((item) => {
            const label = t(item.to === 'de' ? 'courseGerman' : 'courseEnglish');
            const selected = item.id === state.courseId;
            return (
              <button
                type="button"
                className={`card-option course-switch${selected ? ' is-picked' : ''}`}
                key={item.id}
                onClick={() => state.switchCourse(item.id)}
                aria-pressed={selected}
                aria-label={t('switchCourseTo', { course: label })}
              >
                <Flag lang={item.to} size={32} />
                <span>{label}</span>
                {selected && <Check aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="profile-section" aria-labelledby="daily-goal">
        <h2 id="daily-goal">{t('dailyGoal')}</h2>
        <div className="goal-buttons">
          {GOALS.map((goal) => (
            <button
              type="button"
              className={`card-option${state.dailyGoal === goal ? ' is-picked' : ''}`}
              key={goal}
              onClick={() => state.setDailyGoal(goal)}
              aria-pressed={state.dailyGoal === goal}
            >
              {t('xpGoal', { n: goal })}
            </button>
          ))}
        </div>
      </section>

      <section className="profile-section" aria-labelledby="rewards-shop">
        <h2 id="rewards-shop">{t('rewardsShop')}</h2>
        <p className="section-note">{t('gemBalance', { n: state.gems })}</p>
        <div className="shop-list">
          <div className="shop-row">
            <Shield aria-hidden="true" />
            <span><strong>{t('streakFreeze')}</strong><small>{t('freezeOwned', { n: state.streak.freezes, max: MAX_FREEZES })}</small></span>
            <Btn
              variant="secondary"
              onClick={state.buyFreeze}
              disabled={state.gems < STREAK_FREEZE_COST || state.streak.freezes >= MAX_FREEZES}
              aria-label={t('buyStreakFreeze', { n: STREAK_FREEZE_COST })}
            >
              {t('gemCost', { n: STREAK_FREEZE_COST })}
            </Btn>
          </div>
          <div className="shop-row">
            <Heart aria-hidden="true" />
            <span><strong>{t('refillHeartsTitle')}</strong><small>{t('heartsOwned', { n: state.hearts.count, max: MAX_HEARTS })}</small></span>
            <Btn
              variant="secondary"
              onClick={state.refillHearts}
              disabled={state.gems < HEART_REFILL_COST || state.hearts.count >= MAX_HEARTS}
              aria-label={t('buyHeartRefill', { n: HEART_REFILL_COST })}
            >
              {t('gemCost', { n: HEART_REFILL_COST })}
            </Btn>
          </div>
        </div>
      </section>

      <section className="profile-section" aria-labelledby="settings">
        <h2 id="settings">{t('settings')}</h2>
        <div className="settings-list">
          {([
            ['sound', 'soundEffects'],
            ['voice', 'voices'],
            ['speaking', 'speakingExercises'],
            ['listening', 'listeningExercises'],
          ] as const).map(([setting, key]) => (
            <div className="setting-row" key={setting}>
              <span>{t(key)}</span>
              <button
                type="button"
                className={`switch${state.settings[setting] ? ' is-on' : ''}`}
                role="switch"
                aria-checked={state.settings[setting]}
                aria-label={t(key)}
                onClick={() => state.updateSettings({ [setting]: !state.settings[setting] })}
              >
                <span />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="profile-section" aria-labelledby="your-data">
        <h2 id="your-data">{t('yourData')}</h2>
        <div className="data-actions">
          <Btn variant="secondary" onClick={exportData}>{t('exportProgress')}</Btn>
          <Btn variant="secondary" onClick={() => importRef.current?.click()}>{t('importProgress')}</Btn>
          <input ref={importRef} className="sr-only" type="file" accept="application/json,.json" onChange={importData} aria-label={t('importProgress')} />
          {cloudEnabled && (
            <Btn
              variant="secondary"
              onClick={() =>
                forgetVisitor().then(
                  () => setDataError(t('nameForgotten')),
                  () => setDataError(t('networkError')),
                )
              }
            >
              {t('forgetName')}
            </Btn>
          )}
          <Btn variant="bad" onClick={() => setConfirmReset(true)}>{t('resetProgress')}</Btn>
        </div>
        {dataError && <p className="data-error" role="alert">{dataError}</p>}
      </section>

      <section className="profile-section about-section" aria-labelledby="about">
        <h2 id="about">{t('about')}</h2>
        <p><strong>{t('ohrlyIsFree')}</strong></p>
        <p><a href="https://github.com/prathamesh-git9/ohrly" target="_blank" rel="noreferrer">{t('sourceCode')}</a></p>
        <p><a href="#/legal">{t('legalLink')}</a></p>

      </section>

      <AnimatePresence>
        {confirmReset && (
          <Modal onClose={() => setConfirmReset(false)}>
            <h3>{t('resetTitle')}</h3>
            <p>{t('resetBody')}</p>
            <div className="modal-actions">
              <Btn variant="ghost" onClick={() => setConfirmReset(false)}>{t('notNow')}</Btn>
              <Btn
                variant="bad"
                onClick={() => {
                  state.resetAll();
                  navigate('/');
                }}
              >
                {t('resetConfirm')}
              </Btn>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
