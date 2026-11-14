// Adapted from math-soccer tests/e2e/fixtures.ts: no stored data baseline marker, and a round starts with key 1 or 2
// and waits for the `round` overlay to aim.
/**
 * Shared Playwright fixture: every page is silent, in every browser including WebKit.
 * - speechSynthesis.speak does nothing (getVoices still works).
 * - Every AudioContext is suspended at once, and resume() resolves without resuming it.
 * All e2e specs import `test` and `expect` from here instead of @playwright/test.
 */
import { test as base, expect, type Locator, type Page } from '@playwright/test';
import { GAME_WAIT } from './gameWait';

export function silenceAudio(): void {
  const w = window as unknown as Record<string, unknown>;
  // WebKit ignores a plain assignment on the instance, so the prototype is patched as well.
  const noSpeak = { value: () => {}, configurable: true, writable: true };
  if (typeof SpeechSynthesis !== 'undefined') Object.defineProperty(SpeechSynthesis.prototype, 'speak', noSpeak);
  if (window.speechSynthesis) Object.defineProperty(window.speechSynthesis, 'speak', noSpeak);
  for (const name of ['AudioContext', 'webkitAudioContext']) {
    const Original = w[name] as (new (...args: unknown[]) => AudioContext) | undefined;
    if (typeof Original !== 'function') continue;
    class SilentAudioContext extends Original {
      constructor(...args: unknown[]) {
        super(...args);
        void AudioContext.prototype.suspend.call(this).catch(() => {});
      }
      override resume(): Promise<void> {
        return Promise.resolve();
      }
    }
    w[name] = SilentAudioContext;
  }
}

export { GAME_WAIT };

function toPairs(entries: Record<string, unknown>): Array<[string, string]> {
  return Object.entries(entries).map(([k, v]): [string, string] => [k, JSON.stringify(v)]);
}

/**
 * Stores each entry as JSON in localStorage before the page's scripts run. By default this happens on every load.
 * With `once`, it happens only on the first load in the tab, so a reload keeps what the game stored.
 */
export async function seedStorage(page: Page, entries: Record<string, unknown>, { once = false }: { once?: boolean } = {}): Promise<void> {
  await page.addInitScript(
    ([pairs, onlyOnce]) => {
      if (onlyOnce) {
        if (window.sessionStorage.getItem('e2e-seeded')) return;
        window.sessionStorage.setItem('e2e-seeded', '1');
      }
      for (const [k, v] of pairs) window.localStorage.setItem(k, v);
    },
    [toPairs(entries), once] as const,
  );
}

/**
 * Starts a round from the start screen with a key (1 for "Treffer", 2 for "Bauen und Malen", contracts/screens.md) and
 * waits on game state until the round aims, then returns the round overlay. The key is pressed once, as soon as the
 * start screen is visible.
 */
export async function startRound(page: Page, key: '1' | '2' = '1'): Promise<Locator> {
  await expect(page.getByTestId('start')).toBeVisible();
  await page.keyboard.press(key);
  const round = page.getByTestId('round');
  await expect(round).toHaveAttribute('data-phase', 'aim');
  return round;
}

/**
 * Saves a screenshot once the browser has drawn two more frames, so the capture does not race a frame of the game's
 * canvas. Headless Chromium can still answer "Unable to capture screenshot" while a frame is in progress; then it waits
 * for the next frames and captures once more. The screenshot is for people to look at; no check reads it.
 */
export async function screenshotWhenDrawn(page: Page, path: string): Promise<void> {
  const nextFrames = () => page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
  await nextFrames();
  try {
    await page.screenshot({ path });
  } catch (error) {
    if (!String(error).includes('Unable to capture screenshot')) throw error;
    await nextFrames();
    await page.screenshot({ path });
  }
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(silenceAudio);
    await use(page);
  },
});

export { expect };
