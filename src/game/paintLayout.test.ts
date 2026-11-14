// T053: where the paint grid stands and what a tap on it hits (contracts/screens.md "Bauen und Malen").
import { describe, expect, it } from 'vitest';
import { gridBox, gridSquareAt, viewPointAt, worldOfViewPoint } from './paintLayout';

describe('paintLayout', () => {
  it('keeps the grid card between x 960 and 1500 for every grid size', () => {
    for (const [cols, rows] of [
      [2, 2],
      [2, 4],
      [3, 3],
      [3, 4],
    ] as const) {
      const box = gridBox(cols, rows);
      expect(box.x).toBeGreaterThanOrEqual(960);
      expect(box.x + box.width).toBeLessThanOrEqual(1500);
      expect(box.y + box.height).toBeLessThan(900);
      expect(box.c * Math.max(cols, rows)).toBeLessThanOrEqual(340);
    }
  });

  it('finds the square under a point and nothing outside the grid', () => {
    const { x0, y0, c } = gridBox(3, 4);
    expect(gridSquareAt(3, 4, x0 + 2.5 * c, y0 + 0.5 * c)).toEqual({ row: 0, col: 2 });
    expect(gridSquareAt(3, 4, x0 + 0.5 * c, y0 + 3.5 * c)).toEqual({ row: 3, col: 0 });
    expect(gridSquareAt(3, 4, x0 - 1, y0 + 1)).toBeNull();
    expect(gridSquareAt(3, 4, x0 + 1, y0 + 4 * c + 1)).toBeNull();
  });

  it('maps view points (y up) to the world and back', () => {
    const [x, y] = worldOfViewPoint(3, 3, 1.25, 2.5);
    const p = viewPointAt(3, 3, x, y)!;
    expect(p.x).toBeCloseTo(1.25);
    expect(p.y).toBeCloseTo(2.5);
    const { y0, c } = gridBox(3, 3);
    // y = 0 is the bottom of the grid.
    expect(worldOfViewPoint(3, 3, 0, 0)[1]).toBeCloseTo(y0 + 3 * c);
    expect(viewPointAt(3, 3, 0, 0)).toBeNull();
  });
});
