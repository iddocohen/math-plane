import { describe, expect, it } from 'vitest';
import { isoPoint } from './iso';

/** The prototype's `isoP(ox, oy, s)(a, b, c)` with the origin at 0, copied from prototype/index.html. */
function prototypeIsoP(s: number) {
  return (a: number, b: number, c: number) => [(a - b) * s, (a + b) * s * 0.5 - c * s * 1.1];
}

describe('isoPoint (research R3)', () => {
  it('puts the origin at 0, 0', () => {
    expect(isoPoint(0, 0, 0, 40)).toEqual({ x: 0, y: 0 });
  });

  it('moves a column to the lower right, a row to the lower left and a level up by 1.1 cubes', () => {
    expect(isoPoint(1, 0, 0, 10)).toEqual({ x: 10, y: 5 });
    expect(isoPoint(0, 1, 0, 10)).toEqual({ x: -10, y: 5 });
    expect(isoPoint(0, 0, 1, 10).x).toBe(0);
    expect(isoPoint(0, 0, 1, 10).y).toBeCloseTo(-11);
  });

  it('matches the prototype projection on a grid of points', () => {
    for (const s of [1, 30, 50]) {
      const P = prototypeIsoP(s);
      for (let col = 0; col <= 3; col += 0.5) {
        for (let row = 0; row <= 3; row += 0.5) {
          for (let z = 0; z <= 4; z++) {
            const p = isoPoint(col, row, z, s);
            const [x, y] = P(col, row, z);
            expect(p.x).toBeCloseTo(x!);
            expect(p.y).toBeCloseTo(y!);
          }
        }
      }
    }
  });
});
