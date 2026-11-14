import { describe, expect, it } from 'vitest';
import { PLAN_INPUT, TARGET_CARD } from './bauenLayout';
import { GRID_CARD } from './paintLayout';
import { hillY, SCENERY_BAND, sceneryLayout } from './scenery';
import { PLAN_CARD } from './slots';
import { PLANE_BOB, PLANE_Y, SKY_BOTTOM, WORLD_WIDTH } from './world';

describe('scenery layout', () => {
  const items = sceneryLayout();

  it('ends above the top of every card and grid on the field', () => {
    const fieldTop = Math.min(GRID_CARD.y, PLAN_INPUT.y, TARGET_CARD.y, PLAN_CARD.y, SKY_BOTTOM + 10);
    expect(SCENERY_BAND.bottom).toBeLessThanOrEqual(fieldTop);
  });

  it('keeps every picture inside the band and inside the world', () => {
    expect(items.length).toBeGreaterThan(10);
    for (const item of items) {
      expect(item.y, item.picture).toBeGreaterThanOrEqual(SCENERY_BAND.top);
      expect(item.y + item.height, item.picture).toBeLessThanOrEqual(SCENERY_BAND.bottom);
      expect(item.x).toBeGreaterThanOrEqual(0);
      expect(item.x + item.width).toBeLessThanOrEqual(WORLD_WIDTH);
    }
  });

  it('stays below the middle of the plane wherever it flies', () => {
    expect(SCENERY_BAND.top).toBeGreaterThan(PLANE_Y.max + PLANE_BOB);
  });

  it('stands the trees, bushes and fences on the hills', () => {
    for (const item of items.filter((i) => i.picture !== 'sun')) {
      const foot = item.y + item.height;
      const hill = hillY(item.x + item.width / 2);
      expect(foot).toBeGreaterThan(hill);
      expect(foot - hill).toBeLessThan(12);
    }
  });
});
