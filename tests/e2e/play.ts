// Helpers for the polish specs (tasks.md Phase 10): short rounds of both modes, played to the end with the answers
// from `data-answer` (`?test=1`). Each step waits on game state, never a fixed time.
import type { Locator, Page } from '@playwright/test';
import { defaultSettings } from '../../src/core/settings/defaults';
import type { Settings } from '../../src/core/settings/schema';
import { aimPoint } from '../../src/game/slots';
import type { TaskKind } from '../../src/core/types';
import { expect } from './fixtures';
import { screenPoint } from './layout';

/** The shortest rounds the settings allow: 5 bombs in "Treffer", 3 tasks in "Bauen und Malen". */
export function shortRounds(): Settings {
  const settings = defaultSettings();
  settings.round = { bombs: 5, tasks: 3 };
  return settings;
}

const numbers = (raw: string | undefined) => (raw ? raw.split(',').map(Number) : []);

/** How a spec presses on the screen: a mouse click, or a touch tap on the iPad projects. */
export type Press = 'click' | 'tap';

async function pressAt(page: Page, x: number, y: number, press: Press): Promise<void> {
  if (press === 'tap') await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

/** Bombs the right target of the "Treffer" task shown, by a click or tap on the canvas, and waits for the hit. */
export async function hitTarget(page: Page, round: Locator, press: Press = 'click'): Promise<void> {
  await expect(round).toHaveAttribute('data-phase', 'aim');
  const d = await round.evaluate((el) => ({ ...(el as HTMLElement).dataset }));
  const slots = numbers(d.slots);
  const answer = numbers(d.answer);
  expect(answer.length, 'data-answer is filled (?test=1)').toBeGreaterThan(0);
  const aim = aimPoint(d.kind as TaskKind, slots.length, answer[0]!);
  const p = await screenPoint(page, aim.x, aim.y);
  await pressAt(page, p.x, p.y, press);
  await expect(round).toHaveAttribute('data-hits', String(Number(d.hits) + 1));
}

/** Plays a whole "Treffer" round of `bombs` hits and waits for the round end. */
export async function playTrefferRound(page: Page, round: Locator, bombs: number, press: Press = 'click'): Promise<void> {
  for (let i = 0; i < bombs; i++) await hitTarget(page, round, press);
  await expect(page.getByTestId('round-end')).toBeVisible();
}

/** The building's plan of a "Bauen" task from `data-answer` ("3,2/2,1": rows from the back to "vorn"). */
export async function answerPlan(round: Locator): Promise<number[][]> {
  const raw = (await round.getAttribute('data-answer')) ?? '';
  expect(raw).toMatch(/^\d(,\d)+(\/\d(,\d)+)+$/);
  return raw.split('/').map((row) => row.split(',').map(Number));
}

/**
 * Solves the "Bauen" task shown with the keyboard: the frame starts on the first square and moves on after each digit,
 * so the plan is typed in reading order; F is "Fertig". Waits until the task counts as done.
 */
export async function solveBauen(page: Page, round: Locator): Promise<void> {
  await expect(round).toHaveAttribute('data-phase', 'aim');
  await expect(round).toHaveAttribute('data-kind', 'bauen');
  const done = Number(await round.getAttribute('data-tasks-done'));
  for (const row of await answerPlan(round)) for (const h of row) await page.keyboard.press(String(h));
  await page.keyboard.press('f');
  await expect(round).toHaveAttribute('data-tasks-done', String(done + 1));
}

/** Plays a whole "Bauen und Malen" round of level 1 ("Bauen" only) with `tasks` tasks and waits for the round end. */
export async function playBauenRound(page: Page, round: Locator, tasks: number): Promise<void> {
  for (let i = 0; i < tasks; i++) await solveBauen(page, round);
  await expect(page.getByTestId('round-end')).toBeVisible();
}

/** "Zurück" on the round end: back to the start screen. */
export async function backToStart(page: Page): Promise<void> {
  await page.getByTestId('round-end').getByRole('button', { name: 'Zurück' }).click();
  await expect(page.getByTestId('start')).toBeVisible();
}
