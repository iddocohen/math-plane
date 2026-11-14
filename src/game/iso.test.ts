import { describe, expect, it } from 'vitest';
import { isoPoint } from '../core/geometry/iso';
import { buildingProjector, drawBuilding, isoEllipse, isoProjector, redrawGate } from './iso';

/** A stand-in 2D context that records every call by name, with the fill style at each `fill`. */
function recordingContext() {
  const calls: Array<{ name: string; args: unknown[]; fillStyle?: unknown }> = [];
  const state: Record<string, unknown> = {};
  const gradient = { addColorStop: () => {} };
  const ctx = new Proxy(state, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => gradient;
      return (...args: unknown[]) => calls.push({ name: prop, args, fillStyle: target.fillStyle });
    },
    set(target, prop: string, value) {
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

describe('isoProjector', () => {
  it('is the core projection moved to an origin', () => {
    const P = isoProjector(100, 50, 30);
    for (const [c, r, z] of [
      [0, 0, 0],
      [1, 2, 3],
      [2, 0, 1],
    ] as const) {
      const p = isoPoint(c, r, z, 30);
      expect(P(c, r, z)).toEqual([100 + p.x, 50 + p.y]);
    }
  });

  it('a building projector puts the middle of the ground at the given point', () => {
    for (const [rows, cols] of [
      [2, 2],
      [3, 3],
      [2, 3],
    ] as const) {
      const P = buildingProjector(rows, cols, 560, 640, 40);
      const [x, y] = P(cols / 2, rows / 2, 0);
      expect(x).toBeCloseTo(560);
      expect(y).toBeCloseTo(640);
    }
  });

  it('a circle on the ground becomes an ellipse half as high as it is wide', () => {
    const { rx, ry } = isoEllipse(1, 40);
    expect(ry).toBeCloseTo(rx / 2);
    // The ellipse touches the left and right corners of the footprint's diamond only at its widest.
    expect(rx).toBeLessThan(40);
  });
});

describe('drawBuilding', () => {
  it('draws three faces per cube', () => {
    const { ctx, calls } = recordingContext();
    drawBuilding(ctx, [
      [1, 2],
      [0, 3],
    ], 0, 0, 30, '#e0413a');
    // One shadow ellipse fill, then 6 cubes with 3 faces each.
    expect(calls.filter((c) => c.name === 'fill')).toHaveLength(1 + 6 * 3);
  });

  it('marks a square with a dashed outline and a "?" badge', () => {
    const { ctx, calls } = recordingContext();
    drawBuilding(ctx, [[1, 1]], 0, 0, 30, '#e0413a', { tiles: true, marked: new Set(['0,1']) });
    expect(calls.some((c) => c.name === 'setLineDash')).toBe(true);
    expect(calls.filter((c) => c.name === 'fillText').map((c) => c.args[0])).toEqual(['?']);
  });
});

describe('redrawGate (R19)', () => {
  it('asks for a redraw only when the signature changes', () => {
    const changed = redrawGate();
    expect(changed('a')).toBe(true);
    expect(changed('a')).toBe(false);
    expect(changed('b')).toBe(true);
    expect(changed('b')).toBe(false);
  });
});
