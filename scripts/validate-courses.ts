import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildPath, allSentences, allWords } from '../src/domain/course';
import { generateLesson, mulberry32 } from '../src/domain/generator';
import type { Course } from '../src/domain/types';
import { validateCourse } from '../src/domain/validate';

/** Usage: npm run validate [-- course-id]. Exits non-zero on any error. */
const dir = join(import.meta.dirname, '..', 'src', 'content', 'courses');
const only = process.argv[2];
let failed = false;

for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const course = JSON.parse(readFileSync(join(dir, file), 'utf8')) as Course;
  if (only && course.id !== only) continue;

  const issues = validateCourse(course);
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');

  // A lesson that generates too few exercises is a content bug the schema alone can't see.
  if (errors.length === 0) {
    // Exams are not generated lessons; the validator checks their content directly.
    for (const node of buildPath(course).filter((n) => n.kind !== 'exam')) {
      for (const seed of [1, 2, 3]) {
        for (const opts of [
          { speakAvailable: true, listenAvailable: true },
          { speakAvailable: false, listenAvailable: false },
        ]) {
          const exercises = generateLesson(course, node, mulberry32(seed), opts);
          if (exercises.length < 6) {
            errors.push({
              level: 'error',
              where: node.id,
              message: `lesson generated only ${exercises.length} exercises`,
            });
          }
        }
      }
    }
  }

  const units = course.sections.reduce((n, s) => n + s.units.length, 0);
  console.log(
    `${course.id}: ${course.sections.length} chapters, ${units} units, ` +
      `${allWords(course).length} words, ${allSentences(course).length} sentences, ` +
      `${errors.length} errors, ${warnings.length} warnings`,
  );
  for (const i of errors.slice(0, 60)) console.log(`  ERROR ${i.where}: ${i.message}`);
  if (errors.length > 60) console.log(`  ...and ${errors.length - 60} more errors`);
  for (const i of warnings.slice(0, 20)) console.log(`  warn  ${i.where}: ${i.message}`);
  if (errors.length) failed = true;
}
process.exit(failed ? 1 : 0);
