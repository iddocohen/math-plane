// Structure adapted from math-soccer tests/e2e/devices.spec.ts: iPad only (phones are not a target, FR-056), with the
// field, the cards and the paint grid of Mathe-Flieger.
/**
 * T071 (FR-056, critique P7): the game on an iPad held sideways (1024 by 768) and upright (768 by 1024), in WebKit with
 * touch. Runs only in the ipad projects of playwright.config.ts. Every action is a tap; no keyboard call is made.
 *
 * - The start screen and the round fit without page scroll.
 * - The targets on the field, the plan card of "Bauplan finden", the cards of "Bauen" and the paint grid of "Malen"
 *   lie inside the screen, and no button, banner or bar of the overlay covers them.
 * - The paint grid squares are at least 44 CSS px, also for the tallest grid the settings allow (stacks of 4).
 * - With the number pad setting "Automatisch", the pad shows for "Bauen", because the device has no mouse or trackpad;
 *   a task is solved with pad taps only.
 *
 * Each case saves a screenshot in its test output folder.
 */
import type { Locator, Page } from '@playwright/test';
import { expect, seedStorage, test } from './fixtures';
import { SETTINGS_KEY } from '../../src/core/storage/storage';
import type { Settings } from '../../src/core/settings/schema';
import { planInputBox, TARGET_CARD } from '../../src/game/bauenLayout';
import { gridBox } from '../../src/game/paintLayout';
import { aimPoint, PLAN_CARD } from '../../src/game/slots';
import type { TaskKind } from '../../src/core/types';
import { boxOf, expectNoScroll, inside, overlap, WORLD, type Box } from './layout';
import { answerPlan, hitTarget, shortRounds } from './play';

/** The smallest paint grid square a finger hits well (critique P7). */
const MIN_SQUARE_PX = 44;

/** A world box (1600 by 1000 units) on the screen, from the canvas box. */
async function screenBox(page: Page, box: { x: number; y: number; width: number; height: number }): Promise<Box> {
  const canvas = await boxOf(page.locator('canvas'));
  const s = canvas.width / WORLD.width;
  return { x: canvas.x + box.x * s, y: canvas.y + box.y * s, width: box.width * s, height: box.height * s };
}

/** Every visible part of the overlay's top and bottom bars: buttons, the banner, the bomb bay, the pad. */
async function overlayBoxes(page: Page): Promise<Array<{ name: string; box: Box }>> {
  const parts = page.locator('.round-top > *, .round-bottom > *');
  const out: Array<{ name: string; box: Box }> = [];
  for (const part of await parts.all()) {
    if (!(await part.isVisible())) continue;
    const name = (await part.getAttribute('data-testid')) ?? (await part.getAttribute('class')) ?? 'part';
    out.push({ name, box: await boxOf(part) });
  }
  return out;
}

/** Checks that `box` lies inside the screen and under no overlay part. */
async function expectClear(page: Page, what: string, box: Box): Promise<void> {
  const { width, height } = page.viewportSize()!;
  expect(inside(box, width, height), `${what} inside the screen`).toBe(true);
  for (const part of await overlayBoxes(page)) expect(overlap(box, part.box), `${what} under ${part.name}`).toBe(false);
}

/** The whole round fits: canvas and both bars inside the screen, no page scroll. */
async function expectRoundFits(page: Page): Promise<void> {
  const { width, height } = page.viewportSize()!;
  expect(inside(await boxOf(page.locator('canvas')), width, height), 'canvas inside').toBe(true);
  for (const part of await overlayBoxes(page)) expect(inside(part.box, width, height), `${part.name} inside`).toBe(true);
  await expectNoScroll(page);
}

/** Starts a round of `mode` with a tap on its start button and waits until it aims with the scene drawn. */
async function tapStart(page: Page, mode: 'treffer' | 'bauenMalen', query: string): Promise<Locator> {
  await page.goto(`/?${query}&test=1`);
  await expect(page.getByTestId('start')).toBeVisible();
  await page.locator(`[data-start="${mode}"]`).tap();
  const round = page.getByTestId('round');
  await expect(round).toHaveAttribute('data-phase', 'aim');
  await expect(page.locator('canvas[data-scene="round"]')).toHaveCount(1);
  return round;
}

function settingsWith(change: (s: Settings) => void): Settings {
  const s = shortRounds();
  change(s);
  return s;
}

test('the start screen fits, and in "Treffer" every target on the field is clear and hit by a tap', async ({ page }) => {
  await page.goto('/');
  const { width, height } = page.viewportSize()!;
  for (const start of ['treffer', 'bauenMalen']) {
    expect(inside(await boxOf(page.locator(`[data-start="${start}"]`)), width, height), `${start} button inside`).toBe(true);
  }
  await expectNoScroll(page);

  const round = await tapStart(page, 'treffer', 'seed=3&speed=4');
  await expectRoundFits(page);
  const kind = (await round.getAttribute('data-kind')) as TaskKind;
  const count = ((await round.getAttribute('data-slots')) ?? '').split(',').length;
  for (let slot = 0; slot < count; slot++) {
    const p = aimPoint(kind, count, slot);
    await expectClear(page, `target ${slot}`, await screenBox(page, { x: p.x - 60, y: p.y - 60, width: 120, height: 120 }));
  }
  await page.screenshot({ path: test.info().outputPath('treffer.png') });
  await hitTarget(page, round, 'tap');
  await expect(round).toHaveAttribute('data-bombs-left', '9');
});

test('the plan card of "Bauplan finden" is clear of the overlay', async ({ page }) => {
  await seedStorage(page, { [SETTINGS_KEY]: settingsWith((s) => (s.levels.treffer = { start: 3, hardest: 3 })) });
  const round = await tapStart(page, 'treffer', 'seed=5');
  await expect(round).toHaveAttribute('data-kind', 'bauplanFinden');
  await expectRoundFits(page);
  await expectClear(page, 'plan card', await screenBox(page, PLAN_CARD));
  await page.screenshot({ path: test.info().outputPath('bauplan-finden.png') });
});

test('"Bauen" shows the number pad, its cards are clear, and a task is solved with pad taps', async ({ page }) => {
  const round = await tapStart(page, 'bauenMalen', 'seed=5&speed=4');
  await expect(round).toHaveAttribute('data-kind', 'bauen');
  await expect(round).toHaveAttribute('data-number-pad', 'true');
  const pad = page.getByTestId('number-pad');
  await expect(pad).toBeVisible();
  await expectRoundFits(page);
  const plan = await answerPlan(round);
  const size = plan.length as 2 | 3;
  await expectClear(page, 'target card', await screenBox(page, TARGET_CARD));
  await expectClear(page, 'plan card', await screenBox(page, planInputBox(size)));
  await page.screenshot({ path: test.info().outputPath('bauen.png') });

  // The frame starts on the first square and moves on after each digit.
  for (const row of plan) for (const h of row) await pad.locator(`[data-key="${h}"]`).tap();
  await pad.locator('[data-key="done"]').tap();
  await expect(round).toHaveAttribute('data-tasks-done', '1');
});

test('the tallest paint grid of "Malen" is clear and its squares are at least 44 px', async ({ page }) => {
  await seedStorage(page, {
    [SETTINGS_KEY]: settingsWith((s) => {
      s.levels.bauenMalen = { start: 3, hardest: 3 };
      // Stacks of 4 make the tallest grid (4 squares high), so the squares are the smallest the game draws.
      s.buildings.maxStack = 4;
      s.buildings.sides = { vorn: true, oben: false, rechts: false, links: false };
    }),
  });
  const round = await tapStart(page, 'bauenMalen', 'seed=7');
  await expect(round).toHaveAttribute('data-kind', 'malen');
  const rows = ((await round.getAttribute('data-answer')) ?? '').split('/');
  const cols = rows[0]!.length;
  expect(rows.length).toBe(4);
  await expectRoundFits(page);
  const grid = gridBox(cols, rows.length);
  await expectClear(page, 'paint grid card', await screenBox(page, grid));
  const square = await screenBox(page, { x: grid.x0, y: grid.y0, width: grid.c, height: grid.c });
  test.info().annotations.push({ type: 'square', description: `${square.width.toFixed(1)} px (${cols} by ${rows.length})` });
  expect(square.width).toBeGreaterThanOrEqual(MIN_SQUARE_PX);
  await page.screenshot({ path: test.info().outputPath('malen.png') });
});
