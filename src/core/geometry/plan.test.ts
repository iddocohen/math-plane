import { describe, expect, it, vi } from 'vitest';
import { createRng, type Rng } from '../rng';
import {
  changeOne,
  FALLBACK_PLANS,
  generateCubePlan,
  isReadable,
  meetsRules,
  mirrorFB,
  mirrorLR,
  plansEqual,
  rotate90,
  type Plan,
  type PlanLimits,
} from './plan';

/** An rng that always gives the same numbers, so every random try fails and the built-in list is used. */
const stuckRng = (pickIndex = 0): Rng => ({
  next: () => 0,
  int: (min) => min,
  pick: (items) => items[Math.min(pickIndex, items.length - 1)]!,
  shuffled: (items) => [...items],
  normal: (mean) => mean,
});

const P: Plan = [
  [3, 2, 1],
  [2, 1, 0],
  [1, 0, 0],
];

describe('mirrorLR, mirrorFB, rotate90 (research R5)', () => {
  it('mirrorLR swaps left and right', () => {
    expect(mirrorLR(P)).toEqual([
      [1, 2, 3],
      [0, 1, 2],
      [0, 0, 1],
    ]);
  });

  it('mirrorFB swaps front and back', () => {
    expect(mirrorFB(P)).toEqual([
      [1, 0, 0],
      [2, 1, 0],
      [3, 2, 1],
    ]);
  });

  it('rotate90 turns clockwise seen from above: the back row becomes the right column', () => {
    const p: Plan = [
      [1, 2],
      [3, 4],
    ];
    expect(rotate90(p)).toEqual([
      [3, 1],
      [4, 2],
    ]);
    expect(rotate90(rotate90(rotate90(rotate90(P))))).toEqual(P);
  });

  it('never changes the plan it is given', () => {
    const before = JSON.stringify(P);
    mirrorLR(P);
    mirrorFB(P);
    rotate90(P);
    changeOne(P, 0, 0, 1);
    expect(JSON.stringify(P)).toBe(before);
  });

  it('mirroring twice gives the plan back', () => {
    expect(mirrorLR(mirrorLR(P))).toEqual(P);
    expect(mirrorFB(mirrorFB(P))).toEqual(P);
  });
});

describe('plansEqual', () => {
  it('compares every square and the size', () => {
    expect(plansEqual(P, P.map((r) => [...r]))).toBe(true);
    expect(plansEqual(P, mirrorLR(P))).toBe(false);
    expect(plansEqual([[1, 1], [1, 1]], [[1, 1, 0], [1, 1, 0]])).toBe(false);
    expect(plansEqual([[1, 1], [1, 1]], [[1, 1], [1, 1], [0, 0]])).toBe(false);
  });
});

describe('changeOne', () => {
  it('changes one stack by the given amount', () => {
    expect(changeOne(P, 1, 2, 1)).toEqual([
      [3, 2, 1],
      [2, 1, 1],
      [1, 0, 0],
    ]);
    expect(changeOne(P, 0, 0, -1)![0]![0]).toBe(2);
  });

  it('gives null below 0 or above 4, and throws for a square outside the plan', () => {
    expect(changeOne(P, 2, 2, -1)).toBeNull();
    expect(changeOne([[4]], 0, 0, 1)).toBeNull();
    expect(() => changeOne(P, 3, 0, 1)).toThrow(RangeError);
  });
});

describe('isReadable (research R4, critique E1)', () => {
  it('rejects [[1,3],[3,1]]: the back stack hides behind its two front neighbors', () => {
    expect(isReadable([[1, 3], [3, 1]])).toBe(false);
  });

  it('rejects a plan that breaks the prototype rule h[r][c] >= h[r+1][c+1]', () => {
    expect(isReadable([[1, 1], [1, 2]])).toBe(false);
  });

  it('accepts stairs, flat buildings and stacks that rise toward the back', () => {
    expect(isReadable(P)).toBe(true);
    expect(isReadable([[1, 1], [1, 1]])).toBe(true);
    expect(isReadable([[2, 2], [2, 2]])).toBe(true);
    expect(isReadable([[3, 1], [1, 1]])).toBe(true);
  });

  it('rejects a low back stack behind two taller neighbors on a 3×3 plan', () => {
    expect(isReadable([[0, 0, 0], [0, 1, 3], [0, 3, 1]])).toBe(false);
  });

  it('ignores empty squares', () => {
    expect(isReadable([[0, 0], [0, 0]])).toBe(true);
    expect(isReadable([[2, 0], [0, 0]])).toBe(true);
  });
});

const LIMITS: PlanLimits[] = [
  { size: 2, minStack: 1, maxStack: 2 },
  { size: 2, minStack: 1, maxStack: 3 },
  { size: 2, minStack: 1, maxStack: 4 },
  { size: 3, minStack: 0, maxStack: 2 },
  { size: 3, minStack: 0, maxStack: 3 },
  { size: 3, minStack: 0, maxStack: 4 },
];

/** An Rng whose every number is the lowest: every random plan is flat, so generation falls back to the list. */
function lowestRng(): Rng {
  return {
    next: () => 0,
    int: (min) => min,
    pick: (items) => items[0]!,
    shuffled: (items) => [...items],
    normal: (mean) => mean,
  };
}

describe('FALLBACK_PLANS', () => {
  it('holds only plans that meet every rule for their size', () => {
    for (const size of [2, 3] as const) {
      for (const p of FALLBACK_PLANS[size]) expect(meetsRules(p, { size, minStack: 0, maxStack: 4 }), JSON.stringify(p)).toBe(true);
    }
  });

  it('has a plan for every size and stack limit', () => {
    for (const limits of LIMITS) expect(FALLBACK_PLANS[limits.size].some((p) => meetsRules(p, limits)), JSON.stringify(limits)).toBe(true);
  });
});

describe('generateCubePlan (research R4, critique E7)', () => {
  for (const limits of LIMITS) {
    it(`gives a readable plan within ${JSON.stringify(limits)} for 500 seeds`, () => {
      for (let seed = 1; seed <= 500; seed++) {
        const p = generateCubePlan(createRng(seed), limits);
        expect(p).toHaveLength(limits.size);
        expect(isReadable(p), `seed ${seed}: ${JSON.stringify(p)}`).toBe(true);
        expect(meetsRules(p, limits), `seed ${seed}: ${JSON.stringify(p)}`).toBe(true);
      }
    });
  }

  it('warns when it uses a built-in plan', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const limits: PlanLimits = { size: 3, minStack: 0, maxStack: 3 };
      const p = generateCubePlan(stuckRng(), limits);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('generateCubePlan: using a built-in plan'));
      expect(meetsRules(p, limits)).toBe(true);
    } finally {
      warn.mockRestore();
    }
  });

  it('gives the same plan for the same seed', () => {
    const limits = LIMITS[4]!;
    expect(generateCubePlan(createRng(7), limits)).toEqual(generateCubePlan(createRng(7), limits));
  });

  it('gives varied plans, not only the built-in list', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 100; seed++) seen.add(JSON.stringify(generateCubePlan(createRng(seed), LIMITS[4]!)));
    expect(seen.size).toBeGreaterThan(FALLBACK_PLANS[3].length);
  });

  it('takes a plan from the built-in list when 200 tries find none, and a copy of it', () => {
    for (const limits of LIMITS) {
      const p = generateCubePlan(lowestRng(), limits);
      expect(FALLBACK_PLANS[limits.size].some((f) => plansEqual(f, p))).toBe(true);
      expect(meetsRules(p, limits)).toBe(true);
      p[0]![0] = 0;
      expect(FALLBACK_PLANS[limits.size].every((f) => f[0]![0] !== 0)).toBe(true);
    }
  });
});
