// Adapted from math-soccer tests/e2e/layout.ts (which copied it from math-tank): the box checks, plus the place of a
// world point on the screen, so a spec can tap a target on the canvas.
/**
 * Layout helpers for the round screen: element boxes, "inside the viewport", "no overlap", no page scroll, and where a
 * point of the 1600 by 1000 world (contracts/screens.md) is on the screen.
 */
import type { Locator, Page } from '@playwright/test';
import { expect } from './fixtures';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const WORLD = { width: 1600, height: 1000 } as const;

export async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  expect(box, 'element has a box').not.toBeNull();
  return box!;
}

export function inside(box: Box, width: number, height: number): boolean {
  const e = 0.5;
  return box.x >= -e && box.y >= -e && box.x + box.width <= width + e && box.y + box.height <= height + e;
}

export function overlap(a: Box, b: Box): boolean {
  const e = 0.5;
  return a.x + e < b.x + b.width && b.x + e < a.x + a.width && a.y + e < b.y + b.height && b.y + e < a.y + a.height;
}

export async function expectNoScroll(page: Page): Promise<void> {
  const size = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    sh: document.documentElement.scrollHeight,
    w: window.innerWidth,
    h: window.innerHeight,
  }));
  expect(size.sw).toBeLessThanOrEqual(size.w);
  expect(size.sh).toBeLessThanOrEqual(size.h);
}

/** The screen point of world point (x, y) on the game canvas, which shows the whole world scaled to fit. */
export async function screenPoint(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const canvas = await boxOf(page.locator('canvas'));
  return { x: canvas.x + (x / WORLD.width) * canvas.width, y: canvas.y + (y / WORLD.height) * canvas.height };
}
