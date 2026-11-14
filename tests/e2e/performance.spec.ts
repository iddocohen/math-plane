// Structure adapted from math-soccer tests/e2e/performance.spec.ts (which adapted math-tank's): the frame rate while
// the plane flies a bomb pass and while crates fall, measured from requestAnimationFrame timestamps, in Chromium with
// the graphics card, skipped without one.
/**
 * Frame rate (T072, plan.md "Performance Goals"): the round is ready within 3 seconds of the start key, and the frame
 * rate averages at least 55 frames per second
 * - during a bomb pass (`data-phase="pass"`) in "Treffer" with solids (level 1) and with mixed buildings seen from
 *   every side (level 5), and
 * - while the crates of a 3 by 3 plan fall in "Bauen" (level 2), from the first digit to the finished task.
 *
 * Frame rates depend on the machine being idle, so this spec runs in its own Playwright project `performance`, after
 * every other project has finished (playwright.config.ts). `pnpm exec playwright test --project=performance --no-deps`
 * runs it alone. Its tests run one after the other in one worker, so they never measure each other.
 */
import type { Locator, Page } from '@playwright/test';
import { expect, seedStorage, test } from './fixtures';
import { SETTINGS_KEY } from '../../src/core/storage/storage';
import type { Settings } from '../../src/core/settings/schema';
import { answerPlan, hitTarget, shortRounds } from './play';

test.describe.configure({ mode: 'default' });

declare global {
  interface Window {
    /** Frame timestamps recorded while `__measure` returns true. */
    __frames?: number[];
    __measure?: () => boolean;
  }
}

/** The WebGL renderer's name, to tell a graphics card from software drawing. */
function renderer(page: Page): Promise<string> {
  return page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    return info ? String(gl!.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'unknown';
  });
}

/**
 * Seeds `settings`, records every frame while `window.__measure()` is true, opens the start screen, presses `key` and
 * checks that the round aims with its scene within 3 seconds. Skips the test without a graphics card.
 */
async function startMeasured(page: Page, settings: Settings, key: '1' | '2'): Promise<Locator> {
  await seedStorage(page, { [SETTINGS_KEY]: settings });
  await page.addInitScript(() => {
    window.__frames = [];
    window.__measure = () => false;
    const sample = (ts: number) => {
      if (window.__measure!()) window.__frames!.push(ts);
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.goto('/?seed=8&test=1');
  await expect(page.getByTestId('start')).toBeVisible();
  const round = page.getByTestId('round');
  const pressed = Date.now();
  await page.keyboard.press(key);
  await expect(page.locator('canvas[data-scene="round"]')).toHaveCount(1, { timeout: 3_000 });
  await expect(round).toHaveAttribute('data-phase', 'aim', { timeout: 3_000 });
  expect(Date.now() - pressed).toBeLessThan(3_000);

  // Without a graphics card, Chromium draws WebGL in software (SwiftShader); that says nothing about a child's
  // computer, so the frame rate is measured only on a real graphics card (as math-soccer).
  const name = await renderer(page);
  test.skip(/SwiftShader|llvmpipe|software/i.test(name), `no graphics card in this browser (${name}); the frame rate is not measured`);
  test.info().annotations.push({ type: 'renderer', description: name });
  return round;
}

/** The average frame rate of the recorded frames; records it as an annotation and checks it. */
async function expectFrameRate(page: Page, what: string): Promise<void> {
  const frames = await page.evaluate(() => window.__frames ?? []);
  expect(frames.length).toBeGreaterThan(10);
  const fps = ((frames.length - 1) * 1000) / (frames.at(-1)! - frames[0]!);
  test.info().annotations.push({ type: 'fps', description: `${what}: ${fps.toFixed(1)} frames per second` });
  expect(fps).toBeGreaterThanOrEqual(55);
}

const TREFFER: Array<{ name: string; level: 1 | 5 }> = [
  { name: 'solids (level 1)', level: 1 },
  { name: 'mixed buildings from every side (level 5)', level: 5 },
];

for (const round of TREFFER) {
  test(`"Treffer" with ${round.name} is ready within 3 s, and a bomb pass runs at 55 frames per second or more`, async ({ page }) => {
    test.setTimeout(90_000);
    const settings = shortRounds();
    settings.levels.treffer = { start: round.level, hardest: round.level };
    const el = await startMeasured(page, settings, '1');
    await page.evaluate(() => {
      window.__measure = () => document.querySelector<HTMLElement>('[data-testid="round"]')?.dataset.phase === 'pass';
    });
    // Two hits: the first warms up the drawing code, the second is measured.
    await hitTarget(page, el);
    await page.evaluate(() => (window.__frames = []));
    await hitTarget(page, el);
    await expectFrameRate(page, round.name);
  });
}

test('"Bauen" with a 3 by 3 plan is ready within 3 s, and its crates fall at 55 frames per second or more', async ({ page }) => {
  test.setTimeout(90_000);
  const settings = shortRounds();
  settings.levels.bauenMalen = { start: 2, hardest: 2 };
  const round = await startMeasured(page, settings, '2');
  // Two tasks: the first warms up the drawing code, the second is measured from its first digit until it is done.
  for (let task = 0; task < 2; task++) {
    await expect(round).toHaveAttribute('data-phase', 'aim');
    await page.evaluate(() => {
      window.__frames = [];
      window.__measure = () => true;
    });
    for (const row of await answerPlan(round)) for (const h of row) await page.keyboard.press(String(h));
    await page.keyboard.press('f');
    await expect(round).toHaveAttribute('data-tasks-done', String(task + 1));
    await page.evaluate(() => (window.__measure = () => false));
  }
  await expectFrameRate(page, 'crates of a 3 by 3 plan');
});
