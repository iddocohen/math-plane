import { describe, expect, it } from 'vitest';
import { bombAt, FALL_MS } from './bombPath';
import { aimPoint, slotPoint } from './slots';

describe('slotPoint', () => {
  it('spaces 4 slots from x 300 to 1300, every other one nearer (contracts/screens.md)', () => {
    const points = [0, 1, 2, 3].map((s) => slotPoint(4, s));
    expect(points.map((p) => Math.round(p.x))).toEqual([300, 633, 967, 1300]);
    expect(points.map((p) => p.y)).toEqual([640, 760, 640, 760]);
  });

  it('puts the middle one of 3 slots nearer', () => {
    expect([0, 1, 2].map((s) => slotPoint(3, s))).toEqual([
      { x: 300, y: 640 },
      { x: 800, y: 760 },
      { x: 1300, y: 640 },
    ]);
  });
});

describe('aimPoint', () => {
  it('aims at the middle of a solid, above its ground, and at the middle of a flat shape', () => {
    expect(aimPoint('koerper', 4, 1)).toEqual({ x: slotPoint(4, 1).x, y: 760 - 42 });
    expect(aimPoint('formen', 4, 2)).toEqual(slotPoint(4, 2));
  });
});

describe('bombAt', () => {
  const from = { x: 100, y: 150 };
  const to = { x: 320, y: 700 };

  it('starts at the bomb bay and ends exactly at the target after FALL_MS (research R9)', () => {
    expect(bombAt(from, to, 0)).toMatchObject({ x: 100, y: 150, done: false });
    expect(bombAt(from, to, FALL_MS)).toMatchObject({ x: 320, y: 700, done: true });
    expect(bombAt(from, to, FALL_MS * 3)).toMatchObject({ x: 320, y: 700, done: true });
  });

  it('falls faster and faster: a quarter of the drop at half time', () => {
    const half = bombAt(from, to, FALL_MS / 2);
    expect(half.x).toBeCloseTo(210);
    expect(half.y).toBeCloseTo(150 + 550 / 4);
  });
});
