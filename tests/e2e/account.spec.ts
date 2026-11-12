import { expect, test } from './silent';

/**
 * Talks to the real Supabase project when the build has its settings, and checks the screens
 * without creating any account: a wrong password must fail cleanly, with a readable message.
 */
test('accounts: sign-up form, a failed login shows its error, and legal pages are reachable', async ({ page }) => {
  await page.goto('./');
  await page.locator('.hero-cta').click();
  await page.locator('.name-input').fill('Mara');
  await page.locator('form.pick .btn-block').click();
  await page.locator('.course-card').filter({ hasText: /German/ }).click();
  await page.locator('.pick .btn-block').click();
  await expect(page.locator('.path')).toBeVisible();

  await page.goto('./#/account');
  const configured = await page.locator('.account-form').count();
  test.skip(configured === 0, 'accounts are not configured in this build');

  await expect(page.getByRole('heading', { name: 'Sign up' })).toBeVisible();
  await expect(page.locator('.age-note')).toContainText('16');
  await page.getByRole('button', { name: 'Already have an account? Log in' }).click();
  await page.locator('input[type=email]').fill('nobody.ohrly.test@example.com');
  await page.locator('input[type=password]').fill('definitely-wrong-password');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.locator('.form-msg.is-error')).toBeVisible({ timeout: 30000 });
  // Either the server's answer, or the friendly message if the connection dropped twice: never raw jargon.
  await expect(page.locator('.form-msg.is-error')).toContainText(/invalid login credentials|couldn't reach the server/i);

  await page.goto('./#/legal');
  await expect(page.getByRole('heading', { name: 'Privacy' })).toBeVisible();
  await expect(page.locator('#legal-privacy')).toContainText('Paris');
});

test('streak calendar, share, achievements and level scale render', async ({ page }) => {
  await page.goto('./');
  await page.locator('.hero-cta').click();
  await page.locator('.name-input').fill('Mara');
  await page.locator('form.pick .btn-block').click();
  await page.locator('.course-card').filter({ hasText: /German/ }).click();
  await page.locator('.pick .btn-block').click();
  await page.locator('.stat-streak:visible').first().click();
  await expect(page.locator('.streak-calendar .cal-day')).toHaveCount(35);
  await page.keyboard.press('Escape');
  await page.mouse.click(5, 5);
  await page.goto('./#/profile');
  await expect(page.locator('main .level-scale')).toBeVisible();
  await expect(page.locator('main .scale-labels span')).toHaveText(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
  await expect(page.locator('.achievement')).toHaveCount(8);
  await page.screenshot({ path: 'test-results/profile-social.png', fullPage: true });
});

test('asks the name at the start and greets the learner by it', async ({ page }, info) => {
  await page.goto('./');
  await page.locator('.hero-cta').click();
  await expect(page.locator('form.pick .btn-block')).toBeDisabled(); // A name is required.
  await page.locator('.name-input').fill('Mara');
  await page.locator('form.pick .btn-block').click();
  await page.locator('.course-card').filter({ hasText: /German/ }).click();
  await page.locator('.pick .btn-block').click();
  await expect(page.locator('.greeting')).toHaveText('Good to see you, Mara!');
  await page.screenshot({ path: `test-results/greeting-${info.project.name}.png` });
});

test('automated browsers are not counted as visitors', async ({ page }) => {
  const sent: string[] = [];
  await page.route('**/rest/v1/visitors*', async (route) => {
    sent.push(route.request().postData() ?? '');
    await route.fulfill({ status: 201, body: '' });
  });
  await page.goto('./');
  await page.locator('.hero-cta').click();
  await page.locator('.name-input').fill('Bot');
  await page.locator('form.pick .btn-block').click();
  await page.locator('.course-card').filter({ hasText: /German/ }).click();
  await page.locator('.pick .btn-block').click();
  await page.waitForTimeout(2000);
  expect(sent).toHaveLength(0);
});

test('the name step tells visitors their name is shared, and sends it once a course is chosen', async ({ page }) => {
  const sent: string[] = [];
  // Automated browsers are skipped unless they opt in; this test opts in to check the flow.
  await page.addInitScript(() => { (window as unknown as { __ohrlyCountAutomation: boolean }).__ohrlyCountAutomation = true; });
  // Intercepted, so test runs never add names to the real table.
  await page.route('**/rest/v1/visitors*', async (route) => {
    sent.push(route.request().postData() ?? '');
    await route.fulfill({ status: 201, body: '' });
  });
  await page.goto('./');
  await page.locator('.hero-cta').click();
  await page.route('https://ipapi.co/**', (r) => r.fulfill({ json: { city: 'Testville', region: 'Test Region', country_name: 'Testland' } }));
  await expect(page.locator('.name-notice')).toContainText('can see the names people enter');
  await expect(page.locator('.name-notice')).toContainText('approximate city');
  await expect(page.locator('.name-notice')).toContainText('nickname');
  await page.locator('.name-input').fill('Priya');
  await page.locator('form.pick .btn-block').click();
  expect(sent).toHaveLength(0); // Nothing is sent before the visitor has chosen a course.
  await page.locator('.course-card').filter({ hasText: /German/ }).click();
  await page.locator('.pick .btn-block').click();
  await expect.poll(() => sent.length).toBe(1);
  expect(JSON.parse(sent[0]!)).toMatchObject({ name: 'Priya', course: 'en-de', city: 'Testville', country: 'Testland' });
  expect(sent[0]).not.toMatch(/\d{1,3}(\.\d{1,3}){3}/); // No IP address is ever sent to the database.
  await page.reload();
  await page.waitForTimeout(1500);
  expect(sent).toHaveLength(1); // Once per name, not on every visit.
});
