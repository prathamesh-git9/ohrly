/** Achievements, worked out from progress alone, so they can never disagree with it. */
export interface AchievementInput {
  xp: number;
  bestStreak: number;
  perfectLessons: number;
  wordsMet: number;
  lessonsDone: number;
  checkpointsPassed: number;
  examsPassed: number;
  coursesStarted: number;
}

export interface Achievement {
  id: string;
  /** Icon name, mapped to a component by the screens. */
  icon: 'flame' | 'star' | 'book' | 'zap' | 'sparkles' | 'trophy' | 'graduation' | 'globe';
  /** The rung of a ladder: 1, 2, 3. */
  tier: number;
  goal: number;
  value: (s: AchievementInput) => number;
}

function ladder(
  base: string,
  icon: Achievement['icon'],
  goals: number[],
  value: Achievement['value'],
): Achievement[] {
  return goals.map((goal, i) => ({ id: `${base}-${goal}`, icon, tier: i + 1, goal, value }));
}

export const ACHIEVEMENTS: Achievement[] = [
  ...ladder('lessons', 'star', [1, 10, 50, 150], (s) => s.lessonsDone),
  ...ladder('streak', 'flame', [3, 7, 30, 100, 365], (s) => s.bestStreak),
  ...ladder('words', 'book', [50, 250, 1000], (s) => s.wordsMet),
  ...ladder('xp', 'zap', [100, 1000, 5000], (s) => s.xp),
  ...ladder('perfect', 'sparkles', [1, 10, 50], (s) => s.perfectLessons),
  ...ladder('checkpoint', 'trophy', [1, 6], (s) => s.checkpointsPassed),
  ...ladder('exam', 'graduation', [1, 2, 4], (s) => s.examsPassed),
  ...ladder('courses', 'globe', [2], (s) => s.coursesStarted),
];

export function unlocked(input: AchievementInput): Set<string> {
  return new Set(ACHIEVEMENTS.filter((a) => a.value(input) >= a.goal).map((a) => a.id));
}

/** How far towards an achievement, 0 to 1. */
export function progressTowards(a: Achievement, input: AchievementInput): number {
  return Math.min(1, a.value(input) / a.goal);
}
