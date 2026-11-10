import { BookOpen, Dumbbell, Flame, Sparkle, Heart, Home as HomeIcon, Target, User, Zap } from 'lucide-react';
import { MotionConfig } from 'motion/react';
import { useEffect, useState } from 'react';
import { setSfxEnabled } from './audio/sfx';
import { setVoicesEnabled } from './audio/speech';
import { Fenn } from './components/Fenn';
import { Btn, Flag, MadeBy, Modal, ProgressBar } from './components/ui';
import { courseInfo, loadCourse } from './content';
import { dayKey, displayedStreak } from './domain/gamify';
import type { Course } from './domain/types';
import { browserLang, translator, type Translate } from './i18n';
import { navigate, useRoute } from './router';
import { Exam } from './screens/Exam';
import { Home } from './screens/Home';
import { Legal } from './screens/Legal';
import { Account } from './screens/Account';
import { AchievementToasts, LevelScale, ShareButton, StreakModal } from './components/Social';
import { useCloud, useCloudSyncEngine } from './sync/useCloudSync';
import { cloudEnabled } from './sync/cloud';
import { AnimatePresence } from 'motion/react';
import { Share2, UserPlus } from 'lucide-react';
import { Lesson, type LessonSpec } from './screens/Lesson';
import { Practice } from './screens/Practice';
import { Profile } from './screens/Profile';
import { Welcome } from './screens/Welcome';
import { WordList } from './screens/WordList';
import { useStore } from './state/store';

function useCourse(id: string | null) {
  const [state, setState] = useState<{ id: string; course: Course } | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!id) return;
    let live = true;
    setFailed(false);
    loadCourse(id).then(
      (course) => live && setState({ id, course }),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [id, attempt]);
  return {
    course: state && state.id === id ? state.course : null,
    failed,
    retry: () => setAttempt((a) => a + 1),
  };
}

function Stats({ t, lang }: { t: Translate; lang?: string }) {
  const [streakOpen, setStreakOpen] = useState(false);
  const hearts = useStore((s) => s.hearts.count);
  const gems = useStore((s) => s.gems);
  const streak = useStore((s) => s.streak);
  const count = displayedStreak(streak, dayKey(new Date()));
  return (
    <div className="stats" aria-label={t('navProfile')}>
      <button
        type="button"
        className={`stat stat-streak stat-button${count > 0 ? ' is-lit' : ''}`}
        aria-label={t('streakDaysTitle', { n: count })}
        onClick={() => setStreakOpen(true)}
      >
        <Flame fill={count > 0 ? 'currentColor' : 'none'} strokeWidth={2.4} />
        <span>{count}</span>
      </button>
      <AnimatePresence>
        {streakOpen && <StreakModal t={t} lang={lang ?? 'en'} onClose={() => setStreakOpen(false)} />}
      </AnimatePresence>
      <span className="stat stat-gems" title="Sparks">
        <Sparkle strokeWidth={2.4} />
        <span>{gems}</span>
      </span>
      <span className="stat stat-hearts" title="Hearts">
        <Heart fill="currentColor" strokeWidth={2} />
        <span>{hearts}</span>
      </span>
    </div>
  );
}

const NAV = [
  { path: '/', Icon: HomeIcon, key: 'navLearn' },
  { path: '/practice', Icon: Dumbbell, key: 'navPractice' },
  { path: '/words', Icon: BookOpen, key: 'navWords' },
  { path: '/profile', Icon: User, key: 'navProfile' },
] as const;


function TopActions({ t }: { t: Translate }) {
  const { session } = useCloud();
  const [shareOpen, setShareOpen] = useState(false);
  const streak = useStore((s) => s.streak);
  return (
    <div className="top-actions">
      <button type="button" className="icon-btn" aria-label={t('share')} onClick={() => setShareOpen(true)}>
        <Share2 strokeWidth={2.6} />
      </button>
      {cloudEnabled && !session && (
        <a className="signup-pill" href="#/account">
          <UserPlus size={16} /> {t('signUp')}
        </a>
      )}
      <AnimatePresence>
        {shareOpen && (
          <Modal onClose={() => setShareOpen(false)}>
            <h3>{t('shareTitle')}</h3>
            <ShareButton t={t} kind="streak" value={displayedStreak(streak, dayKey(new Date()))} />
            <Btn block variant="ghost" onClick={() => setShareOpen(false)}>{t('notNow')}</Btn>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function Shell({
  route,
  course,
  t,
  children,
}: {
  route: string;
  course: Course;
  t: Translate;
  children: React.ReactNode;
}) {
  const dailyGoal = useStore((s) => s.dailyGoal);
  const todayXp = useStore((s) => s.xpByDay[dayKey(new Date())] ?? 0);
  const totalXp = useStore((s) => s.xp);
  return (
    <div className="shell">
      <aside className="side-nav">
        <a className="side-brand" href="#/">
          <Fenn size={44} />
          <span className="brand brand-sm">Ohrly</span>
        </a>
        <MadeBy label={t('madeBy', { name: 'Prathamesh' })} className="made-by-side" />
        <nav>
          {NAV.map(({ path, Icon, key }) => (
            <a key={path} className={`nav-item${route === path ? ' is-active' : ''}`} href={`#${path}`}>
              <Icon strokeWidth={2.6} />
              <span>{t(key)}</span>
            </a>
          ))}
        </nav>
      </aside>

      <div className="shell-main">
        <header className="top-bar">
          <button type="button" className="top-flag" onClick={() => navigate('/profile')} aria-label={course.title}>
            <Flag lang={course.to} size={32} />
          </button>
          <MadeBy label={t('madeBy', { name: 'Prathamesh' })} className="made-by-top" />
          <TopActions t={t} />
          <Stats t={t} lang={course.from} />
        </header>
        <main className="content">{children}</main>
      </div>

      <aside className="side-panel">
        <div className="side-top">
          <TopActions t={t} />
          <Stats t={t} lang={course.from} />
        </div>
        <LevelScale course={course} t={t} />
        <div className="panel-card">
          <h4>
            <Target size={18} /> {t('dailyGoal')}
          </h4>
          <ProgressBar value={Math.min(1, todayXp / dailyGoal)} color="var(--gold)" />
          <p>
            {todayXp} / {dailyGoal} XP
          </p>
        </div>
        <div className="panel-card">
          <h4>
            <Zap size={18} /> {t('totalXp')}
          </h4>
          <p className="panel-big">{totalXp}</p>
        </div>
      </aside>

      <nav className="bottom-nav">
        {NAV.map(({ path, Icon, key }) => (
          <a key={path} className={`bottom-item${route === path ? ' is-active' : ''}`} href={`#${path}`} aria-label={t(key)}>
            <Icon strokeWidth={2.6} />
            <span>{t(key)}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}

function lessonSpecFrom(route: string): LessonSpec | null {
  const node = route.match(/^\/lesson\/(.+)$/);
  if (node) return { type: 'node', nodeId: decodeURIComponent(node[1]!) };
  const practice = route.match(/^\/lesson-practice\/(due|weak|listening)$/);
  if (practice) return { type: 'practice', mode: practice[1] as 'due' | 'weak' | 'listening' };
  return null;
}

export function App() {
  const route = useRoute();
  const onboarded = useStore((s) => s.onboarded);
  const courseId = useStore((s) => s.courseId);
  const settings = useStore((s) => s.settings);
  const refreshHearts = useStore((s) => s.refreshHearts);
  const { course, failed, retry } = useCourse(onboarded ? courseId : null);
  useCloudSyncEngine();

  useEffect(() => setSfxEnabled(settings.sound), [settings.sound]);
  useEffect(() => setVoicesEnabled(settings.voice), [settings.voice]);
  useEffect(() => {
    refreshHearts();
    const timer = window.setInterval(refreshHearts, 30_000);
    return () => window.clearInterval(timer);
  }, [refreshHearts]);

  const lang = courseId ? courseInfo(courseId).from : undefined;
  useEffect(() => {
    if (lang) document.documentElement.lang = lang;
  }, [lang]);

  let view: React.ReactNode;
  if (route === '/legal') {
    view = <Legal lang={lang ?? browserLang()} />;
  } else if (!onboarded || !courseId) {
    view = <Welcome />;
  } else if (!course) {
    const t = translator(courseInfo(courseId).from);
    view = (
      <div className="center-screen">
        <Fenn mood={failed ? 'sad' : 'think'} />
        <p>{failed ? t('loadFailed') : t('loading')}</p>
        {failed && <Btn onClick={retry}>{t('retry')}</Btn>}
      </div>
    );
  } else {
    const t = translator(course.from);
    const spec = lessonSpecFrom(route);
    const examLevel = route.match(/^\/exam\/([A-C][12])$/)?.[1];
    if (examLevel) {
      view = <Exam key={route} course={course} level={examLevel} t={t} />;
    } else if (spec) {
      view = <Lesson key={route} course={course} spec={spec} t={t} />;
    } else {
      const page =
        route === '/practice' ? (
          <Practice course={course} t={t} />
        ) : route === '/words' ? (
          <WordList course={course} t={t} />
        ) : route === '/account' ? (
          <Account t={t} />
        ) : route === '/profile' ? (
          <Profile course={course} t={t} />
        ) : (
          <Home course={course} t={t} />
        );
      view = (
        <Shell route={route} course={course} t={t}>
          {page}
        </Shell>
      );
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      {view}
      {course && <AchievementToasts t={translator(course.from)} />}
    </MotionConfig>
  );
}
