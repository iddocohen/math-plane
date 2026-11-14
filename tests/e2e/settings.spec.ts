// Adapted from math-soccer tests/e2e/settings.spec.ts.
/**
 * User Story 6 end to end (T064, FR-050, FR-051, FR-054): a short click on the gear opens nothing, a 2-second hold
 * opens the parent menu and pauses the round; "Stufe am Anfang" 3 for "Treffer" starts the next round at level 3; a
 * task kind turned off is skipped; the settings survive a reload; settings saved during a round reach it when the
 * parent screens close, and the round keeps its length. Game state is read from the overlay's data-* attributes; there
 * are no fixed waits.
 */
import { defaultSettings } from '../../src/core/settings/defaults';
import { SETTINGS_KEY } from '../../src/core/storage/storage';
import { expect, seedStorage, startRound, test } from './fixtures';
import { holdGear, openParentPage } from './parent';

test('the gear opens the settings; start level 3 for "Treffer" starts the round there and survives a reload', async ({ page }) => {
  await page.goto('/?seed=3&speed=4&test=1');
  await expect(page.getByTestId('start')).toBeVisible();

  // A short click and keys on the gear open nothing.
  await page.getByTestId('parent-gate').click();
  await page.keyboard.press('g');
  await expect(page.getByRole('dialog', { name: 'Für Eltern' })).toHaveCount(0);

  const settings = await openParentPage(page, 'Einstellungen');
  await expect(settings.getByTestId('build-version')).toHaveText(/^Version .+ vom .+$/);
  const treffer = settings.getByRole('group', { name: 'Treffer' });
  await treffer.getByRole('combobox', { name: 'Stufe am Anfang' }).selectOption('3');
  await expect(treffer.getByRole('combobox', { name: 'Stufe am Anfang' })).toHaveValue('3');
  await expect(treffer.getByRole('combobox', { name: 'Schwerste Stufe' })).toHaveValue('5');
  await settings.getByRole('button', { name: 'Speichern' }).click();
  await expect(settings.getByText('Gespeichert.', { exact: false })).toBeVisible();
  await settings.getByRole('button', { name: 'Schließen' }).click();
  await expect(settings).toHaveCount(0);

  await expect(page.locator('[data-start="treffer"]')).toContainText('Stufe 3: Baupläne finden');
  const round = await startRound(page, '1');
  await expect(round).toHaveAttribute('data-level', '3');
  await expect(round).toHaveAttribute('data-kind', 'bauplanFinden');

  // After a reload the round continues, and the settings page shows the saved level. Opening it pauses the round.
  await page.reload();
  await expect(round).toHaveAttribute('data-level', '3');
  await expect(round).toHaveAttribute('data-phase', 'aim');
  await holdGear(page);
  await expect(round).toHaveAttribute('data-phase', 'paused');
  await page.getByRole('button', { name: 'Einstellungen' }).click();
  await expect(page.getByRole('group', { name: 'Treffer' }).getByRole('combobox', { name: 'Stufe am Anfang' })).toHaveValue('3');
  await page.getByTestId('settings-page').getByRole('button', { name: 'Schließen' }).click();
  await expect(round).toHaveAttribute('data-phase', 'aim');
});

test('a task kind turned off is skipped: without "Körper finden" a "Treffer" round starts with "Formen finden"', async ({ page }) => {
  await page.goto('/?seed=4&speed=4&test=1');
  const settings = await openParentPage(page, 'Einstellungen');
  const topics = settings.getByRole('group', { name: 'Themen' });
  await topics.getByRole('checkbox', { name: 'Körper finden' }).uncheck();
  await settings.getByRole('button', { name: 'Speichern' }).click();
  await settings.getByRole('button', { name: 'Schließen' }).click();

  await expect(page.locator('[data-start="treffer"]')).toContainText('Stufe 2: Formen');
  const round = await startRound(page, '1');
  await expect(round).toHaveAttribute('data-level', '2');
  await expect(round).toHaveAttribute('data-kind', 'formen');
  const stored = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)!).kinds.koerper as boolean, SETTINGS_KEY);
  expect(stored).toBe(false);
});

test('settings saved during a round apply when the parent screens close; the round keeps its bombs', async ({ page }) => {
  await seedStorage(page, { [SETTINGS_KEY]: defaultSettings() });
  await page.goto('/?seed=5&speed=4&test=1');
  const round = await startRound(page, '1');
  await expect(page.getByTestId('clock')).toHaveCount(0);

  const settings = await openParentPage(page, 'Einstellungen');
  await expect(round).toHaveAttribute('data-phase', 'paused');
  await settings.getByRole('group', { name: 'Bedienung' }).getByRole('checkbox', { name: 'Uhr zeigen' }).check();
  await settings.getByRole('group', { name: 'Runde' }).getByRole('spinbutton', { name: 'Bomben pro Runde' }).fill('5');
  await settings.getByRole('button', { name: 'Speichern' }).click();
  await settings.getByRole('button', { name: 'Schließen' }).click();

  await expect(round).toHaveAttribute('data-phase', 'aim');
  await expect(page.getByTestId('clock')).toBeVisible();
  await expect(round).toHaveAttribute('data-bombs-left', '10');
});
