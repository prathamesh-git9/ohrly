import type { Course, LangCode } from '../domain/types';

/** Adding a language pair means adding a JSON course file and one line here. */
export interface CourseInfo {
  id: string;
  from: LangCode;
  to: LangCode;
}

export const COURSES: CourseInfo[] = [
  { id: 'en-de', from: 'en', to: 'de' },
  { id: 'de-en', from: 'de', to: 'en' },
];

const loaders = import.meta.glob<{ default: Course }>('./courses/*.json');
const cache = new Map<string, Promise<Course>>();

export function loadCourse(id: string): Promise<Course> {
  let pending = cache.get(id);
  if (!pending) {
    const loader = loaders[`./courses/${id}.json`];
    pending = loader
      ? loader().then((m) => m.default)
      : Promise.reject(new Error(`Unknown course ${id}`));
    // A failed chunk download must be retryable, so it must not stay cached.
    pending.catch(() => cache.delete(id));
    cache.set(id, pending);
  }
  return pending;
}

export function courseInfo(id: string): CourseInfo {
  return COURSES.find((c) => c.id === id) ?? COURSES[0]!;
}
