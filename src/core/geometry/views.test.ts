import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { SIDES } from '../types';
import { generateCubePlan, type Plan } from './plan';
import { cubeView, signature, viewsEqual } from './views';

/** The prototype's `viewOf` (specs/001-math-plane/prototype/index.html), copied as it is, with 3 rows. */
function prototypeViewOf(h: number[][], v: string): boolean[][] {
  const n = h.length;
  const rows = 3;
  const out: boolean[][] = [];
  if (v === 'oben') return h.map((r) => r.map((x) => x > 0));
  for (let r = 0; r < rows; r++) {
    const z = rows - 1 - r;
    const row: boolean[] = [];
    for (let j = 0; j < n; j++) {
      let mx = 0;
      if (v === 'vorn') for (let y = 0; y < n; y++) mx = Math.max(mx, h[y]![j]!);
      if (v === 'rechts') {
        const y = n - 1 - j;
        for (let x = 0; x < n; x++) mx = Math.max(mx, h[y]![x]!);
      }
      if (v === 'links') {
        const y = j;
        for (let x = 0; x < n; x++) mx = Math.max(mx, h[y]![x]!);
      }
      row.push(mx > z);
    }
    out.push(row);
  }
  return out;
}

const FIXED: Plan[] = [
  [[2, 1], [1, 1]],
  [[3, 2], [2, 1]],
  [[3, 2, 1], [2, 1, 0], [1, 0, 0]],
  [[0, 1, 3], [1, 2, 0], [2, 0, 1]],
  [[1, 0, 0], [0, 0, 0], [0, 0, 2]],
];

describe('cubeView (research R3)', () => {
  it('equals the prototype viewOf on fixed plans, every side', () => {
    for (const p of FIXED) for (const side of SIDES) expect(cubeView(p, side, 3).cells).toEqual(prototypeViewOf(p, side));
  });

  it('equals the prototype viewOf on 200 generated 3×3 plans', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const p = generateCubePlan(createRng(seed), { size: 3, minStack: 0, maxStack: 3 });
      for (const side of SIDES) expect(cubeView(p, side, 3).cells).toEqual(prototypeViewOf(p, side));
    }
  });

  it('reads front columns as plan columns and right columns from the front row', () => {
    const p: Plan = [
      [1, 0],
      [0, 3],
    ];
    expect(cubeView(p, 'vorn', 3).signature).toBe('.#/.#/##');
    // From the right, the viewer's left column is the front row (height 3), the right column the back row (height 1).
    expect(cubeView(p, 'rechts', 3).signature).toBe('#./#./##');
    expect(cubeView(p, 'links', 3).signature).toBe('.#/.#/##');
    expect(cubeView(p, 'oben', 3).signature).toBe('#./.#');
  });

  it('uses the grid height for side views and the plan rows for oben', () => {
    const p: Plan = [
      [2, 1],
      [1, 1],
    ];
    expect(cubeView(p, 'vorn', 4).height).toBe(4);
    expect(cubeView(p, 'vorn', 4).cells).toHaveLength(4);
    expect(cubeView(p, 'oben', 4).height).toBe(2);
  });
});

describe('signature and viewsEqual (research R7)', () => {
  it('writes filled squares as # and rows from the top', () => {
    expect(
      signature([
        [true, false],
        [true, true],
      ]),
    ).toBe('#./##');
  });

  it('treats views from different sides with the same grid as equal', () => {
    const p: Plan = [
      [1, 1],
      [1, 1],
    ];
    expect(viewsEqual(cubeView(p, 'vorn', 3), cubeView(p, 'rechts', 3))).toBe(true);
    expect(viewsEqual(cubeView(p, 'vorn', 3), cubeView(p, 'oben', 3))).toBe(false);
  });
});
