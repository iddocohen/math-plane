// Adapted from math-soccer tests/e2e/persistence.spec.ts.
/**
 * User Story 6 end to end (T064, FR-030, FR-031, FR-048, FR-052, FR-053):
 * - Three "Treffer" tasks solved alone raise the level with "Neue Stufe: Formen!"; the level stays after a reload, and
 *   the progress page counts the tasks solved alone and with help.
 * - "Daten sichern" downloads the data, "Alles zurücksetzen" clears it, and "Daten laden" brings it back.
 * - A Hangar copy kept under `mathplane.hangar.v1.unreadable` is offered on the settings page; "Kopie wiederherstellen"
 *   saves it, the page reloads, and the start screen shows its stars.
 */
import type { Page } from '@playwright/test';
import { emptyHangar } from '../../src/core/storage/schemas';
import { HANGAR_KEY } from '../../src/core/storage/storage';
import { expect, seedStorage, startRound, test } from './fixtures';
import { openParentPage, playTrefferTask } from './parent';

/** Records every line the message shows, so a line that shows only briefly at a raised `?speed=` is still seen. */
async function recordMessages(page: Page): Promise<() => Promise<string[]>> {
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="message"]')!;
    const lines: string[] = [];
    (window as unknown as { messageLines: string[] }).messageLines = lines;
    new MutationObserver(() => {
      const text = el.textContent ?? '';
      if (text) lines.push(text);
    }).observe(el, { childList: true, characterData: true, subtree: true });
  });
  return () => page.evaluate(() => [...(window as unknown as { messageLines: string[] }).messageLines]);
}

const cells = (page: Page, mode: string, level: number, kind: string) =>
  page.getByTestId(`progress-levels-${mode}`).locator(`tr[data-level="${level}"][data-kind="${kind}"] td`);

test('the level rises, stays after a reload, shows on the progress page, and the data goes to a file and back', async ({ page }) => {
  await page.goto('/?seed=8&speed=4&test=1');
  const round = await startRound(page, '1');
  const messages = await recordMessages(page);
  for (let i = 0; i < 3; i++) {
    const task = await playTrefferTask(page, round, true);
    expect(task).toEqual({ level: 1, kind: 'koerper' });
  }
  await expect.poll(async () => (await messages()).includes('Neue Stufe: Formen!')).toBe(true);
  const fourth = await playTrefferTask(page, round, false);

  // "Zum Start" and a reload: the current level of the mode is kept.
  await page.getByTestId('home').click();
  await page.getByTestId('pause-home').click();
  await page.reload();
  await expect(page.locator('[data-start="treffer"]')).toContainText('Stufe 2: Formen');

  const progress = await openParentPage(page, 'Fortschritt');
  await expect(progress.getByTestId('progress-level-treffer')).toHaveText('Stufe jetzt: Stufe 2: Formen');
  const firstWithHelp = fourth.level === 1 ? '1' : '0';
  await expect(cells(page, 'treffer', 1, 'koerper')).toHaveText(['Körper finden', '3', firstWithHelp, 'noch nicht']);
  if (fourth.level === 2) await expect(cells(page, 'treffer', 2, 'formen')).toHaveText(['Formen finden', '0', '1', 'noch nicht']);
  await progress.getByRole('button', { name: 'Schließen' }).click();

  // "Daten sichern" downloads settings, progress, bests and Hangar.
  let settings = await openParentPage(page, 'Einstellungen');
  // The page keeps the file's text as it hands it to the download, so the spec reads it without the file system.
  await page.evaluate(() => {
    const create = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob: Blob) => {
      (window as unknown as { exported: Promise<string> }).exported = blob.text();
      return create(blob);
    };
  });
  const [download] = await Promise.all([page.waitForEvent('download'), settings.getByRole('button', { name: 'Daten sichern' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^mathe-flieger-\d{4}-\d{2}-\d{2}\.json$/);
  const file = await download.path();
  const saved = JSON.parse(await page.evaluate(() => (window as unknown as { exported: Promise<string> }).exported)) as { app: string; progress: { attempts: unknown[]; levels: { treffer: number } } };
  expect(saved.app).toBe('math-plane');
  expect(saved.progress.attempts).toHaveLength(4);
  expect(saved.progress.levels.treffer).toBe(2);
  // "QR-Code" shows the transfer link of the same data.
  await settings.getByRole('button', { name: 'QR-Code' }).click();
  await expect(settings.getByTestId('transfer')).toHaveAttribute('data-transfer-link', /#save=v1\./);
  await expect(settings.getByTestId('transfer-qr')).toBeVisible();
  await settings.getByRole('button', { name: 'Schließen' }).click();

  // "Alles zurücksetzen" asks first and clears the progress.
  const again = await openParentPage(page, 'Fortschritt');
  await again.getByRole('button', { name: 'Alles zurücksetzen' }).click();
  await again.getByRole('button', { name: 'Ja, alles löschen' }).click();
  await expect(again.getByText('Alles wurde zurückgesetzt.')).toBeVisible();
  await again.getByRole('button', { name: 'Schließen' }).click();
  await expect(page.locator('[data-start="treffer"]')).toContainText('Stufe 1: Körper');

  // "Daten laden" brings it back.
  settings = await openParentPage(page, 'Einstellungen');
  await settings.getByTestId('import-file').setInputFiles(file);
  await expect(settings.getByText('Daten geladen.', { exact: false })).toBeVisible();
  await settings.getByRole('button', { name: 'Schließen' }).click();
  await expect(page.locator('[data-start="treffer"]')).toContainText('Stufe 2: Formen');
});

test('restores a kept Hangar copy and shows its stars on the start screen', async ({ page }) => {
  await seedStorage(page, { [`${HANGAR_KEY}.unreadable`]: { ...emptyHangar(), stars: 17 } }, { once: true });
  await page.goto('/');
  await expect(page.getByTestId('star-total')).toHaveText('★ 0');

  const settings = await openParentPage(page, 'Einstellungen');
  const notice = settings.getByTestId('backup-notice');
  await expect(notice).toContainText('Sterne und Hangar');
  await notice.getByRole('button', { name: 'Kopie wiederherstellen' }).click();

  // The page reloads with the restored data.
  await expect(page.getByTestId('star-total')).toHaveText('★ 17');
  expect(await page.evaluate((key) => localStorage.getItem(key), `${HANGAR_KEY}.unreadable`)).toBeNull();
});
