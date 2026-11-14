// User Story 4 (spec.md, quickstart scenario 5): "Malen" paints a view, a wrong "Fertig" marks only the extra
// square, fixing it finishes the task; "Male an" fills outlines with the building's colors, a wrong color marks only
// that outline.
import type { Locator, Page } from '@playwright/test';
import { defaultSettings } from '../../src/core/settings/defaults';
import { HANGAR_KEY, SETTINGS_KEY } from '../../src/core/storage/storage';
import { gridBox, worldOfViewPoint } from '../../src/game/paintLayout';
import { expect, screenshotWhenDrawn, seedStorage, startRound, test } from './fixtures';
import { screenPoint } from './layout';

async function storedStars(page: Page): Promise<number> {
  return page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? '{"stars":0}').stars as number, HANGAR_KEY);
}

/** Records every line the message shows, so a short line at a raised `?speed=` is still seen (as bauen.spec.ts). */
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

async function tapWorld(page: Page, x: number, y: number): Promise<void> {
  const p = await screenPoint(page, x, y);
  await page.mouse.click(p.x, p.y);
}

/** The view from `data-answer` of a "Malen" task: rows of `#` (colored) and `.` from the top, split by "/". */
async function answerView(round: Locator): Promise<boolean[][]> {
  const raw = (await round.getAttribute('data-answer')) ?? '';
  expect(raw).toMatch(/^[#.]+(\/[#.]+)+$/);
  return raw.split('/').map((row) => [...row].map((ch) => ch === '#'));
}

interface Region {
  index: number;
  color: string;
  x: number;
  y: number;
}

/** The view size and the regions from `data-answer` of a "Male an" task. */
async function answerRegions(round: Locator): Promise<{ cols: number; rows: number; regions: Region[] }> {
  const raw = (await round.getAttribute('data-answer')) ?? '';
  const [size, ...parts] = raw.split(' ');
  const [cols, rows] = size!.split('x').map(Number) as [number, number];
  const regions = parts.map((part) => {
    const m = /^(\d+):(#[0-9a-f]{6})@([\d.]+),([\d.]+)$/.exec(part);
    expect(m, part).not.toBeNull();
    return { index: Number(m![1]), color: m![2]!, x: Number(m![3]), y: Number(m![4]) };
  });
  return { cols, rows, regions };
}

test('level 4 "Malen" from the right: one extra square is the only mark, fixing it gives 3 stars and colored smoke', async ({ page }, testInfo) => {
  const settings = defaultSettings();
  settings.levels.bauenMalen = { start: 4, hardest: 4 };
  settings.buildings.sides = { vorn: false, oben: false, rechts: true, links: false };
  await seedStorage(page, { [SETTINGS_KEY]: settings });
  await page.goto('/?seed=8&speed=4&test=1');
  const round = await startRound(page, '2');
  await expect(round).toHaveAttribute('data-kind', 'malen');
  await expect(round).toHaveAttribute('data-level', '4');
  await expect(round).toHaveAttribute('data-side', 'rechts');
  await expect(page.getByTestId('banner')).toHaveText('Male das Gebäude von rechts.');
  await expect(page.getByTestId('palette')).toHaveCount(0);
  const view = await answerView(round);
  const rows = view.length;
  const cols = view[0]!.length;
  await screenshotWhenDrawn(page, testInfo.outputPath('malen-start.png'));

  // The bottom left square by keyboard: the marker starts there, an arrow key shows it, Space colors it. The other
  // colored squares of the view by tap.
  const keyed = view[rows - 1]![0]!;
  if (keyed) {
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Space');
  }
  const box = gridBox(cols, rows);
  const tapSquare = (r: number, c: number) => tapWorld(page, box.x0 + (c + 0.5) * box.c, box.y0 + (r + 0.5) * box.c);
  for (const [r, row] of view.entries()) for (const [c, on] of row.entries()) if (on && !(keyed && r === rows - 1 && c === 0)) await tapSquare(r, c);
  const extra = view.flatMap((row, r) => row.flatMap((on, c) => (on ? [] : [{ r, c }])))[0]!;
  await tapSquare(extra.r, extra.c);
  await screenshotWhenDrawn(page, testInfo.outputPath('malen-painted.png'));

  // "Fertig" marks only the extra square; nothing was checked before.
  await expect(round).toHaveAttribute('data-misses', '0');
  await page.keyboard.press('f');
  await expect(round).toHaveAttribute('data-phase', 'check');
  await expect(round).toHaveAttribute('data-marked', `${extra.r},${extra.c}`);
  await expect(round).toHaveAttribute('data-misses', '1');
  await expect(page.getByTestId('message')).toHaveText('Fast! Schau dir die markierten Stellen an.');
  await screenshotWhenDrawn(page, testInfo.outputPath('malen-marked.png'));

  // Emptying the square takes the mark away; "Fertig" now solves the task.
  await tapSquare(extra.r, extra.c);
  await expect(round).toHaveAttribute('data-marked', '');
  const messages = await recordMessages(page);
  await page.getByTestId('done').click();
  await expect(round).toHaveAttribute('data-tasks-done', '1');
  await expect.poll(messages).toContain('Genau so sieht es von rechts aus!');
  await expect.poll(() => storedStars(page)).toBe(3);
  await screenshotWhenDrawn(page, testInfo.outputPath('malen-solved.png'));
  await expect(page.getByTestId('task-counter')).toHaveText('Aufgabe 2 von 5');
});

test('level 5 "Male an": one outline in a wrong color is the only mark, fixing it gives 3 stars', async ({ page }, testInfo) => {
  const settings = defaultSettings();
  settings.levels.bauenMalen = { start: 5, hardest: 5 };
  await seedStorage(page, { [SETTINGS_KEY]: settings });
  await page.goto('/?seed=3&speed=4&test=1');
  const round = await startRound(page, '2');
  await expect(round).toHaveAttribute('data-kind', 'maleAn');
  await expect(round).toHaveAttribute('data-level', '5');
  const side = (await round.getAttribute('data-side'))!;
  expect(['vorn', 'oben', 'rechts', 'links']).toContain(side);
  const { cols, rows, regions } = await answerRegions(round);
  expect(regions.length).toBeGreaterThanOrEqual(2);
  const palette = page.getByTestId('palette');
  const colors = await palette.locator('button').evaluateAll((bs) => bs.map((b) => (b as HTMLElement).dataset.color!));
  expect([...colors].sort()).toEqual(regions.map((r) => r.color).sort());
  await screenshotWhenDrawn(page, testInfo.outputPath('male-an-start.png'));

  const fill = async (region: Region, color: string) => {
    await palette.locator(`[data-color="${color}"]`).click();
    await expect(palette).toHaveAttribute('data-picked', color);
    const [x, y] = worldOfViewPoint(cols, rows, region.x, region.y);
    await tapWorld(page, x, y);
  };
  const wrong = regions[0]!;
  const wrongColor = colors.find((c) => c !== wrong.color)!;
  for (const region of regions) await fill(region, region === wrong ? wrongColor : region.color);
  await screenshotWhenDrawn(page, testInfo.outputPath('male-an-filled.png'));

  await page.keyboard.press('f');
  await expect(round).toHaveAttribute('data-phase', 'check');
  await expect(round).toHaveAttribute('data-marked', `r${wrong.index}`);
  await expect(round).toHaveAttribute('data-misses', '1');
  await screenshotWhenDrawn(page, testInfo.outputPath('male-an-marked.png'));

  // A fill can be changed before "Fertig": the right color takes the mark away.
  await fill(wrong, wrong.color);
  await expect(round).toHaveAttribute('data-marked', '');
  const messages = await recordMessages(page);
  await page.getByTestId('done').click();
  await expect(round).toHaveAttribute('data-tasks-done', '1');
  await expect.poll(messages).toContain('Schön angemalt!');
  await expect.poll(() => storedStars(page)).toBe(3);
  await screenshotWhenDrawn(page, testInfo.outputPath('male-an-solved.png'));
  // Level 5 alternates: "Malen" follows.
  await expect(round).toHaveAttribute('data-kind', 'malen');
});
