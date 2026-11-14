// User Story 2 (spec.md, quickstart): "Bauplan finden" on level 3 and "Ansicht finden" on level 5, started with
// seeded settings and played with the keyboard.
import type { Locator, Page } from '@playwright/test';
import { defaultSettings } from '../../src/core/settings/defaults';
import { SETTINGS_KEY } from '../../src/core/storage/storage';
import { PLAN_CARD } from '../../src/game/slots';
import { expect, screenshotWhenDrawn, seedStorage, startRound, test } from './fixtures';
import { screenPoint } from './layout';

const HIT_LINE = /^(Treffer!|Volltreffer!|Super gezielt!)$/;
const VIEW_MISS = /^Das ist (die Ansicht von (vorn|oben|rechts|links)|eine andere Ansicht)\.$/;

interface Seen {
  phase: string;
  kind: string;
  side: string;
  slots: number[];
  answer: number[];
  hits: number;
  misses: number;
}

const numbers = (raw: string | undefined) => (raw ? raw.split(',').map(Number) : []);

async function seen(round: Locator): Promise<Seen> {
  const a = await round.evaluate((el) => ({ ...(el as HTMLElement).dataset }));
  return {
    phase: a.phase ?? '',
    kind: a.kind ?? '',
    side: a.side ?? '',
    slots: numbers(a.slots),
    answer: numbers(a.answer),
    hits: Number(a.hits),
    misses: Number(a.misses),
  };
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

/** Starts "Treffer" on `level` only, with `bombs` bombs. */
async function startAt(page: Page, level: 3 | 5, seed: number, bombs = 10): Promise<Locator> {
  const settings = defaultSettings();
  settings.levels.treffer = { start: level, hardest: level };
  settings.round.bombs = bombs;
  await seedStorage(page, { [SETTINGS_KEY]: settings });
  await page.goto(`/?seed=${seed}&speed=4&test=1`);
  return startRound(page, '1');
}

/** The keyboard marker: the first arrow shows it on its slot, every further right arrow moves it one slot on. */
function keyboardMarker(page: Page) {
  let slot = 0;
  let shown = false;
  return async (target: number, count: number) => {
    if (!shown) {
      await page.keyboard.press('ArrowRight');
      shown = true;
    }
    while (slot !== target) {
      await page.keyboard.press('ArrowRight');
      slot = (slot + 1) % count;
    }
    await page.keyboard.press('Enter');
  };
}

/**
 * The share of near-white pixels in a box of the 1600 by 1000 world, read from a screenshot decoded in the page. The
 * cards are white; the field around them is grass.
 */
async function whiteShare(page: Page, x: number, y: number, w: number, h: number): Promise<number> {
  const a = await screenPoint(page, x, y);
  const b = await screenPoint(page, x + w, y + h);
  const png = await page.screenshot({ clip: { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y } });
  return page.evaluate(async (data) => {
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d')!;
    g.drawImage(img, 0, 0);
    const px = g.getImageData(0, 0, c.width, c.height).data;
    let white = 0;
    for (let i = 0; i < px.length; i += 4) if (px[i]! > 225 && px[i + 1]! > 225 && px[i + 2]! > 225) white += 1;
    return white / (px.length / 4);
  }, png.toString('base64'));
}

/** The middle strip of the "Getroffen" card's place, below the plan card. */
const hitCardShare = (page: Page) => whiteShare(page, PLAN_CARD.x + 30, PLAN_CARD.y + PLAN_CARD.height + PLAN_CARD.gap + 50, PLAN_CARD.width - 60, 40);
const planCardShare = (page: Page) => whiteShare(page, PLAN_CARD.x + 30, PLAN_CARD.y + 50, PLAN_CARD.width - 60, 40);

test('level 3 "Bauplan finden": one right building per plan card, and a miss shows the "Getroffen" card', async ({ page }, testInfo) => {
  const round = await startAt(page, 3, 5);
  const banner = page.getByTestId('banner');
  const lines = await recordMessages(page);
  await expect(round).toHaveAttribute('data-kind', 'bauplanFinden');
  await expect(round).toHaveAttribute('data-level', '3');
  await expect(banner).toHaveText('Triff das Gebäude zu diesem Bauplan!');
  await expect.poll(() => planCardShare(page)).toBeGreaterThan(0.5);
  expect(await hitCardShare(page)).toBeLessThan(0.2);
  await screenshotWhenDrawn(page, testInfo.outputPath('bauplan-start.png'));

  const bomb = keyboardMarker(page);
  for (let task = 0; task < 4; task++) {
    await expect(round).toHaveAttribute('data-phase', 'aim');
    const s = await seen(round);
    expect(s.kind).toBe('bauplanFinden');
    expect([...s.slots].sort()).toEqual([0, 1, 2]);
    // Exactly one building matches the plan card.
    expect(s.answer).toHaveLength(1);
    if (task === 0) {
      const wrong = [0, 1, 2].find((slot) => !s.answer.includes(slot))!;
      await bomb(wrong, 3);
      await expect.poll(lines).toContain('Dieses Gebäude hat einen anderen Bauplan.');
      await expect(round).toHaveAttribute('data-misses', '1');
      // The "Getroffen" card appears below the plan card and the task stays.
      await expect.poll(() => hitCardShare(page)).toBeGreaterThan(0.5);
      await expect(banner).toHaveText('Triff das Gebäude zu diesem Bauplan!');
      await screenshotWhenDrawn(page, testInfo.outputPath('bauplan-getroffen.png'));
      await expect(round).toHaveAttribute('data-phase', 'aim');
      const after = await seen(round);
      expect(after.slots.indexOf(s.slots[wrong]!)).not.toBe(wrong);
      continue;
    }
    const shownBefore = (await lines()).length;
    await bomb(s.answer[0]!, 3);
    await expect(round).toHaveAttribute('data-hits', String(s.hits + 1));
    await expect.poll(async () => (await lines()).slice(shownBefore).some((l) => HIT_LINE.test(l))).toBe(true);
    // The next task starts without the "Getroffen" card.
    await expect(round).toHaveAttribute('data-phase', 'aim');
    await expect.poll(() => hitCardShare(page)).toBeLessThan(0.2);
  }
});

test('level 5 "Ansicht finden": the side asked covers all four sides, one right card each, and a miss names the side', async ({ page }, testInfo) => {
  const round = await startAt(page, 5, 8, 20);
  const banner = page.getByTestId('banner');
  const lines = await recordMessages(page);
  await expect(round).toHaveAttribute('data-kind', 'ansichtFinden');
  await screenshotWhenDrawn(page, testInfo.outputPath('ansicht-start.png'));

  const bomb = keyboardMarker(page);
  const sides = new Set<string>();
  let missed = false;
  for (let task = 0; task < 19 && sides.size < 4; task++) {
    await expect(round).toHaveAttribute('data-phase', 'aim');
    const s = await seen(round);
    expect(s.kind).toBe('ansichtFinden');
    expect(['vorn', 'oben', 'rechts', 'links']).toContain(s.side);
    await expect(banner).toHaveText(`Welche Ansicht siehst du von ${s.side}?`);
    expect([...s.slots].sort()).toEqual([0, 1, 2]);
    expect(s.answer).toHaveLength(1);
    if (!sides.has(s.side)) await screenshotWhenDrawn(page, testInfo.outputPath(`ansicht-${s.side}.png`));
    sides.add(s.side);
    if (!missed) {
      missed = true;
      const wrong = [0, 1, 2].find((slot) => !s.answer.includes(slot))!;
      await bomb(wrong, 3);
      await expect.poll(async () => (await lines()).some((l) => VIEW_MISS.test(l))).toBe(true);
      await expect(round).toHaveAttribute('data-misses', '1');
      await expect(banner).toHaveText(`Welche Ansicht siehst du von ${s.side}?`);
      await expect(round).toHaveAttribute('data-phase', 'aim');
      const after = await seen(round);
      expect(after.slots.indexOf(s.slots[wrong]!)).not.toBe(wrong);
      await bomb(after.answer[0]!, 3);
    } else {
      await bomb(s.answer[0]!, 3);
    }
    await expect(round).toHaveAttribute('data-hits', String(s.hits + 1));
  }
  expect([...sides].sort()).toEqual(['links', 'oben', 'rechts', 'vorn']);
});
