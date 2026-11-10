import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { tokenize } from '../../src/domain/check';
import type { Course, Sentence, Word } from '../../src/domain/types';

const COURSE_DIR = join(import.meta.dirname, '..', '..', 'src', 'content', 'courses');

function loadCourse(id: string) {
  const course = JSON.parse(readFileSync(join(COURSE_DIR, `${id}.json`), 'utf8')) as Course;
  const units = course.sections.flatMap((s) => s.units);
  return { words: units.flatMap((u) => u.words), sentences: units.flatMap((u) => u.sentences) };
}

async function onboard(page: Page, course: RegExp) {
  await page.goto('./');
  await page.locator('.hero-cta').click();
  await page.locator('.course-card').filter({ hasText: course }).click();
  await page.locator('.goal-row').nth(1).click();
  await page.locator('.pick .btn-block').click();
  await expect(page.locator('.path')).toBeVisible();
}

async function startCurrentLesson(page: Page) {
  await page.locator('.path-node.is-current').click();
  await page.locator('.node-pop .btn').click();
  await expect(page.locator('.lesson')).toBeVisible();
}

/** Writes straight into the persisted store, then reloads into that state. */
async function setHearts(page: Page, count: number) {
  await page.evaluate((n) => {
    const data = JSON.parse(localStorage.getItem('ohrly-v1')!);
    data.state.hearts = { count: n, regenFrom: null };
    localStorage.setItem('ohrly-v1', JSON.stringify(data));
  }, count);
  await page.reload();
  await expect(page.locator('.path')).toBeVisible();
}

const same = (a: string | null, b: string) => (a ?? '').trim().toLowerCase() === b.trim().toLowerCase();
const clean = (t: string | null) => (t ?? '').replace(/\s+/g, ' ').trim();

async function clickTiles(page: Page, answer: string) {
  for (const token of tokenize(answer)) {
    const tile = page.locator('.tile-live').filter({ hasText: new RegExp(`^${escapeRe(token)}$`, 'i') }).first();
    await tile.click();
  }
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function solveMatch(page: Page, words: Word[]) {
  const left = page.locator('.match-col').nth(0).locator('.match-card');
  const right = page.locator('.match-col').nth(1).locator('.match-card');
  const n = await left.count();
  for (let i = 0; i < n; i++) {
    const target = clean(await left.nth(i).textContent());
    const word = words.find((w) => same(w.target, target));
    if (!word) throw new Error(`no word for match card "${target}"`);
    await left.nth(i).click();
    await right.filter({ hasText: new RegExp(`^${escapeRe(word.source)}$`, 'i') }).first().click();
    await page.waitForTimeout(330);
  }
}

/**
 * Plays the lesson on screen answering every exercise correctly from the course data, which also
 * proves that every exercise type can really be answered. Listening prompts reveal nothing on
 * screen, so their answers come from a recording of what the app asked to be spoken.
 */
async function playPerfectly(page: Page, courseId: string) {
  const { words, sentences } = loadCourse(courseId);
  const bySentenceText = (text: string): Sentence | undefined =>
    sentences.find((s) => clean(s.source) === text || clean(s.target) === text);
  const seen = new Set<string>();

  for (let step = 0; step < 80; step++) {
    if (await page.locator('.done').isVisible()) return seen;
    const foot = page.locator('.foot-row .btn');

    if (await page.locator('.feedback').isVisible()) {
      await foot.click();
      await expect(page.locator('.feedback')).toBeHidden();
      await page.waitForTimeout(220);
      continue;
    }
    if (await page.locator('.intro-card').isVisible()) {
      seen.add('intro');
      await foot.click();
      await expect(page.locator('.intro-card'), 'one click must leave a new-word card').toBeHidden();
      await page.waitForTimeout(150);
      continue;
    }
    const titleEl = page.locator('.ex-title').first();
    if (!(await titleEl.isVisible())) {
      await page.waitForTimeout(100);
      continue;
    }
    const title = clean(await titleEl.textContent());

    if (await page.locator('.match-grid').isVisible()) {
      seen.add('match');
      await solveMatch(page, words);
      await page.waitForTimeout(450);
      continue;
    }
    const bubble = page.locator('.bubble');
    if (await page.locator('.pic-card').count()) {
      seen.add('picture');
      const prompt = clean(await page.locator('.ex-prompt').textContent());
      const word = words.find((w) => same(w.source, prompt))!;
      await page.locator('.pic-card').filter({ hasText: word.target }).first().click();
    } else if (await page.locator('.cloze-line').count()) {
      seen.add('cloze');
      const source = clean(await page.locator('.ex-sub').textContent());
      const s = sentences.find((x) => x.cloze && clean(x.source) === source)!;
      await page.locator('.option-list .card-option').filter({ hasText: new RegExp(`${escapeRe(s.cloze!.answer)}$`) }).first().click();
    } else if (await page.locator('.option-list').count()) {
      const said = await page.evaluate(() => (window as unknown as { __said?: string }).__said ?? '');
      const prompt = (await bubble.count()) ? clean(await bubble.textContent()) : said;
      seen.add(await bubble.count() ? 'wordChoice' : 'listenChoice');
      const word = words.find((w) => same(w.target, prompt)) ?? words.find((w) => same(w.target, said));
      if (!word) throw new Error(`no word for prompt "${prompt}" (said "${said}")`);
      await page.locator('.option-list .card-option').filter({ hasText: new RegExp(`${escapeRe(word.source)}$`, 'i') }).first().click();
    } else if (await page.locator('.tile-bank').count()) {
      const said = await page.evaluate(() => (window as unknown as { __said?: string }).__said ?? '');
      if (await bubble.count()) {
        seen.add('bank');
        const prompt = clean(await bubble.textContent());
        // Several sentences can share a prompt ("You are Ben" is Du bist Ben or Sie sind Ben):
        // the one asked is the one whose words are all on the tiles.
        const tiles = (await page.locator('.tile-live').allTextContents()).map((x) => x.trim().toLowerCase());
        const answers = sentences
          .flatMap((x) => (clean(x.source) === prompt ? [x.target] : clean(x.target) === prompt ? [x.source] : []));
        const fits = (a: string) => tokenize(a).every((tok) => tiles.includes(tok.toLowerCase()));
        await clickTiles(page, answers.find(fits) ?? answers[0]!);
      } else {
        seen.add('listenBank');
        await clickTiles(page, said);
      }
    } else if (await page.locator('.type-box').count()) {
      const said = await page.evaluate(() => (window as unknown as { __said?: string }).__said ?? '');
      if (await bubble.count()) {
        seen.add('type');
        const prompt = clean(await bubble.textContent());
        const s = bySentenceText(prompt)!;
        await page.locator('.type-box').fill(clean(s.source) === prompt ? s.target : s.source);
      } else {
        seen.add('listenType');
        await page.locator('.type-box').fill(said);
      }
    } else if (await page.locator('.mic-btn').count()) {
      seen.add('speak');
      await page.getByRole('button', { name: /can't speak|nicht sprechen/i }).click();
      await page.waitForTimeout(250);
      continue;
    } else {
      throw new Error(`unknown exercise "${title}"`);
    }
    await expect(foot).toBeEnabled();
    await foot.click();
    await expect(page.locator('.feedback')).toBeVisible();
    await expect(page.locator('.lesson-foot'), `wrong on "${title}"`).toHaveClass(/is-right/);
  }
  throw new Error('lesson did not end');
}

/** Records every spoken text: the only way a test can know what a listening exercise said. */
async function recordSpeech(page: Page) {
  await page.addInitScript(() => {
    const realPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      return realPlay.call(this).catch(() => undefined) as Promise<void>;
    };
    if ('speechSynthesis' in window) {
      const realSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
      window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
        (window as unknown as { __said: string }).__said = u.text;
        realSpeak(u);
      };
    }
  });
}

/** Forces browser-voice playback so the spoken text is observable, whatever audio is installed. */
async function forceBrowserVoice(page: Page) {
  await page.route('**/audio/*/manifest.json', (r) => r.fulfill({ json: {} }));
}

test('new learner onboards and sees the path with one open lesson', async ({ page }) => {
  await onboard(page, /German/);
  await expect(page.locator('.chapter-head').first()).toBeVisible();
  await expect(page.locator('.path-node.is-current')).toHaveCount(1);
  await expect(page.locator('.path-node.is-locked').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/path.png' });
  const noScroll = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
  expect(noScroll).toBe(true);
});

test('German speakers get a German interface', async ({ page }) => {
  await onboard(page, /Englisch/);
  await expect(page.getByText(/Kapitel 1/).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Üben/ }).first()).toBeVisible();
});

for (const [courseId, label] of [['en-de', /German/], ['de-en', /Englisch/]] as const) {
  test(`${courseId}: a perfect lesson finishes, unlocks the next, and pays exactly once`, async ({ page }) => {
    await recordSpeech(page);
    await forceBrowserVoice(page);
    await onboard(page, label);
    await startCurrentLesson(page);
    await page.screenshot({ path: `test-results/${courseId}-lesson.png` });
    const seen = await playPerfectly(page, courseId);
    console.log(`${courseId} exercise types:`, [...seen].join(', '));
    expect(seen.size).toBeGreaterThanOrEqual(3);

    await expect(page.locator('.done')).toBeVisible();
    await page.screenshot({ path: `test-results/${courseId}-complete.png` });
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('ohrly-v1')!).state);
    expect(state.xp).toBe(15); // 10 for the lesson + 5 perfect, once, even under StrictMode.
    expect(Object.keys(state.courses[courseId].done)).toHaveLength(1);
    expect(state.streak.count).toBe(1);
    expect(state.hearts.count).toBe(5);
    expect(Object.keys(state.courses[courseId].cards).length).toBeGreaterThan(0);

    await page.locator('.done-foot .btn').click(); // Stats, then the streak screen.
    await expect(page.locator('.streak-flame')).toBeVisible();
    await page.locator('.done-foot .btn').click();
    await expect(page.locator('.path')).toBeVisible();
    await expect(page.locator('.path-node.is-done')).toHaveCount(1);
    await expect(page.locator('.path-node.is-current')).toHaveCount(1);
  });
}

for (const [courseId, label] of [['en-de', /German/], ['de-en', /Englisch/]] as const) {
  test(`${courseId}: every lesson type can be answered correctly, including the chapter test`, async ({ page }) => {
    test.setTimeout(420_000);
    await recordSpeech(page);
    await forceBrowserVoice(page);
    await onboard(page, label);
    const seen = new Set<string>();
    for (const node of ['u01:2', 'u01:3', 'u01:4', 'u02:4', 'c01:checkpoint']) {
      await page.goto(`./#/lesson/${encodeURIComponent(node)}`);
      await expect(page.locator('.lesson')).toBeVisible();
      for (const kind of await playPerfectly(page, courseId)) seen.add(kind);
      await expect(page.locator('.done')).toBeVisible();
      await page.goto('./#/');
      await expect(page.locator('.path')).toBeVisible();
    }
    console.log(`${courseId} exercise types:`, [...seen].join(', '));
    for (const kind of ['bank', 'listenBank', 'type', 'cloze', 'listenType', 'match']) {
      expect([...seen], `never saw ${kind}`).toContain(kind);
    }
  });
}

test('a wrong answer costs a heart, shows the answer and comes back later', async ({ page }) => {
  await recordSpeech(page);
  await forceBrowserVoice(page);
  await onboard(page, /German/);
  await startCurrentLesson(page);
  await page.locator('.foot-row .btn').click(); // Pass the first new-word card.
  await expect(page.locator('.intro-card')).toBeHidden();

  const { words } = loadCourse('en-de');
  const firstOption = page.locator('.pic-card, .option-list .card-option');
  await expect(firstOption.first()).toBeVisible();
  // Pick an option that is definitely wrong: anything not matching the prompt.
  const prompt = clean(await page.locator('.ex-prompt, .bubble').first().textContent());
  const right = words.find((w) => same(w.source, prompt) || same(w.target, prompt))!;
  const count = await firstOption.count();
  for (let i = 0; i < count; i++) {
    const text = clean(await firstOption.nth(i).textContent());
    if (!text.includes(right.source) && !text.includes(right.target)) {
      await firstOption.nth(i).click();
      break;
    }
  }
  await page.locator('.foot-row .btn').click();
  await expect(page.locator('.lesson-foot')).toHaveClass(/is-wrong/);
  await expect(page.locator('.feedback')).toContainText(right.source);
  await expect(page.locator('.lesson-top .stat-hearts')).toContainText('4');
  await page.screenshot({ path: 'test-results/wrong.png' });
});

test('running out of hearts never dead-ends: practice earns one back for free', async ({ page }) => {
  await recordSpeech(page);
  await forceBrowserVoice(page);
  await onboard(page, /German/);
  await startCurrentLesson(page);
  const seen = await playPerfectly(page, 'en-de');
  expect(seen.size).toBeGreaterThan(0);
  await page.locator('.done-foot .btn').click();
  await page.locator('.done-foot .btn').click();
  await expect(page.locator('.path')).toBeVisible();
  await setHearts(page, 0);

  await startCurrentLesson(page);
  const modal = page.locator('.modal');
  await expect(modal).toBeVisible();
  await expect(modal).not.toContainText(/\$|€|buy|purchase|subscribe|premium/i);
  await page.screenshot({ path: 'test-results/no-hearts.png' });
  await modal.locator('.btn').first().click();

  await playPerfectly(page, 'en-de');
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('ohrly-v1')!).state);
  expect(state.hearts.count).toBe(1);
});

test('progress survives a reload, and refreshing on any route works', async ({ page }) => {
  await onboard(page, /German/);
  await page.goto('./#/profile');
  await page.reload();
  await expect(page.locator('.shell')).toBeVisible();
  await expect(page.locator('.hero-cta')).toHaveCount(0);
});

test('no console errors or sideways scroll on any screen', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await onboard(page, /German/);
  for (const route of ['#/practice', '#/words', '#/profile', '#/']) {
    await page.goto(`./${route}`);
    await page.waitForTimeout(250);
    await page.screenshot({ path: `test-results/screen-${route.replace(/\W/g, '') || 'home'}.png` });
    const noScroll = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );
    expect(noScroll, `horizontal scroll on ${route}`).toBe(true);
  }
  expect(errors).toEqual([]);
});

interface ExamQ { q: string; answer: string }

function examAnswers(courseId: string, level: string): Map<string, string> {
  const course = JSON.parse(readFileSync(join(COURSE_DIR, `${courseId}.json`), 'utf8')) as Course;
  const exam = course.exams?.find((e) => e.level === level);
  if (!exam) throw new Error(`no ${level} exam in ${courseId}`);
  const map = new Map<string, string>();
  for (const p of [...exam.reading, ...exam.listening]) for (const q of p.questions as ExamQ[]) map.set(q.q, q.answer);
  for (const item of exam.language) map.set(item.text, item.answer);
  return map;
}

async function takeExam(page: Page, answers: Map<string, string>, correctly: boolean) {
  await page.locator('.exam-intro .btn').first().click();
  for (let i = 0; i < 200 && !(await page.locator('.exam-result').count()); i++) {
    const q = clean(await page.locator('.passage-q').textContent());
    const answer = answers.get(q);
    if (!answer) throw new Error(`no answer for "${q}"`);
    const options = page.locator('.option-list .card-option');
    const count = await options.count();
    let target = -1;
    for (let j = 0; j < count; j++) {
      // The label is the option's last span; the first holds the keyboard hint digit.
      const text = clean(await options.nth(j).locator('span').last().textContent());
      if ((text === answer) === correctly) {
        target = j;
        break;
      }
    }
    if (target < 0) throw new Error(`no option for "${answer}"`);
    await options.nth(target).click();
    // No feedback mid-exam: it is scored only at the end.
    await expect(page.locator('.feedback')).toHaveCount(0);
    await page.locator('.foot-row .btn').click();
  }
}

test('the A1 practice exam scores at the end, shows the disclaimer, and opens the next level', async ({ page }) => {
  test.setTimeout(240_000);
  await forceBrowserVoice(page);
  await onboard(page, /German/);
  const answers = examAnswers('en-de', 'A1');

  // A failed attempt is recorded but does not unlock anything.
  await page.goto('./#/exam/A1');
  await takeExam(page, answers, false);
  await expect(page.locator('.exam-result h1')).toHaveText('Keep practising');
  await expect(page.locator('.exam-percent')).toHaveText('0%');
  let state = await page.evaluate(() => JSON.parse(localStorage.getItem('ohrly-v1')!).state);
  expect(state.courses['en-de'].done['A1:exam']).toBeUndefined();

  await page.getByRole('button', { name: 'Try the exam again' }).click();
  await expect(page.locator('.exam-intro')).toBeVisible();
  await takeExam(page, answers, true);
  await expect(page.locator('.exam-result h1')).toHaveText('Practice target met');
  await expect(page.locator('.exam-percent')).toHaveText('100%');
  await expect(page.locator('.exam-disclaimer')).toContainText('not a certificate');
  await expect(page.locator('.exam-disclaimer')).toContainText(/does not certify a CEFR level/);
  await page.screenshot({ path: 'test-results/exam-result.png', fullPage: true });

  // Writing and speaking: a model answer and checklist, never a score.
  await page.locator('.task .btn').first().click();
  await expect(page.locator('.task-model').first()).toBeVisible();

  state = await page.evaluate(() => JSON.parse(localStorage.getItem('ohrly-v1')!).state);
  expect(state.courses['en-de'].done['A1:exam']).toBeTruthy();
  expect(state.courses['en-de'].examBest.A1).toBe(100);
  expect(state.hearts.count).toBe(5); // Exams never cost hearts.

  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.locator('.level-step').first()).toHaveClass(/is-complete/);
});
