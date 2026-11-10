import { defineConfig } from '@playwright/test';

/** Only for scripts/make-post-image.spec.ts: renders against the live site, no local server. */
export default defineConfig({
  testDir: '.',
  testMatch: 'make-post-image.spec.ts',
  timeout: 180_000,
  reporter: 'list',
  use: { browserName: 'chromium' },
});
