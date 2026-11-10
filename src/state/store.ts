import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  computeRewards,
  dayKey,
  gainHeart,
  HEART_REFILL_COST,
  loseHeart,
  MAX_FREEZES,
  MAX_HEARTS,
  recordActivity,
  settleHearts,
  STREAK_FREEZE_COST,
  type HeartState,
  type Rewards,
  type StreakState,
} from '../domain/gamify';
import { review, type Card } from '../domain/srs';

export interface CourseProgress {
  /** Completed path nodes: node id to best accuracy and times completed. */
  done: Record<string, { best: number; count: number }>;
  cards: Record<string, Card>;
  /** Best practice-exam percentage per level. */
  examBest?: Record<string, number>;
}

export interface Settings {
  sound: boolean;
  voice: boolean;
  speaking: boolean;
  listening: boolean;
}

export type Screen = 'learn' | 'practice' | 'words' | 'profile';

export interface LessonSummary extends Rewards {
  streakExtended: boolean;
  streakCount: number;
  freezesUsed: number;
  dailyGoalReached: boolean;
  heartEarned: boolean;
}

interface State {
  onboarded: boolean;
  courseId: string | null;
  dailyGoal: number;
  settings: Settings;
  xp: number;
  xpByDay: Record<string, number>;
  gems: number;
  perfectLessons: number;
  streak: StreakState;
  hearts: HeartState;
  courses: Record<string, CourseProgress>;
  /** Achievements already celebrated, so each pops up once. */
  seenAchievements: string[];

  markAchievementsSeen(ids: readonly string[]): void;
  finishOnboarding(courseId: string, dailyGoal: number): void;
  switchCourse(courseId: string): void;
  setDailyGoal(goal: number): void;
  updateSettings(patch: Partial<Settings>): void;
  mistake(): void;
  gradeWords(courseId: string, wordIds: readonly string[], correct: boolean): void;
  finishLesson(input: {
    courseId: string;
    nodeId: string | null;
    total: number;
    mistakes: number;
    seconds: number;
    isCheckpoint: boolean;
  }): LessonSummary;
  /** Practice is how an empty heart bar is earned back, for free, always. */
  finishPractice(input: { courseId: string; total: number; mistakes: number; seconds: number }): LessonSummary;
  /** Scores a practice exam. It costs no hearts, and meeting the target opens the next level. */
  finishExam(input: { courseId: string; level: string; percent: number; targetMet: boolean }): void;
  refreshHearts(): void;
  refillHearts(): boolean;
  buyFreeze(): boolean;
  resetAll(): void;
}

const initial = {
  onboarded: false,
  courseId: null as string | null,
  dailyGoal: 20,
  settings: { sound: true, voice: true, speaking: true, listening: true },
  xp: 0,
  xpByDay: {} as Record<string, number>,
  gems: 100,
  perfectLessons: 0,
  streak: { count: 0, best: 0, lastDay: null, freezes: 0 } as StreakState,
  hearts: { count: MAX_HEARTS, regenFrom: null } as HeartState,
  courses: {} as Record<string, CourseProgress>,
  seenAchievements: [] as string[],
};

const safeStorage = createJSONStorage(() => {
  try {
    const probe = '__ohrly_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    // Private windows can refuse storage. The app still works; it just forgets on reload.
    const mem = new Map<string, string>();
    return {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
  }
});

function emptyProgress(): CourseProgress {
  return { done: {}, cards: {} };
}

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const applyRewards = (rewards: Rewards, heartEarned: boolean): LessonSummary => {
        const s = get();
        const today = dayKey(new Date());
        const before = s.xpByDay[today] ?? 0;
        const after = before + rewards.xp;
        const streak = recordActivity(s.streak, today);
        set({
          xp: s.xp + rewards.xp,
          gems: s.gems + rewards.gems,
          xpByDay: { ...s.xpByDay, [today]: after },
          streak: streak.next,
          perfectLessons: s.perfectLessons + (rewards.perfect ? 1 : 0),
        });
        return {
          ...rewards,
          streakExtended: streak.extended,
          streakCount: streak.next.count,
          freezesUsed: streak.freezesUsed,
          dailyGoalReached: before < s.dailyGoal && after >= s.dailyGoal,
          heartEarned,
        };
      };

      return {
        ...initial,

        markAchievementsSeen: (ids) =>
          set((s) => ({ seenAchievements: [...new Set([...s.seenAchievements, ...ids])] })),

        finishOnboarding: (courseId, dailyGoal) =>
          set((s) => ({
            onboarded: true,
            courseId,
            dailyGoal,
            courses: { ...s.courses, [courseId]: s.courses[courseId] ?? emptyProgress() },
          })),

        switchCourse: (courseId) =>
          set((s) => ({
            courseId,
            courses: { ...s.courses, [courseId]: s.courses[courseId] ?? emptyProgress() },
          })),

        setDailyGoal: (dailyGoal) => set({ dailyGoal }),

        updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

        mistake: () => set((s) => ({ hearts: loseHeart(s.hearts, Date.now()) })),

        gradeWords: (courseId, wordIds, correct) =>
          set((s) => {
            const progress = s.courses[courseId] ?? emptyProgress();
            const cards = { ...progress.cards };
            const now = Date.now();
            for (const id of wordIds) cards[id] = review(cards[id], correct ? 4 : 1, now);
            return { courses: { ...s.courses, [courseId]: { ...progress, cards } } };
          }),

        finishLesson: ({ courseId, nodeId, total, mistakes, seconds, isCheckpoint }) => {
          const s = get();
          const progress = s.courses[courseId] ?? emptyProgress();
          const previous = nodeId ? progress.done[nodeId] : undefined;
          const rewards = computeRewards({
            total,
            mistakes,
            seconds,
            isCheckpoint,
            isReplay: !!previous,
          });
          if (nodeId) {
            set({
              courses: {
                ...s.courses,
                [courseId]: {
                  ...progress,
                  done: {
                    ...progress.done,
                    [nodeId]: {
                      best: Math.max(previous?.best ?? 0, rewards.accuracy),
                      count: (previous?.count ?? 0) + 1,
                    },
                  },
                },
              },
            });
          }
          return applyRewards(rewards, false);
        },

        finishPractice: ({ total, mistakes, seconds }) => {
          const s = get();
          const rewards = computeRewards({
            total,
            mistakes,
            seconds,
            isCheckpoint: false,
            isReplay: false,
          });
          const hearts = settleHearts(s.hearts, Date.now());
          const heartEarned = hearts.count < MAX_HEARTS;
          set({ hearts: gainHeart(hearts, Date.now()) });
          return applyRewards(rewards, heartEarned);
        },

        finishExam: ({ courseId, level, percent, targetMet }) =>
          set((s) => {
            const progress = s.courses[courseId] ?? emptyProgress();
            const nodeId = `${level}:exam`;
            const previous = progress.done[nodeId];
            const firstTime = targetMet && !previous;
            return {
              xp: s.xp + (firstTime ? 50 : 0),
              gems: s.gems + (firstTime ? 100 : 0),
              courses: {
                ...s.courses,
                [courseId]: {
                  ...progress,
                  examBest: {
                    ...progress.examBest,
                    [level]: Math.max(progress.examBest?.[level] ?? 0, percent),
                  },
                  done: targetMet
                    ? {
                        ...progress.done,
                        [nodeId]: {
                          best: Math.max(previous?.best ?? 0, percent / 100),
                          count: (previous?.count ?? 0) + 1,
                        },
                      }
                    : progress.done,
                },
              },
            };
          }),

        refreshHearts: () =>
          set((s) => {
            const hearts = settleHearts(s.hearts, Date.now());
            return hearts === s.hearts ? s : { hearts };
          }),

        refillHearts: () => {
          const s = get();
          if (s.gems < HEART_REFILL_COST || s.hearts.count >= MAX_HEARTS) return false;
          set({
            gems: s.gems - HEART_REFILL_COST,
            hearts: { count: MAX_HEARTS, regenFrom: null },
          });
          return true;
        },

        buyFreeze: () => {
          const s = get();
          if (s.gems < STREAK_FREEZE_COST || s.streak.freezes >= MAX_FREEZES) return false;
          set({
            gems: s.gems - STREAK_FREEZE_COST,
            streak: { ...s.streak, freezes: s.streak.freezes + 1 },
          });
          return true;
        },

        resetAll: () => set({ ...initial }),
      };
    },
    {
      name: 'ohrly-v1',
      storage: safeStorage,
      partialize: (s) => ({
        onboarded: s.onboarded,
        courseId: s.courseId,
        dailyGoal: s.dailyGoal,
        settings: s.settings,
        xp: s.xp,
        xpByDay: s.xpByDay,
        gems: s.gems,
        perfectLessons: s.perfectLessons,
        streak: s.streak,
        hearts: s.hearts,
        courses: s.courses,
        seenAchievements: s.seenAchievements,
      }),
    },
  ),
);

export function useProgress(courseId: string): CourseProgress {
  return useStore((s) => s.courses[courseId]) ?? EMPTY;
}
const EMPTY: CourseProgress = emptyProgress();
