import { test as base } from '@playwright/test';

/**
 * Every test page is silent. Chrome's --mute-audio covers <audio>, but the browser's speech voice
 * goes straight to the operating system and plays through the speakers, so it is replaced by a fake
 * that only records what would have been said and reports finishing.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      const realPlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        this.muted = true;
        return realPlay.call(this).catch(() => undefined) as Promise<void>;
      };
      if ('speechSynthesis' in window) {
        const synth = window.speechSynthesis;
        synth.speak = (u: SpeechSynthesisUtterance) => {
          (window as unknown as { __said: string }).__said = u.text;
          // Roughly as long as speaking would take, so the app's timing is exercised.
          window.setTimeout(() => u.onstart?.(new Event('start') as SpeechSynthesisEvent), 0);
          window.setTimeout(() => u.onend?.(new Event('end') as SpeechSynthesisEvent), 150 + u.text.length * 10);
        };
        synth.cancel = () => {};
      }
    });
    await use(page);
  },
});

export { expect } from '@playwright/test';
