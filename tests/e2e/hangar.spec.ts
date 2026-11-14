// Adapted from math-soccer tests/e2e/lockerroom.spec.ts.
/**
 * User Story 7 end to end (T067; acceptance scenarios US7-1 to US7-3, FR-044 to FR-046): K opens the Hangar on the
 * start screen; a cheap plane color is bought without a question and the round's plane has it. A hit earns 1 star.
 * The Hangar icon pauses the round; a water balloon bomb is bought after "Ja" and the scene uses it at once; Escape
 * goes back and the round goes on. A miss takes no star away. With "Hangar und Sterne" off, neither the Hangar nor the
 * stars show. The scene's look is read from the canvas's data-* attributes; there are no fixed waits.
 */
import { defaultSettings } from '../../src/core/settings/defaults';
import { emptyHangar } from '../../src/core/storage/schemas';
import { HANGAR_KEY, SETTINGS_KEY } from '../../src/core/storage/storage';
import { expect, seedStorage, startRound, test } from './fixtures';
import { playTrefferTask } from './parent';

test('buy looks on the start screen and during a round; the plane shows them at once and stars never go down', async ({ page }) => {
  await seedStorage(page, { [HANGAR_KEY]: { ...emptyHangar(), stars: 45 } }, { once: true });
  await page.goto('/?seed=5&speed=4&test=1');
  await expect(page.getByTestId('star-total')).toHaveText('★ 45');

  // K opens the Hangar; the free items are owned and chosen.
  await page.keyboard.press('k');
  const hangar = page.getByTestId('hangar');
  await expect(hangar).toHaveAttribute('data-stars', '45');
  await expect(page.getByTestId('item-planeColor.red')).toHaveAttribute('data-chosen', 'true');
  await expect(page.getByTestId('item-bomb.confetti')).toHaveAttribute('data-owned', 'true');

  // A cheap color is bought with one tap, no question.
  await page.getByTestId('item-planeColor.blue').click();
  await expect(page.getByTestId('buy-question')).toHaveCount(0);
  await expect(page.getByTestId('item-planeColor.blue')).toHaveAttribute('data-chosen', 'true');
  await expect(page.getByTestId('item-planeColor.blue')).toHaveAttribute('data-owned', 'true');
  await expect(hangar).toHaveAttribute('data-stars', '35');
  await expect(page.getByTestId('hangar-preview')).toHaveAttribute('data-look', /planeColor\.blue/);

  await page.keyboard.press('Escape');
  await expect(hangar).toHaveCount(0);
  await expect(page.getByTestId('star-total')).toHaveText('★ 35');

  // The round's plane has the new color; the bomb is still confetti.
  const round = await startRound(page);
  const canvas = page.locator('canvas[data-scene="round"]');
  await expect(canvas).toHaveAttribute('data-plane-color', '#2f7fd1');
  await expect(canvas).toHaveAttribute('data-bomb-style', 'confetti');

  // A hit earns 1 star.
  await playTrefferTask(page, round, true);

  // The Hangar icon pauses the round; a dearer item asks first.
  await page.getByTestId('round-hangar').click();
  await expect(round).toHaveAttribute('data-phase', 'paused');
  await expect(hangar).toHaveAttribute('data-stars', '36');
  await expect(page.getByTestId('item-planeColor.gold')).toContainText('noch 24 Sterne');
  await page.getByTestId('item-bomb.water').click();
  await expect(page.getByTestId('buy-question')).toContainText('Für 30 Sterne kaufen?');
  await page.getByTestId('buy-question').getByRole('button', { name: 'Ja' }).click();
  await expect(page.getByTestId('item-bomb.water')).toHaveAttribute('data-chosen', 'true');
  await expect(hangar).toHaveAttribute('data-stars', '6');
  // The scene uses the new bomb style at once, under the Hangar.
  await expect(canvas).toHaveAttribute('data-bomb-style', 'water');
  // Choosing the free color again costs nothing and shows at once too.
  await page.getByTestId('item-planeColor.red').click();
  await expect(canvas).toHaveAttribute('data-plane-color', '#e0413a');
  await expect(hangar).toHaveAttribute('data-stars', '6');

  // Escape goes back and the round goes on.
  await page.keyboard.press('Escape');
  await expect(hangar).toHaveCount(0);
  await expect(round).not.toHaveAttribute('data-phase', 'paused');

  // A miss first, then a hit: still 1 more star, none taken away (FR-044, FR-041).
  await playTrefferTask(page, round, false);
  await page.getByTestId('round-hangar').click();
  await expect(hangar).toHaveAttribute('data-stars', '7');
  await expect(page.getByTestId('item-bomb.water')).toHaveAttribute('data-owned', 'true');
});

test('with "Hangar und Sterne" off, neither the Hangar nor the stars show', async ({ page }) => {
  await seedStorage(page, { [SETTINGS_KEY]: { ...defaultSettings(), hangar: false }, [HANGAR_KEY]: { ...emptyHangar(), stars: 20 } });
  await page.goto('/?seed=5&speed=4&test=1');
  await expect(page.getByTestId('start')).toBeVisible();
  await expect(page.getByTestId('star-total')).toHaveCount(0);
  await expect(page.getByTestId('open-hangar')).toHaveCount(0);
  await page.keyboard.press('k');
  await expect(page.getByTestId('hangar')).toHaveCount(0);

  const round = await startRound(page);
  await expect(page.getByTestId('round-hangar')).toHaveCount(0);
  await page.keyboard.press('k');
  await expect(page.getByTestId('hangar')).toHaveCount(0);
  await expect(round).not.toHaveAttribute('data-phase', 'paused');
});
