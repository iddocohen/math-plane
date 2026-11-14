// User Story 5 (spec.md, quickstart scenario 6): help in three steps in every task kind (H or the yellow "?"), help
// that opens by itself after 2 misses, no star or bomb taken away, and the task recorded as solved with help.
import type { Locator, Page } from '@playwright/test';
import { de } from '../../src/i18n/de';
import { defaultSettings } from '../../src/core/settings/defaults';
import type { Settings } from '../../src/core/settings/schema';
import { HANGAR_KEY, PROGRESS_KEY, SETTINGS_KEY } from '../../src/core/storage/storage';
import type { TaskKind } from '../../src/core/types';
import { gridBox, worldOfViewPoint } from '../../src/game/paintLayout';
import { aimPoint } from '../../src/game/slots';
import { expect, screenshotWhenDrawn, seedStorage, startRound, test } from './fixtures';
import { screenPoint } from './layout';

const help = de.help;

async function storedStars(page: Page): Promise<number> {
  return page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? '{"stars":0}').stars as number, HANGAR_KEY);
}

interface Attempt {
  kind: string;
  outcome: string;
  helpStep: number;
  misses: number;
}

async function lastAttempt(page: Page): Promise<Attempt | null> {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    const attempts = raw ? (JSON.parse(raw).attempts as Attempt[]) : [];
    return attempts.at(-1) ?? null;
  }, PROGRESS_KEY);
}

async function tapWorld(page: Page, x: number, y: number): Promise<void> {
  const p = await screenPoint(page, x, y);
  await page.mouse.click(p.x, p.y);
}

/** Starts a round of `mode` at one level, with `change` applied to the default settings. */
async function startAt(page: Page, mode: 'treffer' | 'bauenMalen', level: number, seed: number, change: (s: Settings) => void = () => {}): Promise<Locator> {
  const settings = defaultSettings();
  settings.levels[mode] = { start: level as 1, hardest: level as 1 };
  change(settings);
  await seedStorage(page, { [SETTINGS_KEY]: settings });
  await page.goto(`/?seed=${seed}&speed=4&test=1`);
  return startRound(page, mode === 'treffer' ? '1' : '2');
}

/** Opens help steps 1 to 3 with H and checks the step and the line each time; a fourth H changes nothing. */
async function threeSteps(page: Page, round: Locator, lines: [RegExp | string, RegExp | string, RegExp | string], shot: (name: string) => Promise<void>): Promise<void> {
  const message = page.getByTestId('message');
  for (const [i, line] of lines.entries()) {
    await page.keyboard.press('h');
    await expect(round).toHaveAttribute('data-help', String(i + 1));
    await expect(message).toHaveText(line);
    await shot(`step-${i + 1}`);
  }
  await page.keyboard.press('h');
  await expect(round).toHaveAttribute('data-help', '3');
  await expect(round).toHaveAttribute('data-misses', '0');
}

const anyOf = (texts: readonly string[]) => new RegExp(`^(${texts.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`);

const TREFFER: Array<{ level: number; kind: TaskKind; hint: RegExp }> = [
  { level: 1, kind: 'koerper', hint: anyOf(Object.values(help.solids)) },
  { level: 2, kind: 'formen', hint: anyOf(Object.values(help.shapes)) },
  { level: 3, kind: 'bauplanFinden', hint: anyOf([help.bauplanFinden]) },
  { level: 4, kind: 'ansichtFinden', hint: anyOf([help.sides.vorn, help.sides.oben]) },
];

for (const { level, kind, hint } of TREFFER) {
  test(`"${de.kinds[kind]}": three H presses show a hint, a blinking target and the arrow; the hit keeps its star`, async ({ page }, testInfo) => {
    const round = await startAt(page, 'treffer', level, 4);
    await expect(round).toHaveAttribute('data-kind', kind);
    await threeSteps(page, round, [hint, help.pointerBlink, help.answerTarget], (name) => screenshotWhenDrawn(page, testInfo.outputPath(`${kind}-${name}.png`)));
    // Help took no bomb (FR-033).
    await expect(round).toHaveAttribute('data-bombs-left', '10');

    // The child bombs the answer the arrow shows.
    const slots = ((await round.getAttribute('data-slots')) ?? '').split(',');
    const slot = Number(await round.getAttribute('data-answer'));
    const aim = aimPoint(kind, slots.length, slot);
    await tapWorld(page, aim.x, aim.y);
    await expect(round).toHaveAttribute('data-hits', '1');
    await expect(round).toHaveAttribute('data-bombs-left', '9');
    await expect.poll(() => storedStars(page)).toBe(1);
    await expect.poll(() => lastAttempt(page)).toMatchObject({ kind, outcome: 'withHelp', helpStep: 3, misses: 0 });

    // The next task starts without help.
    await expect(round).toHaveAttribute('data-phase', 'aim');
    await expect(round).toHaveAttribute('data-help', '0');
  });
}

test('"Treffer": 2 misses open help step 1 by itself, the third miss step 2; no extra bomb is lost', async ({ page }, testInfo) => {
  const round = await startAt(page, 'treffer', 1, 7);
  const message = page.getByTestId('message');
  const tapSlot = async (slot: number) => {
    const slots = ((await round.getAttribute('data-slots')) ?? '').split(',');
    const aim = aimPoint('koerper', slots.length, slot);
    await tapWorld(page, aim.x, aim.y);
  };
  const wrongSlot = async () => {
    const answer = Number(await round.getAttribute('data-answer'));
    return answer === 0 ? 1 : 0;
  };
  const solidHint = anyOf(Object.values(help.solids)).source.slice(1, -1);

  await tapSlot(await wrongSlot());
  await expect(round).toHaveAttribute('data-misses', '1');
  await expect(round).toHaveAttribute('data-help', '0');
  await expect(round).toHaveAttribute('data-phase', 'aim');

  await tapSlot(await wrongSlot());
  await expect(round).toHaveAttribute('data-misses', '2');
  await expect(round).toHaveAttribute('data-help', '1');
  // The miss line stays, followed by the hint.
  await expect(message).toHaveText(new RegExp(`^Das ist (der|die) \\S+\\. (${solidHint})$`));
  await expect(round).toHaveAttribute('data-phase', 'aim');

  await tapSlot(await wrongSlot());
  await expect(round).toHaveAttribute('data-misses', '3');
  await expect(round).toHaveAttribute('data-help', '2');
  await expect(message).toHaveText(new RegExp(`${help.pointerBlink}$`));
  await expect(round).toHaveAttribute('data-phase', 'aim');
  await screenshotWhenDrawn(page, testInfo.outputPath('auto-help-blink.png'));

  await tapSlot(Number(await round.getAttribute('data-answer')));
  await expect(round).toHaveAttribute('data-hits', '1');
  // One bomb per pass: 4 passes, 4 bombs.
  await expect(round).toHaveAttribute('data-bombs-left', '6');
  await expect.poll(() => storedStars(page)).toBe(1);
  await expect.poll(() => lastAttempt(page)).toMatchObject({ kind: 'koerper', outcome: 'withHelp', helpStep: 2, misses: 3 });
});

test('"Bauen": the "?" button and H show the hint, one right number, then the whole plan; the child types it', async ({ page }, testInfo) => {
  const round = await startAt(page, 'bauenMalen', 1, 5);
  await expect(round).toHaveAttribute('data-kind', 'bauen');
  const plan = ((await round.getAttribute('data-answer')) ?? '').split('/').map((row) => row.split(',').map(Number));
  const message = page.getByTestId('message');

  await page.getByTestId('help').click();
  await expect(round).toHaveAttribute('data-help', '1');
  await expect(message).toHaveText(help.bauen);
  // The first square written right: the pointer shows the next one.
  await page.keyboard.press(String(plan[0]![0]));
  await page.keyboard.press('h');
  await expect(round).toHaveAttribute('data-help', '2');
  await expect(message).toHaveText(help.pointerCubes(plan[0]![1]!));
  await screenshotWhenDrawn(page, testInfo.outputPath('bauen-step-2.png'));
  await page.keyboard.press('h');
  await expect(round).toHaveAttribute('data-help', '3');
  await expect(message).toHaveText(help.answerPlan);
  await screenshotWhenDrawn(page, testInfo.outputPath('bauen-step-3.png'));

  // The child types the rest of the plan; the frame moved on to the second square.
  for (const [r, row] of plan.entries()) for (const [c, h] of row.entries()) if (r > 0 || c > 0) await page.keyboard.press(String(h));
  await page.keyboard.press('f');
  await expect(round).toHaveAttribute('data-tasks-done', '1');
  await expect.poll(() => storedStars(page)).toBe(3);
  await expect.poll(() => lastAttempt(page)).toMatchObject({ kind: 'bauen', outcome: 'withHelp', helpStep: 3, misses: 0 });
  await expect(round).toHaveAttribute('data-help', '0');
});

test('"Bauen": 2 wrong "Fertig" open help step 1 by itself, the third step 2', async ({ page }) => {
  const round = await startAt(page, 'bauenMalen', 1, 5);
  const message = page.getByTestId('message');
  await page.keyboard.press('f');
  await expect(round).toHaveAttribute('data-misses', '1');
  await expect(round).toHaveAttribute('data-help', '0');
  await page.keyboard.press('f');
  await expect(round).toHaveAttribute('data-misses', '2');
  await expect(round).toHaveAttribute('data-help', '1');
  await expect(message).toHaveText(`${de.feedback.almost} ${help.bauen}`);
  await page.keyboard.press('f');
  await expect(round).toHaveAttribute('data-help', '2');
  await expect(message).toHaveText(new RegExp(`^${de.feedback.almost} Hier (steht|stehen) \\d Würfel\\.$`));
  await expect.poll(() => storedStars(page)).toBe(0);
});

test('"Malen": three H presses show the hint, the view faintly, then stronger; no star after full help when the parent says so', async ({ page }, testInfo) => {
  const round = await startAt(page, 'bauenMalen', 3, 8, (s) => {
    s.pointAfterFullHelp = false;
  });
  await expect(round).toHaveAttribute('data-kind', 'malen');
  const side = (await round.getAttribute('data-side')) as 'vorn' | 'oben';
  await threeSteps(page, round, [help.sides[side], help.pointerView, help.answerView], (name) => screenshotWhenDrawn(page, testInfo.outputPath(`malen-${name}.png`)));

  const view = ((await round.getAttribute('data-answer')) ?? '').split('/').map((row) => [...row].map((ch) => ch === '#'));
  const box = gridBox(view[0]!.length, view.length);
  for (const [r, row] of view.entries()) for (const [c, on] of row.entries()) if (on) await tapWorld(page, box.x0 + (c + 0.5) * box.c, box.y0 + (r + 0.5) * box.c);
  await page.getByTestId('done').click();
  await expect(round).toHaveAttribute('data-tasks-done', '1');
  await expect.poll(() => lastAttempt(page)).toMatchObject({ kind: 'malen', outcome: 'withHelp', helpStep: 3, misses: 0 });
  // "Punkt nach voller Hilfe" is off: no star after step 3 (FR-036), and none taken away either.
  expect(await storedStars(page)).toBe(0);
});

test('"Male an": three H presses show the hint, one color dot, then all of them; the child colors it', async ({ page }, testInfo) => {
  const round = await startAt(page, 'bauenMalen', 5, 3);
  await expect(round).toHaveAttribute('data-kind', 'maleAn');
  const side = (await round.getAttribute('data-side')) as 'vorn' | 'oben' | 'rechts' | 'links';
  await threeSteps(page, round, [`${help.sides[side]} ${help.maleAn}`, help.pointerColor, help.answerColors], (name) =>
    screenshotWhenDrawn(page, testInfo.outputPath(`male-an-${name}.png`)),
  );

  const [size, ...parts] = ((await round.getAttribute('data-answer')) ?? '').split(' ');
  const [cols, rows] = size!.split('x').map(Number) as [number, number];
  const palette = page.getByTestId('palette');
  for (const part of parts) {
    const m = /^(\d+):(#[0-9a-f]{6})@([\d.]+),([\d.]+)$/.exec(part)!;
    await palette.locator(`[data-color="${m[2]}"]`).click();
    const [x, y] = worldOfViewPoint(cols, rows, Number(m[3]), Number(m[4]));
    await tapWorld(page, x, y);
  }
  await page.getByTestId('done').click();
  await expect(round).toHaveAttribute('data-tasks-done', '1');
  await expect.poll(() => storedStars(page)).toBe(3);
  await expect.poll(() => lastAttempt(page)).toMatchObject({ kind: 'maleAn', outcome: 'withHelp', helpStep: 3, misses: 0 });
});
