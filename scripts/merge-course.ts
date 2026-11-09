import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Courses are authored one chapter per file so they stay reviewable:
 *   content-src/<id>/meta.json  and  content-src/<id>/chapter-01.json ...
 * This merges them into src/content/courses/<id>.json. Usage: npm run course -- en-de
 */
const root = join(import.meta.dirname, '..');
const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.error('Usage: npm run course -- <course-id> [...]');
  process.exit(1);
}
for (const id of ids) {
  const dir = join(root, 'content-src', id);
  const meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8'));
  const chapters = readdirSync(dir)
    .filter((f) => /^chapter-\d+\.json$/.test(f))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
  // Authored as exam-A1.json and so on, in ladder order.
  const exams = readdirSync(dir)
    .filter((f) => /^exam-[A-C][12]\.json$/.test(f))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
  const out = join(root, 'src', 'content', 'courses');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, `${id}.json`), JSON.stringify({ ...meta, sections: chapters, exams }));
  console.log(`${id}: merged ${chapters.length} chapters`);
}
