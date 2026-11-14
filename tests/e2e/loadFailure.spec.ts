/**
 * The game chunk does not load (review finding: a blank screen before). The round screen then shows a short friendly
 * line with "Zum Start", logs the error, and "Zum Start" goes back to the start screen. The service worker is blocked,
 * so the page fetches the chunk itself and the test can stop that request.
 */
import { expect, test } from './fixtures';
import { hasForbiddenWord, t } from '../../src/i18n';

test.use({ serviceWorkers: 'block' });

test('a game chunk that does not load shows a friendly line and "Zum Start"', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.route(/\/assets\/createGame-[^/]*\.js$/, (route) => route.abort());
  await page.goto('/?seed=1');
  await expect(page.getByTestId('start')).toBeVisible();
  await page.keyboard.press('1');
  const stuck = page.getByTestId('stuck-screen');
  await expect(stuck).toBeVisible();
  await expect(stuck.getByRole('heading')).toHaveText(t().round.stuck);
  expect(hasForbiddenWord(t().round.stuck)).toBe(false);
  expect(errors.some((e) => e.includes('the game could not load'))).toBe(true);
  await stuck.getByTestId('stuck-button').click();
  await expect(page.getByTestId('start')).toBeVisible();
  await expect(stuck).toHaveCount(0);
});
