import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import {
  generateCubePlan,
  hasVariants,
  isUniform,
  mirrorFB,
  mirrorLR,
  planCandidates,
  plansEqual,
  planVariants,
  rotate90,
  type Plan,
  type PlanLimits,
} from './plan';

const SMALL: PlanLimits = { size: 2, minStack: 1, maxStack: 3 };
const SEEDS = Array.from({ length: 500 }, (_, i) => i + 1);

/** True when `v` is `p` mirrored, turned, or with exactly one stack changed by 1. */
function isCloseVariant(p: Plan, v: Plan): boolean {
  const turns = [rotate90(p), rotate90(rotate90(p)), rotate90(rotate90(rotate90(p)))];
  if ([mirrorLR(p), mirrorFB(p), ...turns].some((s) => plansEqual(s, v))) return true;
  const diffs = p.flat().map((h, i) => v.flat()[i]! - h).filter((d) => d !== 0);
  return diffs.length === 1 && Math.abs(diffs[0]!) === 1;
}

describe('planCandidates', () => {
  it('lists mirrors, turns and one-stack changes, each once and none equal to the plan', () => {
    const p: Plan = [
      [3, 2],
      [2, 1],
    ];
    const all = planCandidates(p, SMALL);
    expect(all.some((v) => v.kind === 'structural')).toBe(true);
    expect(all.some((v) => v.kind === 'stack')).toBe(true);
    for (const v of all) {
      expect(plansEqual(v.plan, p)).toBe(false);
      expect(isCloseVariant(p, v.plan)).toBe(true);
      expect(all.filter((w) => plansEqual(w.plan, v.plan))).toHaveLength(1);
    }
  });

  it('never changes a stack to 0 on a 2×2 plan or above the highest stack', () => {
    const p: Plan = [
      [3, 1],
      [1, 1],
    ];
    for (const v of planCandidates(p, SMALL)) for (const h of v.plan.flat()) expect(h >= 1 && h <= 3).toBe(true);
  });

  it('allows a stack of 0 on a 3×3 plan when the limits do', () => {
    const p: Plan = [
      [3, 2, 1],
      [2, 1, 1],
      [1, 1, 1],
    ];
    const all = planCandidates(p, { size: 3, minStack: 0, maxStack: 3 });
    expect(all.some((v) => v.plan.flat().includes(0))).toBe(true);
  });
});

describe('hasVariants', () => {
  it('rejects plans with every stack equal (critique P2)', () => {
    expect(isUniform([[2, 2], [2, 2]])).toBe(true);
    expect(hasVariants([[2, 2], [2, 2]], SMALL)).toBe(false);
    expect(hasVariants([[3, 2], [2, 1]], SMALL)).toBe(true);
  });

  it('rejects plans with fewer than 2 variants', () => {
    // Highest stack 1 and no 0 on 2×2: no stack can change and the plan is uniform.
    expect(hasVariants([[1, 1], [1, 1]], { size: 2, minStack: 1, maxStack: 1 })).toBe(false);
  });
});

describe('planVariants', () => {
  it('gives 2 close variants that differ from the plan and each other, over 500 seeds', () => {
    let structural = 0;
    let stack = 0;
    for (const seed of SEEDS) {
      const rng = createRng(seed);
      const p = generateCubePlan(rng, SMALL);
      if (!hasVariants(p, SMALL)) continue;
      const vs = planVariants(p, rng, SMALL, 2);
      expect(vs).toHaveLength(2);
      for (const v of vs) {
        expect(plansEqual(v, p)).toBe(false);
        expect(isCloseVariant(p, v)).toBe(true);
        expect(v.flat().every((h) => h >= 1 && h <= 3)).toBe(true);
      }
      expect(plansEqual(vs[0]!, vs[1]!)).toBe(false);
      const turns = [mirrorLR(p), mirrorFB(p), rotate90(p), rotate90(rotate90(p)), rotate90(rotate90(rotate90(p)))];
      for (const v of vs) {
        if (turns.some((t) => plansEqual(t, v))) structural += 1;
        else stack += 1;
      }
    }
    // Both kinds of variant show up often.
    expect(structural).toBeGreaterThan(300);
    expect(stack).toBeGreaterThan(300);
  });

  it('makes the same variants for the same seed', () => {
    const p: Plan = [
      [3, 2],
      [2, 1],
    ];
    expect(planVariants(p, createRng(5), SMALL, 2)).toEqual(planVariants(p, createRng(5), SMALL, 2));
  });
});
