// User Story 1 (spec.md, quickstart scenarios 1 and 2): "Treffer" with solids and flat shapes, played with the keyboard
// only and by tapping the canvas.
import type { Locator, Page } from '@playwright/test';
import { defaultSettings } from '../../src/core/settings/defaults';
import { SETTINGS_KEY } from '../../src/core/storage/storage';
import { aimPoint } from '../../src/game/slots';
import { expect, sceneReady, screenshotWhenDrawn, seedStorage, startRound, test } from './fixtures';
import { screenPoint } from './layout';

const HIT_LINE = /^(Treffer!|Volltreffer!|Super gezielt!)$/;
const MISS_LINE = /^Das ist (der|die|das) (Würfel|Quader|Zylinder|Kugel|Pyramide|Kreis|Dreieck|Quadrat|Rechteck)\.$/;

interface Seen {
  phase: string;
  kind: string;
  slots: number[];
  answer: number[];
  bombsLeft: number;
  hits: number;
  misses: number;
}

const numbers = (raw: string | null) => (raw ? raw.split(',').map(Number) : []);

async function seen(round: Locator): Promise<Seen> {
  const a = await round.evaluate((el) => ({ ...(el as HTMLElement).dataset }));
  return {
    phase: a.phase ?? '',
    kind: a.kind ?? '',
    slots: numbers(a.slots ?? null),
    answer: numbers(a.answer ?? null),
    bombsLeft: Number(a.bombsLeft),
    hits: Number(a.hits),
    misses: Number(a.misses),
  };
}

/**
 * Records every line the message shows, so a line that shows only briefly at a raised `?speed=` is still seen. Returns
 * a function that reads the lines so far.
 */
async function recordMessages(page: Page): Promise<() => Promise<string[]>> {
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="message"]')!;
    const lines: string[] = [];
    (window as unknown as { messageLines: string[] }).messageLines = lines;
    let last = el.textContent ?? '';
    new MutationObserver(() => {
      const text = el.textContent ?? '';
      // The same line twice in a row (two hits) shows as two lines: the new task clears the line in between.
      if (text !== last && text) lines.push(text);
      last = text;
    }).observe(el, { childList: true, characterData: true, subtree: true });
  });
  return () => page.evaluate(() => [...(window as unknown as { messageLines: string[] }).messageLines]);
}

/** A slot that holds a wrong choice. */
function wrongSlot(s: Seen): number {
  return s.slots.findIndex((_, slot) => !s.answer.includes(slot));
}

/**
 * The keyboard marker as the test knows it: the first arrow shows it on slot 0 without moving it, every further right
 * arrow moves it one slot on (TargetsView).
 */
function keyboardMarker(page: Page) {
  let slot = 0;
  let shown = false;
  return {
    async moveTo(target: number, count: number) {
      if (!shown) {
        await page.keyboard.press('ArrowRight');
        shown = true;
      }
      while (slot !== target) {
        await page.keyboard.press('ArrowRight');
        slot = (slot + 1) % count;
      }
    },
  };
}

test('a keyboard-only round of 10 bombs: hits, misses with reshuffle, one bomb per pass, end screen and "Nochmal"', async ({ page }, testInfo) => {
  await page.goto('/?seed=7&speed=4&test=1');
  const round = await startRound(page, '1');
  const banner = page.getByTestId('banner');
  await expect(round).toHaveAttribute('data-kind', 'koerper');
  await expect(round).toHaveAttribute('data-bombs-left', '10');
  await expect(banner).toHaveText(/^Triff (den|die) (Würfel|Quader|Zylinder|Kugel|Pyramide)!$/);
  await screenshotWhenDrawn(page, testInfo.outputPath('treffer-start.png'));

  const marker = keyboardMarker(page);
  const messages = await recordMessages(page);
  const missAt = new Set([0, 3, 6]);
  let hits = 0;
  for (let bomb = 0; bomb < 10; bomb++) {
    await expect(round).toHaveAttribute('data-phase', 'aim');
    const before = await seen(round);
    const task = (await banner.textContent()) ?? '';
    const shownBefore = (await messages()).length;
    const linesSince = async () => (await messages()).slice(shownBefore);
    expect(before.slots).toHaveLength(4);
    expect(before.answer).toHaveLength(1);
    const miss = missAt.has(bomb);
    const slot = miss ? wrongSlot(before) : before.answer[0]!;
    await marker.moveTo(slot, before.slots.length);
    await page.keyboard.press('Enter');
    await expect(round).toHaveAttribute('data-phase', 'pass');
    if (bomb === 0) await screenshotWhenDrawn(page, testInfo.outputPath('treffer-pass.png'));
    // One bomb per pass (FR-008): another target and Enter during the pass drop nothing.
    const other = (slot + 1) % before.slots.length;
    await marker.moveTo(other, before.slots.length);
    await page.keyboard.press('Enter');
    await expect(round).toHaveAttribute('data-bombs-left', String(9 - bomb));
    if (miss) {
      await expect.poll(async () => (await linesSince()).some((l) => MISS_LINE.test(l))).toBe(true);
      const after = await seen(round);
      expect(after.misses).toBe(before.misses + 1);
      // The choice that was hit stands in another slot now; the task stays.
      expect(after.slots.indexOf(before.slots[slot]!)).not.toBe(slot);
      expect([...after.slots].sort()).toEqual([0, 1, 2, 3]);
      await expect(banner).toHaveText(task);
      if (bomb === 0) await screenshotWhenDrawn(page, testInfo.outputPath('treffer-miss.png'));
    } else {
      hits += 1;
      await expect(round).toHaveAttribute('data-hits', String(hits));
      await expect.poll(async () => (await linesSince()).some((l) => HIT_LINE.test(l))).toBe(true);
    }
    // Still exactly one bomb used after the round moved on.
    await expect(round).toHaveAttribute('data-phase', bomb === 9 ? 'ended' : 'aim');
    await expect(round).toHaveAttribute('data-bombs-left', String(9 - bomb));
  }

  const end = page.getByTestId('round-end');
  await expect(end).toBeVisible();
  await expect(page.getByTestId('round-result')).toHaveText(`${hits} Treffer mit 10 Bomben`);
  await expect(end).not.toContainText(/verloren/i);
  await screenshotWhenDrawn(page, testInfo.outputPath('treffer-end.png'));

  await page.keyboard.press('Enter');
  await expect(end).toBeHidden();
  await expect(round).toHaveAttribute('data-phase', 'aim');
  await expect(round).toHaveAttribute('data-bombs-left', '10');
  await expect(round).toHaveAttribute('data-hits', '0');
  await sceneReady(page);
});

test('tapping a target bombs it, and a tap during the pass is ignored', async ({ page }) => {
  await page.goto('/?seed=11&speed=3&test=1');
  const round = await startRound(page, '1');
  const tapSlot = async (s: Seen, slot: number) => {
    const aim = aimPoint('koerper', s.slots.length, slot);
    const p = await screenPoint(page, aim.x, aim.y);
    await page.mouse.click(p.x, p.y);
  };
  const first = await seen(round);
  const wrong = wrongSlot(first);
  await tapSlot(first, wrong);
  await expect(round).toHaveAttribute('data-phase', 'pass');
  await tapSlot(first, first.answer[0]!);
  await expect(round).toHaveAttribute('data-bombs-left', '9');
  await expect(round).toHaveAttribute('data-misses', '1');
  await expect(round).toHaveAttribute('data-hits', '0');
  await expect(page.getByTestId('message')).toHaveText(MISS_LINE);
  await expect(round).toHaveAttribute('data-phase', 'aim');

  const second = await seen(round);
  await tapSlot(second, second.answer[0]!);
  await expect(round).toHaveAttribute('data-hits', '1');
  await expect(round).toHaveAttribute('data-bombs-left', '8');
});

test('level 2 shows flat shapes from above and names a missed shape', async ({ page }, testInfo) => {
  const settings = defaultSettings();
  settings.levels.treffer = { start: 2, hardest: 2 };
  await seedStorage(page, { [SETTINGS_KEY]: settings });
  await page.goto('/?seed=3&speed=4&test=1');
  const round = await startRound(page, '1');
  await expect(round).toHaveAttribute('data-kind', 'formen');
  await expect(round).toHaveAttribute('data-level', '2');
  await expect(page.getByTestId('banner')).toHaveText(/^Triff (den Kreis|das Dreieck|das Quadrat|das Rechteck)!$/);
  await screenshotWhenDrawn(page, testInfo.outputPath('formen-start.png'));
  const s = await seen(round);
  await page.keyboard.press('ArrowRight');
  for (let i = 0; i < wrongSlot(s); i++) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect(round).toHaveAttribute('data-misses', '1');
  await expect(page.getByTestId('message')).toHaveText(/^Das ist (der Kreis|das Dreieck|das Quadrat|das Rechteck)\.$/);
});
