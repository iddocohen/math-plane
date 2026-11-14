// T047: where the "Bauen" cards and field stand, and which square a tap selects (FR-024b).
import { describe, expect, it } from 'vitest';
import { FIELD, fieldProjector, fieldSquareAt, planInputBox, planSquareAt, TARGET_CARD } from './bauenLayout';

describe('"Bauen" layout (contracts/screens.md)', () => {
  it('keeps the card on the left, the field in the middle and the plan between x 960 and 1500', () => {
    for (const size of [2, 3] as const) {
      const plan = planInputBox(size);
      expect(plan.x).toBeGreaterThanOrEqual(960);
      expect(plan.x + plan.width).toBeLessThanOrEqual(1500);
      const P = fieldProjector(size);
      const left = P(0, size, 0)[0];
      const right = P(size, 0, 0)[0];
      expect(left).toBeGreaterThan(TARGET_CARD.x + TARGET_CARD.width);
      expect(right).toBeLessThan(960);
      expect(P(size / 2, size / 2, 0)).toEqual([FIELD.x, FIELD.y]);
    }
  });
});

describe('planSquareAt', () => {
  it('finds the square under a point of the plan card, and nothing outside the grid', () => {
    const { x0, y0, c } = planInputBox(3);
    expect(planSquareAt(3, x0 + c * 0.5, y0 + c * 0.5)).toEqual({ row: 0, col: 0 });
    expect(planSquareAt(3, x0 + c * 2.5, y0 + c * 1.2)).toEqual({ row: 1, col: 2 });
    expect(planSquareAt(3, x0 - 2, y0 + 5)).toBeNull();
    expect(planSquareAt(3, x0 + 5, y0 + c * 3 + 1)).toBeNull();
  });
});

describe('fieldSquareAt', () => {
  it('finds the ground tile of an empty square', () => {
    const empty = [
      [0, 0],
      [0, 0],
    ];
    const P = fieldProjector(2);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const [x, y] = P(col + 0.5, row + 0.5, 0);
        expect(fieldSquareAt(empty, x, y)).toEqual({ row, col });
      }
    }
    expect(fieldSquareAt(empty, 0, 0)).toBeNull();
  });

  it('finds a tower by its top and its faces, the nearer tower first', () => {
    const heights = [
      [3, 1],
      [1, 0],
    ];
    const P = fieldProjector(2);
    const [tx, ty] = P(0.5, 0.5, 3);
    expect(fieldSquareAt(heights, tx, ty)).toEqual({ row: 0, col: 0 });
    // The front face of the tall back tower, above the front tower's top.
    const [fx, fy] = P(0.5, 1, 2.5);
    expect(fieldSquareAt(heights, fx, fy)).toEqual({ row: 0, col: 0 });
    // The top of the front-left tower lies over the back tower's lower front face: the nearer tower wins.
    const [nx, ny] = P(0.5, 1.5, 1);
    expect(fieldSquareAt(heights, nx, ny)).toEqual({ row: 1, col: 0 });
  });
});
