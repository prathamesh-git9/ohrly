import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Course } from '../src/domain/types';

/** Prints every taught word and form compactly, so an author need not read every earlier chapter. */
const id = process.argv[2];
if (!id) {
  console.error('Usage: npm run vocab -- <course-id>');
  process.exit(1);
}
const file = join(import.meta.dirname, '..', 'src', 'content', 'courses', `${id}.json`);
const course = JSON.parse(readFileSync(file, 'utf8')) as Course;
console.log(`Names: ${(course.names ?? []).join(', ')}`);
for (const section of course.sections) {
  console.log(`\n# ${section.id} ${section.cefr}: ${section.title}`);
  for (const unit of section.units) {
    console.log(`\n## ${unit.id} ${unit.title} [${unit.tip.title}]`);
    for (const w of unit.words) {
      const forms = [...(w.forms ?? []), ...(w.plural ? [w.plural] : [])];
      console.log(`${w.id}: ${w.target} = ${w.source}${forms.length ? ` | ${forms.join(', ')}` : ''}`);
    }
  }
}
