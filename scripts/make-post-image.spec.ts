import { mkdirSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

/**
 * Renders the LinkedIn image: three real phone screenshots of the live app in one 1200x1200 card.
 *   npx playwright test --config scripts/post-image.config.ts
 */
const LIVE = process.env.OHRLY_URL ?? 'https://prathamesh-git9.github.io/ohrly/';
const OUT = 'post-image';

test('post image', async ({ browser }) => {
  mkdirSync(OUT, { recursive: true });
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await phone.newPage();
  await page.goto(LIVE);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/1-welcome.png` });
  await page.locator('.hero-cta').click();
  await page.locator('.name-input').fill('Alex');
  await page.locator('form.pick .btn-block').click();
  await page.locator('.course-card').filter({ hasText: /German/ }).click();
  await page.locator('.pick .btn-block').click();
  await expect(page.locator('.path-node.is-current')).toBeVisible();
  await page.waitForTimeout(4200); // Let the greeting pop-up fade.
  await page.screenshot({ path: `${OUT}/2-path.png` });
  // A sentence exercise with a character saying the line.
  await page.goto(`${LIVE}#/lesson/u01%3A2`);
  const course = JSON.parse(readFileSync('src/content/courses/en-de.json', 'utf8'));
  const words: { target: string; source: string }[] = course.sections.flatMap((s: any) => s.units.flatMap((u: any) => u.words));
  const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (let step = 0; step < 20 && !(await page.locator('.character').count()); step++) {
    if (await page.locator('.match-grid').count()) {
      const left = page.locator('.match-col').nth(0).locator('.match-card');
      for (let i = 0; i < (await left.count()); i++) {
        if (await left.nth(i).isDisabled()) continue;
        const label = ((await left.nth(i).textContent()) ?? '').trim();
        const w = words.find((x) => x.target === label);
        if (!w) continue;
        await left.nth(i).click();
        await page.locator('.match-col').nth(1).locator('.match-card').filter({ hasText: new RegExp(`^${esc(w.source)}$`) }).first().click();
        await page.waitForTimeout(330);
      }
    }
    await page.waitForTimeout(500);
  }
  // Build the CORRECT answer: a wrong one would be the first thing a German speaker notices.
  const sentences: { source: string; target: string }[] = course.sections.flatMap((x: any) => x.units.flatMap((u: any) => u.sentences));
  const prompt = ((await page.locator('.bubble').first().textContent()) ?? '').replace(/\s+/g, ' ').trim();
  const match = sentences.find((x) => x.source.trim() === prompt);
  if (!match) throw new Error(`no sentence for prompt "${prompt}"`);
  const tokens = match.target.replace(/[.,!?]/g, '').split(/\s+/).filter(Boolean);
  for (const token of tokens.slice(0, Math.max(1, tokens.length - 1))) {
    await page.locator('.tile-live').filter({ hasText: new RegExp(`^${esc(token)}$`, 'i') }).first().click();
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/3-lesson.png` });
  await phone.close();

  const card = await browser.newContext({ viewport: { width: 1200, height: 1200 }, deviceScaleFactor: 1 });
  const p = await card.newPage();
  // Embedded as data, since a page set from a string may not load local files.
  const img = (n: string) => `data:image/png;base64,${readFileSync(`${OUT}/${n}`).toString('base64')}`;
  await p.setContent(`<!doctype html><html><head><style>
    body{margin:0;width:1200px;height:1200px;font-family:'Segoe UI',system-ui,sans-serif;
      background:radial-gradient(120% 90% at 50% 0%,#fff3df,#ffe2bd 55%,#f7c98f);display:flex;flex-direction:column;align-items:center;overflow:hidden}
    h1{margin:58px 0 6px;font-size:76px;color:#5b3df5;letter-spacing:-1px}
    p.sub{margin:0 0 34px;font-size:30px;color:#2b2140;font-weight:600;text-align:center;max-width:980px}
    .phones{display:flex;gap:34px;align-items:flex-start}
    .phone{width:300px;height:650px;border-radius:44px;background:#1d1838;padding:12px;box-shadow:0 30px 60px rgba(70,40,10,.28)}
    .phone img{width:100%;height:100%;object-fit:cover;object-position:top;border-radius:34px;display:block}
    .phone.mid{margin-top:46px}
    .tags{margin-top:30px;display:flex;gap:12px;flex-wrap:wrap;justify-content:center;max-width:1080px}
    .tag{background:#fff;border:3px solid #e7d3b5;border-bottom-width:6px;border-radius:999px;padding:8px 18px;font-size:22px;font-weight:700;color:#2b2140}
  </style></head><body>
    <h1>Ohrly</h1>
    <p class="sub">A free language-learning app I built from scratch<br><span style="font-size:24px;color:#6d6480">German &amp; English &middot; A1 complete, more levels on the way</span></p>
    <div class="phones">
      <div class="phone"><img src="${img('1-welcome.png')}"></div>
      <div class="phone mid"><img src="${img('2-path.png')}"></div>
      <div class="phone"><img src="${img('3-lesson.png')}"></div>
    </div>
    <div class="tags"><span class="tag">React + TypeScript</span><span class="tag">Spaced repetition</span><span class="tag">AI voices on my own GPU</span><span class="tag">Supabase accounts</span><span class="tag">Practice exams</span></div>
  </body></html>`);
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}/ohrly-linkedin.png` });
  await card.close();
});
