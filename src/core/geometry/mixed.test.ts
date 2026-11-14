import { describe, expect, it, vi } from 'vitest';
import { createRng, type Rng } from '../rng';
import { SIDES } from '../types';
import {
  FALLBACK_MIXED,
  generateMixed,
  hitTest,
  mirrorMixedView,
  mixedProblem,
  mixedView,
  visibleShares,
  withoutPiece,
  type MixedBuilding,
  type MixedLimits,
  type Piece,
} from './mixed';

const ALL: MixedLimits = { size: 3, maxStack: 3, sides: SIDES, mixed: true };
const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);

/** An rng that always gives the same numbers, so every random try fails and the built-in list is used. */
const stuckRng = (pickIndex = 0): Rng => ({
  next: () => 0,
  int: (min) => min,
  pick: (items) => items[Math.min(pickIndex, items.length - 1)]!,
  shuffled: (items) => [...items],
  normal: (mean) => mean,
});

const piece = (p: Partial<Piece> & Pick<Piece, 'kind'>): Piece => ({ col: 0, row: 0, z: 0, w: 1, d: 1, h: 1, color: '#e0413a', ...p });
const building = (pieces: Piece[], n = 3, height = 3): MixedBuilding => ({ pieces, cols: n, rows: n, height });

describe('mixedView', () => {
  // A box at the back left, 2 wide and 2 high, and a ball in front on the right.
  const b = building([piece({ kind: 'box', col: 0, row: 0, w: 2, d: 1, h: 2 }), piece({ kind: 'sphere', col: 2, row: 2, size: 1 })]);

  it('maps each side as cube views do (research R3)', () => {
    const vorn = mixedView(b, 'vorn');
    expect(vorn.outlines.find((o) => o.pieceIndex === 0)).toMatchObject({ shape: 'rect', x: 0, y: 0, w: 2, h: 2 });
    expect(vorn.outlines.find((o) => o.pieceIndex === 1)).toMatchObject({ shape: 'circle', x: 2, y: 0, w: 1, h: 1 });
    // rechts: the front is on the viewer's left, so the ball (front row) is at x 0 and the box (back row) at x 2.
    const rechts = mixedView(b, 'rechts');
    expect(rechts.outlines.find((o) => o.pieceIndex === 1)).toMatchObject({ x: 0 });
    expect(rechts.outlines.find((o) => o.pieceIndex === 0)).toMatchObject({ x: 2, w: 1, h: 2 });
    // links: the back is on the viewer's left.
    const links = mixedView(b, 'links');
    expect(links.outlines.find((o) => o.pieceIndex === 0)).toMatchObject({ x: 0 });
    expect(links.outlines.find((o) => o.pieceIndex === 1)).toMatchObject({ x: 2 });
    // oben: "vorn" at the bottom, so the back row is at the top.
    const oben = mixedView(b, 'oben');
    expect(oben.outlines.find((o) => o.pieceIndex === 0)).toMatchObject({ x: 0, y: 2, w: 2, h: 1 });
    expect(oben.outlines.find((o) => o.pieceIndex === 1)).toMatchObject({ shape: 'circle', x: 2, y: 0 });
    expect(oben.height).toBe(3);
    expect(vorn.height).toBe(3);
  });

  it('shows a cylinder as a rectangle from the side and a circle from above (FR-026)', () => {
    const can = building([piece({ kind: 'cylinder', size: 1, h: 2 }), piece({ kind: 'box', col: 2 })]);
    for (const side of ['vorn', 'rechts', 'links'] as const) expect(mixedView(can, side).outlines.find((o) => o.pieceIndex === 0)!.shape).toBe('rect');
    expect(mixedView(can, 'oben').outlines.find((o) => o.pieceIndex === 0)!.shape).toBe('circle');
  });

  it('sorts outlines back to front and hit-tests front to back', () => {
    // A low box in front of a tall box in the same column.
    const two = building([piece({ kind: 'box', row: 2, h: 1 }), piece({ kind: 'box', row: 0, h: 2 })]);
    const vorn = mixedView(two, 'vorn');
    expect(vorn.outlines.map((o) => o.pieceIndex)).toEqual([1, 0]);
    expect(hitTest(vorn, 0.5, 0.5)).toBe(0);
    expect(hitTest(vorn, 0.5, 1.5)).toBe(1);
    expect(hitTest(vorn, 2.5, 0.5)).toBeNull();
    // From links the two boxes stand side by side: the front one on the viewer's right.
    expect(hitTest(mixedView(two, 'links'), 2.5, 0.5)).toBe(0);
    // From above they do not overlap; the front box is at the bottom.
    expect(hitTest(mixedView(two, 'oben'), 0.5, 0.5)).toBe(0);
  });

  it('a stacked piece covers the box under it from above', () => {
    const stack = building([piece({ kind: 'box', w: 2 }), piece({ kind: 'sphere', z: 1, size: 1 })]);
    const oben = mixedView(stack, 'oben');
    expect(oben.outlines.map((o) => o.pieceIndex)).toEqual([0, 1]);
    expect(hitTest(oben, 0.5, 2.5)).toBe(1);
    expect(hitTest(oben, 1.5, 2.5)).toBe(0);
  });
});

describe('signatures', () => {
  it('are equal for the same picture from different pieces and differ for a mirror', () => {
    const left = building([piece({ kind: 'box', w: 2, h: 2 }), piece({ kind: 'sphere', col: 2, size: 1 })]);
    const v = mixedView(left, 'vorn');
    expect(mirrorMixedView(mirrorMixedView(v)).signature).toBe(v.signature);
    expect(mirrorMixedView(v).signature).not.toBe(v.signature);
    expect(withoutPiece(v, 1).signature).not.toBe(v.signature);
    // The same box one row further back looks the same from the front.
    const back = building([piece({ kind: 'box', row: 1, w: 2, h: 2 }), piece({ kind: 'sphere', col: 2, size: 1 })]);
    expect(mixedView(back, 'vorn').signature).toBe(v.signature);
  });

  it('tell one long box from two short ones side by side', () => {
    const one = building([piece({ kind: 'box', w: 2 }), piece({ kind: 'sphere', col: 2, row: 2, size: 1 })]);
    const two = building([piece({ kind: 'box' }), piece({ kind: 'box', col: 1 }), piece({ kind: 'sphere', col: 2, row: 2, size: 1 })]);
    expect(mixedView(one, 'vorn').signature).not.toBe(mixedView(two, 'vorn').signature);
  });
});

describe('mixedProblem', () => {
  it('finds overlaps, floating pieces and hidden pieces', () => {
    expect(mixedProblem(building([piece({ kind: 'box', w: 2 }), piece({ kind: 'box', col: 1 })]), SIDES)).toBe('pieces overlap');
    expect(mixedProblem(building([piece({ kind: 'box' }), piece({ kind: 'sphere', col: 2, z: 1, size: 1 })]), SIDES)).toBe('piece floats');
    // A 1×1 ball on a 1×1 box hides the box from above (less than a quarter shows).
    expect(mixedProblem(building([piece({ kind: 'box' }), piece({ kind: 'sphere', z: 1, size: 1 })]), ['oben'])).toBe('a piece hides from oben');
    expect(mixedProblem(building([piece({ kind: 'box' }), piece({ kind: 'sphere', z: 1, size: 1 })]), ['vorn'])).toBeNull();
  });

  it('accepts every built-in building for all sides with side views 2 high', () => {
    for (const set of ['mixed', 'boxes'] as const) {
      for (const n of [2, 3] as const) {
        for (const shapes of FALLBACK_MIXED[set][n]) {
          const b = building(
            shapes.map((s) => ({ ...s, color: '#000000' })),
            n,
            2,
          );
          expect(mixedProblem(b, SIDES), JSON.stringify(shapes)).toBeNull();
        }
      }
    }
  });
});

describe('generateMixed', () => {
  it('keeps every rule and has a cylinder or sphere, over 300 seeds, mostly from templates', () => {
    let fallback = 0;
    const kinds = new Set<string>();
    for (const seed of SEEDS) {
      const b = generateMixed(createRng(seed), ALL);
      expect(mixedProblem(b, SIDES)).toBeNull();
      expect(b.pieces.some((p) => p.kind !== 'box')).toBe(true);
      expect(new Set(b.pieces.map((p) => p.color)).size).toBe(b.pieces.length);
      for (const p of b.pieces) kinds.add(`${p.kind}${p.size ?? ''}`);
      for (const side of SIDES) for (const s of visibleShares(mixedView(b, side), b.pieces.length)) expect(s).toBeGreaterThanOrEqual(0.25);
      if (FALLBACK_MIXED.mixed[3].some((f) => f.length === b.pieces.length && f.every((s, i) => s.col === b.pieces[i]!.col && s.row === b.pieces[i]!.row && s.kind === b.pieces[i]!.kind)))
        fallback += 1;
    }
    expect(fallback).toBeLessThan(SEEDS.length / 10);
    expect([...kinds].sort()).toEqual(['box', 'cylinder1', 'cylinder2', 'sphere1', 'sphere2']);
  });

  it('fits narrow limits: a 2×2 grid, stacks of 2, boxes only', () => {
    for (const seed of SEEDS.slice(0, 100)) {
      const small = generateMixed(createRng(seed), { size: 2, maxStack: 2, sides: SIDES, mixed: true });
      expect(mixedProblem(small, SIDES)).toBeNull();
      const boxes = generateMixed(createRng(seed), { size: 3, maxStack: 2, sides: ['oben'], mixed: false });
      expect(boxes.pieces.every((p) => p.kind === 'box')).toBe(true);
      expect(mixedProblem(boxes, ['oben'])).toBeNull();
    }
  });

  it('warns when it uses a built-in building, and that building keeps every rule for the asked sides', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const b = generateMixed(stuckRng(1), { size: 3, maxStack: 2, sides: ['oben'], mixed: true });
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('generateMixed: using a built-in building'));
      expect(mixedProblem(b, ['oben'])).toBeNull();
    } finally {
      warn.mockRestore();
    }
  });
});
