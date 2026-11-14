// Helpers for the parent screens specs (settings.spec.ts, persistence.spec.ts): the gear held for 2 seconds, and one
// "Treffer" task played by tapping the canvas, solved alone or after a miss.
import type { Locator, Page } from '@playwright/test';
import type { TaskKind } from '../../src/core/types';
import { aimPoint } from '../../src/game/slots';
import { expect } from './fixtures';
import { screenPoint } from './layout';

/** Holds the gear with the mouse until the parent menu shows (the gate needs 2 seconds), then releases it. */
export async function holdGear(page: Page): Promise<void> {
  await page.getByTestId('parent-gate').hover();
  await page.mouse.down();
  await expect(page.getByRole('dialog', { name: 'Für Eltern' })).toBeVisible();
  await page.mouse.up();
}

/** Opens a parent page ("Einstellungen" or "Fortschritt") through the gate and returns it. */
export async function openParentPage(page: Page, name: 'Einstellungen' | 'Fortschritt'): Promise<Locator> {
  await holdGear(page);
  await page.getByRole('dialog', { name: 'Für Eltern' }).getByRole('button', { name }).click();
  const shown = page.getByTestId(name === 'Einstellungen' ? 'settings-page' : 'progress-page');
  await expect(shown).toBeVisible();
  return shown;
}

const numbers = (raw: string | null) => (raw ? raw.split(',').map(Number) : []);

/**
 * Plays the task shown in a "Treffer" round started with `?test=1`: with `alone` false, a bomb on a wrong target first,
 * so the task counts as solved with help. Returns the level and kind of the task.
 */
export async function playTrefferTask(page: Page, round: Locator, alone: boolean): Promise<{ level: number; kind: TaskKind }> {
  await expect(round).toHaveAttribute('data-phase', 'aim');
  const read = async () => {
    const d = await round.evaluate((el) => ({ ...(el as HTMLElement).dataset }));
    return { kind: d.kind as TaskKind, level: Number(d.level), slots: numbers(d.slots ?? null), answer: numbers(d.answer ?? null), hits: Number(d.hits), misses: Number(d.misses) };
  };
  const tap = async (kind: TaskKind, count: number, slot: number) => {
    const aim = aimPoint(kind, count, slot);
    const p = await screenPoint(page, aim.x, aim.y);
    await page.mouse.click(p.x, p.y);
  };
  const first = await read();
  if (!alone) {
    const wrong = first.slots.findIndex((_, slot) => !first.answer.includes(slot));
    await tap(first.kind, first.slots.length, wrong);
    await expect(round).toHaveAttribute('data-misses', String(first.misses + 1));
    await expect(round).toHaveAttribute('data-phase', 'aim');
  }
  const now = await read();
  await tap(now.kind, now.slots.length, now.answer[0]!);
  await expect(round).toHaveAttribute('data-hits', String(first.hits + 1));
  return { level: first.level, kind: first.kind };
}
