import type { Course } from '../domain/types';

/**
 * The real exams each level lines up with, and cumulative study hours from zero, as published by
 * Goethe-Institut and Cambridge English. Sources are in docs/RESEARCH-LEVELS.md. Ohrly is not connected
 * to these providers: the names are shown only so learners know what to aim for.
 */
export interface ExamInfo {
  /** Null where no general adult exam exists at this level. */
  exam: string | null;
  hours: string;
  minutes: number;
}

const GERMAN: Record<string, ExamInfo> = {
  A1: { exam: 'Goethe-Zertifikat A1: Start Deutsch 1, telc Deutsch A1', hours: '60–150', minutes: 55 },
  A2: { exam: 'Goethe-Zertifikat A2, telc Deutsch A2', hours: '150–260', minutes: 75 },
  B1: { exam: 'Goethe-Zertifikat B1, telc Deutsch B1', hours: '260–490', minutes: 120 },
  B2: { exam: 'Goethe-Zertifikat B2, telc Deutsch B2', hours: '450–600', minutes: 130 },
};

const ENGLISH: Record<string, ExamInfo> = {
  A1: { exam: null, hours: '90–100', minutes: 55 },
  A2: { exam: 'Cambridge A2 Key', hours: '180–200', minutes: 75 },
  B1: { exam: 'Cambridge B1 Preliminary', hours: '350–400', minutes: 120 },
  B2: { exam: 'Cambridge B2 First', hours: '500–600', minutes: 130 },
};

export function examFor(course: Course, level: string): ExamInfo {
  const table = course.to === 'de' ? GERMAN : ENGLISH;
  return table[level] ?? { exam: null, hours: '', minutes: 60 };
}
