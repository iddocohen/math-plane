// Structure adapted from math-soccer tests/e2e/pauseResume.spec.ts (which adapted math-tank's): the pause screen of
// Mathe-Flieger, and a refresh during a round, which continues the stored round (spec.md edge cases).
/**
 * Pause and resume (T069): Escape and the pause button pause the round; while paused, the clock stands still and round
 * keys do nothing; Space, Enter and the pause screen's "Weiter" go on without dropping a bomb. A refresh during a round of either mode continues it: the
 * hits or finished tasks, the bombs left and the task stay, and the round can be played on.
 */
import { expect, seedStorage, startRound, test } from './fixtures';
import { ROUND_KEY, SETTINGS_KEY } from '../../src/core/storage/storage';
import { hitTarget, shortRounds, solveBauen } from './play';
import { t } from '../../src/i18n';

const text = t();

test('Escape and the pause button pause the round; round keys do nothing; Space, "Weiter" and Enter go on', async ({ page }) => {
  await seedStorage(page, { [SETTINGS_KEY]: { ...shortRounds(), showClock: true } });
  await page.goto('/?seed=2&test=1');
  const round = await startRound(page, '1');
  const clock = page.getByTestId('clock');
  // The clock runs: it reaches 0:01.
  await expect(clock).toHaveText(text.roundEnd.time(1000));

  await page.keyboard.press('Escape');
  const pause = page.getByTestId('pause-screen');
  await expect(pause).toHaveAttribute('data-kind', 'pause');
  await expect(round).toHaveAttribute('data-phase', 'paused');
  // Round keys do nothing while paused: the arrows, H for help, F for "Fertig". That the clock stands still is checked
  // in RoundController.test.ts; here it shows the same time before and after the keys.
  const shown = await clock.textContent();
  for (const key of ['ArrowRight', 'h', 'f', '3']) await page.keyboard.press(key);
  await expect(round).toHaveAttribute('data-phase', 'paused');
  await expect(round).toHaveAttribute('data-help', '0');
  await expect(clock).toHaveText(shown!);
  // Space goes on (keyboard.ts) and drops no bomb.
  await page.keyboard.press('Space');
  await expect(pause).toBeHidden();
  await expect(round).toHaveAttribute('data-phase', 'aim');
  await expect(round).toHaveAttribute('data-bombs-left', '5');

  await page.keyboard.press('Escape');
  await expect(pause).toHaveAttribute('data-kind', 'pause');
  await pause.getByTestId('pause-resume').click();
  await expect(pause).toBeHidden();
  await expect(round).toHaveAttribute('data-phase', 'aim');

  await page.getByTestId('pause').click();
  await expect(pause).toHaveAttribute('data-kind', 'pause');
  await expect(round).toHaveAttribute('data-phase', 'paused');
  await page.keyboard.press('Enter');
  await expect(pause).toBeHidden();
  await expect(round).toHaveAttribute('data-phase', 'aim');
  // The round goes on: a bomb lands.
  await hitTarget(page, round);
  await expect(round).toHaveAttribute('data-bombs-left', '4');
});

test('a refresh during a "Treffer" round continues it with its hits, bombs and task', async ({ page }) => {
  await seedStorage(page, { [SETTINGS_KEY]: shortRounds() }, { once: true });
  await page.goto('/?seed=6&speed=4&test=1');
  let round = await startRound(page, '1');
  await hitTarget(page, round);
  await expect(round).toHaveAttribute('data-phase', 'aim');
  const banner = await page.getByTestId('banner').textContent();
  const slots = await round.getAttribute('data-slots');
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key) !== null, ROUND_KEY)).toBe(true);

  await page.reload();
  round = page.getByTestId('round');
  await expect(round).toHaveAttribute('data-mode', 'treffer');
  await expect(round).toHaveAttribute('data-hits', '1');
  await expect(round).toHaveAttribute('data-bombs-left', '4');
  await expect(page.getByTestId('banner')).toHaveText(banner!);
  await expect(round).toHaveAttribute('data-slots', slots!);
  await expect(page.getByTestId('start')).toHaveCount(0);
  await expect(page.locator('canvas[data-scene="round"]')).toHaveCount(1);
  // The continued round plays on.
  await hitTarget(page, round);
  await expect(round).toHaveAttribute('data-bombs-left', '3');
});

test('a refresh during a "Bauen und Malen" round continues it at the same task', async ({ page }) => {
  await seedStorage(page, { [SETTINGS_KEY]: shortRounds() }, { once: true });
  await page.goto('/?seed=9&speed=4&test=1');
  let round = await startRound(page, '2');
  await solveBauen(page, round);
  await expect(page.getByTestId('task-counter')).toHaveText('Aufgabe 2 von 3');
  await expect(round).toHaveAttribute('data-phase', 'aim');
  const answer = await round.getAttribute('data-answer');

  await page.reload();
  round = page.getByTestId('round');
  await expect(round).toHaveAttribute('data-mode', 'bauenMalen');
  await expect(round).toHaveAttribute('data-tasks-done', '1');
  await expect(page.getByTestId('task-counter')).toHaveText('Aufgabe 2 von 3');
  await expect(round).toHaveAttribute('data-answer', answer!);
  await expect(page.locator('canvas[data-scene="round"]')).toHaveCount(1);
  await solveBauen(page, round);
  await expect(page.getByTestId('task-counter')).toHaveText('Aufgabe 3 von 3');
});

test('a refresh without a fixed seed continues "Bauen und Malen" with the same task', async ({ page }) => {
  // Without `?seed=` the page makes a new random seed on every load; the stored round must keep its own (review finding).
  await seedStorage(page, { [SETTINGS_KEY]: shortRounds() }, { once: true });
  await page.goto('/?speed=4&test=1');
  let round = await startRound(page, '2');
  const answer = await round.getAttribute('data-answer');
  expect(answer).toBeTruthy();
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key) !== null, ROUND_KEY)).toBe(true);

  for (let i = 0; i < 2; i++) {
    await page.reload();
    round = page.getByTestId('round');
    await expect(round).toHaveAttribute('data-mode', 'bauenMalen');
    await expect(page.getByTestId('task-counter')).toHaveText('Aufgabe 1 von 3');
    await expect(round).toHaveAttribute('data-answer', answer!);
  }
  await expect(page.locator('canvas[data-scene="round"]')).toHaveCount(1);
});
