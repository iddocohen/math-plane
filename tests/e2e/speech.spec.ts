// Adapted from math-soccer tests/e2e/speech.spec.ts (which copied it from math-tank): the banner of a Mathe-Flieger
// task replaces the soccer task, and a browser without the speech API is added (spec.md edge cases).
/**
 * Spoken tasks (T070, FR-040). The test browser gets a German voice and a speak() that only records the text, so
 * nothing is heard. "Vorlesen" is off by default. With it on, the start (here key 1) speaks a short greeting and then
 * the banner; each new task reads its banner; the speaker button reads it again. With it off nothing is spoken and the
 * button is hidden. Without the speech API the game plays normally and shows no speaker button.
 */
import type { Page } from '@playwright/test';
import { expect, seedStorage, startRound, test } from './fixtures';
import { defaultSettings } from '../../src/core/settings/defaults';
import { SETTINGS_KEY } from '../../src/core/storage/storage';
import { t } from '../../src/i18n';
import { hitTarget } from './play';

const text = t();

/** `speech` null stores no settings, so the defaults apply. */
async function prepare(page: Page, speech: boolean | null): Promise<void> {
  if (speech !== null) await seedStorage(page, { [SETTINGS_KEY]: { ...defaultSettings(), sound: { ...defaultSettings().sound, speech } } });
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown> & { __spoken: string[] };
    w.__spoken = [];
    const voice = { lang: 'de-DE', name: 'Test-Stimme', default: true, localService: true, voiceURI: 'test' };
    const synth = {
      getVoices: () => [voice],
      speak: (u: { text: string }) => w.__spoken.push(u.text),
      cancel: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    class Utterance {
      text: string;
      lang = '';
      voice: unknown = null;
      rate = 1;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true });
  });
}

function spoken(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);
}

test('with "Vorlesen" on, starting speaks a greeting and the banner, a new task its banner, and the button repeats it', async ({ page }) => {
  await prepare(page, true);
  await page.goto('/?seed=4&speed=4&test=1');
  const round = await startRound(page, '1');
  const banner = page.getByTestId('banner');
  const first = (await banner.textContent())!;
  expect(first).toMatch(/^Triff /);
  await expect.poll(() => spoken(page)).toEqual([text.start.greeting, first]);

  await page.getByTestId('speaker-button').click();
  await expect.poll(() => spoken(page)).toEqual([text.start.greeting, first, first]);

  // A hit brings the next task, which reads its own banner.
  await hitTarget(page, round);
  await expect(round).toHaveAttribute('data-phase', 'aim');
  const second = (await banner.textContent())!;
  await expect.poll(() => spoken(page)).toEqual([text.start.greeting, first, first, second]);
});

test('"Vorlesen" is off by default: nothing is spoken and there is no speaker button', async ({ page }) => {
  await prepare(page, null);
  await page.goto('/?seed=4&speed=4&test=1');
  const round = await startRound(page, '1');
  await expect(page.getByTestId('speaker-button')).toHaveCount(0);
  await hitTarget(page, round);
  expect(await spoken(page)).toEqual([]);
});

test('without the speech API, "Vorlesen" on does nothing and the game plays without an error', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await seedStorage(page, { [SETTINGS_KEY]: { ...defaultSettings(), sound: { ...defaultSettings().sound, speech: true } } });
  await page.addInitScript(() => {
    for (const name of ['speechSynthesis', 'SpeechSynthesisUtterance']) {
      Object.defineProperty(window, name, { value: undefined, configurable: true });
    }
  });
  await page.goto('/?seed=4&speed=4&test=1');
  expect(await page.evaluate(() => window.speechSynthesis === undefined)).toBe(true);
  const round = await startRound(page, '1');
  await expect(page.getByTestId('speaker-button')).toHaveCount(0);
  await hitTarget(page, round);
  await hitTarget(page, round);
  expect(errors).toEqual([]);
});
