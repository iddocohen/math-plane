// User Story 3 (spec.md, quickstart scenario 4): "Bauen" fills in a building plan; crates build the stacks, a wrong
// "Fertig" marks only the wrong tower, and fixing it finishes the task with 3 stars.
import type { Locator, Page } from '@playwright/test';
import { defaultSettings } from '../../src/core/settings/defaults';
import { HANGAR_KEY, SETTINGS_KEY } from '../../src/core/storage/storage';
import { fieldProjector, planInputBox } from '../../src/game/bauenLayout';
import { expect, screenshotWhenDrawn, seedStorage, startRound, test } from './fixtures';
import { screenPoint } from './layout';

/** The building's plan from `data-answer` ("3,2/2,1": rows from the back to "vorn"). */
async function answerPlan(round: Locator): Promise<number[][]> {
  const raw = (await round.getAttribute('data-answer')) ?? '';
  expect(raw).toMatch(/^\d(,\d)+(\/\d(,\d)+)+$/);
  return raw.split('/').map((row) => row.split(',').map(Number));
}

async function storedStars(page: Page): Promise<number> {
  return page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? '{"stars":0}').stars as number, HANGAR_KEY);
}

/**
 * Records every line the message shows, so a line that shows only briefly at a raised `?speed=` is still seen (as
 * treffer.spec.ts). Returns a function that reads the lines so far.
 */
async function recordMessages(page: Page): Promise<() => Promise<string[]>> {
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="message"]')!;
    const lines: string[] = [];
    (window as unknown as { messageLines: string[] }).messageLines = lines;
    let last = el.textContent ?? '';
    new MutationObserver(() => {
      const text = el.textContent ?? '';
      if (text !== last && text) lines.push(text);
      last = text;
    }).observe(el, { childList: true, characterData: true, subtree: true });
  });
  return () => page.evaluate(() => [...(window as unknown as { messageLines: string[] }).messageLines]);
}

/** Clicks world point (x, y) on the game canvas. */
async function tapWorld(page: Page, x: number, y: number): Promise<void> {
  const p = await screenPoint(page, x, y);
  await page.mouse.click(p.x, p.y);
}

test('a plan with one wrong stack: only that tower is marked, fixing it finishes the task with 3 stars', async ({ page }, testInfo) => {
  await page.goto('/?seed=5&speed=4&test=1');
  const round = await startRound(page, '2');
  await expect(round).toHaveAttribute('data-kind', 'bauen');
  await expect(round).toHaveAttribute('data-level', '1');
  await expect(round).toHaveAttribute('data-number-pad', 'false');
  await expect(page.getByTestId('banner')).toHaveText('Baue das Gebäude nach. Schreib den Bauplan!');
  await expect(page.getByTestId('task-counter')).toHaveText('Aufgabe 1 von 5');
  const plan = await answerPlan(round);
  expect(plan).toHaveLength(2);
  await screenshotWhenDrawn(page, testInfo.outputPath('bauen-start.png'));

  // The frame starts on the first square and moves on after each digit, so the plan is typed in reading order.
  // A digit above 4 changes nothing (acceptance 6): it is typed first and the frame stays.
  const wrong = { row: 1, col: 0 };
  const right = plan[wrong.row]![wrong.col]!;
  const typed = right === 1 ? 2 : 1;
  await page.keyboard.press('7');
  for (const [r, row] of plan.entries()) {
    for (const [c, h] of row.entries()) await page.keyboard.press(String(r === wrong.row && c === wrong.col ? typed : h));
  }
  await screenshotWhenDrawn(page, testInfo.outputPath('bauen-crates.png'));

  // "Fertig" waits for the crates still falling, then marks only the wrong square.
  await page.keyboard.press('f');
  await expect(round).toHaveAttribute('data-phase', 'check');
  await expect(round).toHaveAttribute('data-marked', '1,0');
  await expect(round).toHaveAttribute('data-misses', '1');
  await expect(page.getByTestId('message')).toHaveText('Fast! Schau dir die markierten Stellen an.');
  await screenshotWhenDrawn(page, testInfo.outputPath('bauen-marked.png'));
  expect(await storedStars(page)).toBe(0);

  // A tap on the marked tower on the field selects its square (FR-024b); the right digit fixes it.
  const [x, y] = fieldProjector(2)(wrong.col + 0.5, wrong.row + 0.5, typed);
  await tapWorld(page, x, y);
  await expect(round).toHaveAttribute('data-phase', 'aim');
  await expect(round).toHaveAttribute('data-marked', '1,0');
  await page.keyboard.press(String(right));
  await expect(round).toHaveAttribute('data-marked', '');

  const messages = await recordMessages(page);
  await page.getByTestId('done').click();
  await expect(round).toHaveAttribute('data-tasks-done', '1');
  await expect.poll(messages).toContain('Super gebaut!');
  await expect.poll(() => storedStars(page)).toBe(3);
  await screenshotWhenDrawn(page, testInfo.outputPath('bauen-solved.png'));

  // The next task follows.
  await expect(page.getByTestId('task-counter')).toHaveText('Aufgabe 2 von 5');
  await expect(round).toHaveAttribute('data-phase', 'aim');
  await expect(round).toHaveAttribute('data-marked', '');
});

test('3×3 plans on level 2 with the number pad and taps on the plan card', async ({ page }, testInfo) => {
  const settings = defaultSettings();
  settings.levels.bauenMalen = { start: 2, hardest: 2 };
  settings.numberPad = 'always';
  await seedStorage(page, { [SETTINGS_KEY]: settings });
  await page.goto('/?seed=12&speed=4&test=1');
  const round = await startRound(page, '2');
  await expect(round).toHaveAttribute('data-kind', 'bauen');
  await expect(round).toHaveAttribute('data-level', '2');
  await expect(round).toHaveAttribute('data-number-pad', 'true');
  const pad = page.getByTestId('number-pad');
  await expect(pad).toBeVisible();
  await expect(page.getByTestId('done')).toHaveCount(0);
  const plan = await answerPlan(round);
  expect(plan).toHaveLength(3);

  // Each square is selected by a tap on the plan card, then written with the pad, last square first.
  const box = planInputBox(3);
  for (let i = 8; i >= 0; i--) {
    const row = Math.floor(i / 3);
    const col = i % 3;
    await tapWorld(page, box.x0 + (col + 0.5) * box.c, box.y0 + (row + 0.5) * box.c);
    await pad.locator(`[data-key="${plan[row]![col]}"]`).click();
  }
  await screenshotWhenDrawn(page, testInfo.outputPath('bauen-pad.png'));
  await pad.locator('[data-key="done"]').click();
  await expect(round).toHaveAttribute('data-tasks-done', '1');
  await expect(round).toHaveAttribute('data-misses', '0');
  await expect.poll(() => storedStars(page)).toBe(3);
});
