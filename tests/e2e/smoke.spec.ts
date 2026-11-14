// The checkpoint of the foundation (tasks.md Phase 2): the app starts, draws the scene, and both start buttons open a
// round screen.
import { expect, screenshotWhenDrawn, startRound, test } from './fixtures';

test('the start screen shows both modes with their level', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('start')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-version', /.+/);
  await expect(page.locator('[data-start="treffer"]')).toContainText('Stufe 1: Körper');
  await expect(page.locator('[data-start="bauenMalen"]')).toContainText('Stufe 1: Kleine Baupläne');
});

test('key 1 opens a "Treffer" round with the scene drawn', async ({ page }, testInfo) => {
  await page.goto('/?seed=1');
  const round = await startRound(page, '1');
  await expect(round).toHaveAttribute('data-mode', 'treffer');
  await expect(round).toHaveAttribute('data-bombs-left', '10');
  await expect(round).toHaveAttribute('data-answer', '');
  await expect(page.locator('canvas')).toBeVisible();
  await screenshotWhenDrawn(page, testInfo.outputPath('treffer-round.png'));
});

test('the "Bauen und Malen" button opens a round with the task counter', async ({ page }) => {
  await page.goto('/?seed=1');
  await page.locator('[data-start="bauenMalen"]').click();
  const round = page.getByTestId('round');
  await expect(round).toHaveAttribute('data-mode', 'bauenMalen');
  await expect(round).toHaveAttribute('data-phase', 'aim');
  await expect(page.getByTestId('task-counter')).toHaveText('Aufgabe 1 von 5');
});

test('Escape pauses, Enter goes on, and "Zum Start" leaves the round', async ({ page }) => {
  await page.goto('/');
  const round = await startRound(page, '1');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-screen')).toHaveAttribute('data-kind', 'pause');
  await expect(round).toHaveAttribute('data-phase', 'paused');
  await page.keyboard.press('Enter');
  await expect(round).toHaveAttribute('data-phase', 'aim');
  await page.getByTestId('home').click();
  await expect(page.getByTestId('pause-screen')).toHaveAttribute('data-kind', 'quit');
  await page.getByTestId('pause-home').click();
  await expect(page.getByTestId('start')).toBeVisible();
});
