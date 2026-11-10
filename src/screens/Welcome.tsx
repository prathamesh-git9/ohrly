import { ArrowLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Fenn } from '../components/Fenn';
import { Btn, Flag, MadeBy } from '../components/ui';
import { COURSES } from '../content';
import { browserLang, LANGUAGE_NAMES, translator } from '../i18n';
import { cleanName } from '../domain/greeting';
import { useStore } from '../state/store';

const GOALS = [
  { xp: 10, min: 5, key: 'goalCasual' },
  { xp: 20, min: 10, key: 'goalRegular' },
  { xp: 30, min: 15, key: 'goalSerious' },
  { xp: 50, min: 25, key: 'goalIntense' },
] as const;

export function Welcome() {
  const finish = useStore((s) => s.finishOnboarding);
  const setName = useStore((s) => s.setName);
  const [name, setNameDraft] = useState('');
  const [step, setStep] = useState(0);
  const [lang] = useState(browserLang);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [goal, setGoal] = useState(20);

  // Once a course is chosen, the app speaks the language the learner picked to learn from.
  const uiLang = COURSES.find((c) => c.id === courseId)?.from ?? lang;
  const t = translator(uiLang);
  const nameLang = uiLang === 'de' ? 'de' : 'en';

  // Courses the visitor can already read go first.
  const ordered = [...COURSES].sort((a, b) => Number(b.from === lang) - Number(a.from === lang));

  return (
    <div className="welcome">
      <MadeBy label={t('madeBy', { name: 'Prathamesh' })} className="made-by-welcome" />
      {step > 0 && (
        <button type="button" className="icon-btn welcome-back" aria-label={t('back')} onClick={() => setStep(step - 1)}>
          <ArrowLeft strokeWidth={3} />
        </button>
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="welcome-step"
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        >
          {step === 0 && (
            <div className="hero">
              <Fenn size={210} mood="happy" />
              <h1 className="brand">Ohrly</h1>
              <p className="hero-line">{t('appTagline')}</p>
              <p className="hero-sub">{t('welcomeBody')}</p>
              <Btn onClick={() => setStep(1)} className="hero-cta">
                {t('getStarted')}
              </Btn>
              <a className="legal-link" href="#/legal">
                {t('legalLink')}
              </a>
            </div>
          )}

          {step === 1 && (
            <form
              className="pick"
              onSubmit={(e) => {
                e.preventDefault();
                if (!cleanName(name)) return;
                setName(cleanName(name));
                setStep(2);
              }}
            >
              <Fenn size={110} mood="happy" />
              <h2>{t('askName')}</h2>
              <p className="muted">{t('askNameBody')}</p>
              <input
                className="name-input"
                autoFocus
                maxLength={30}
                autoComplete="given-name"
                aria-label={t('askName')}
                placeholder={t('namePlaceholder')}
                value={name}
                onChange={(e) => setNameDraft(e.target.value)}
              />
              <p className="name-notice">
                {t('nameNotice')} <a href="#/legal">{t('nameNoticeLink')}</a>
              </p>
              <Btn block type="submit" disabled={!cleanName(name)}>
                {t('continue')}
              </Btn>
            </form>
          )}

          {step === 2 && (
            <div className="pick">
              <h2>{t('chooseCourse')}</h2>
              <div className="course-cards">
                {ordered.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    className="card-option course-card"
                    onClick={() => {
                      setCourseId(c.id);
                      setStep(3);
                    }}
                  >
                    <Flag lang={c.to} size={64} />
                    <span className="course-name">{LANGUAGE_NAMES[c.to][c.from === 'de' ? 'de' : 'en']}</span>
                    <span className="course-from">
                      <Flag lang={c.from} size={20} /> {translator(c.from)('learnFrom')}{' '}
                      {LANGUAGE_NAMES[c.from][c.from === 'de' ? 'de' : 'en']}
                    </span>
                  </button>
                ))}
              </div>
              <p className="muted">{LANGUAGE_NAMES.en[nameLang]} · {LANGUAGE_NAMES.de[nameLang]}</p>
            </div>
          )}

          {step === 3 && courseId && (
            <div className="pick">
              <Fenn size={110} mood="think" />
              <h2>{t('dailyGoalTitle')}</h2>
              <p className="muted">{t('dailyGoalBody')}</p>
              <div className="goal-list">
                {GOALS.map((g) => (
                  <button
                    type="button"
                    key={g.xp}
                    className={`card-option goal-row${goal === g.xp ? ' is-picked' : ''}`}
                    onClick={() => setGoal(g.xp)}
                  >
                    <strong>{t(g.key)}</strong>
                    <span>
                      {t('minPerDay', { n: g.min })} · {t('xpPerDay', { n: g.xp })}
                    </span>
                  </button>
                ))}
              </div>
              <Btn block onClick={() => finish(courseId, goal)}>
                {t('startLearning')}
              </Btn>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
