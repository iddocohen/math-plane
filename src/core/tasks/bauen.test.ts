// T044: "Bauen" generation within the level and the parent's limits, and the plan check (FR-021, FR-024, research R4).
import { describe, expect, it } from 'vitest';
import { isReadable } from '../geometry/plan';
import { createRng } from '../rng';
import { defaultSettings } from '../settings/defaults';
import { levelDef, capContent } from './levels';
import { checkPlan, generateBauen, squareId } from './bauen';
import { generateTask } from './generate';

function bauenAt(level: 1 | 2, seed: number, settings = defaultSettings()) {
  const content = capContent(levelDef('bauenMalen', level).contents[0]!, level, settings);
  return generateTask({ content, settings, rng: createRng(seed), id: `t-${seed}`, seed });
}

describe('generateBauen (FR-021, FR-028)', () => {
  it('level 1 makes readable 2×2 buildings with stacks 1 to 3', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const task = bauenAt(1, seed);
      if (task.kind !== 'bauen') throw new Error('not a bauen task');
      expect(task.mode).toBe('bauenMalen');
      expect(task.level).toBe(1);
      expect(task.target).toHaveLength(2);
      for (const row of task.target) expect(row).toHaveLength(2);
      for (const h of task.target.flat()) expect(h >= 1 && h <= 3).toBe(true);
      expect(isReadable(task.target)).toBe(true);
      expect(task.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('level 2 makes readable 3×3 buildings with stacks 0 to 3', () => {
    let sawEmpty = false;
    for (let seed = 1; seed <= 200; seed++) {
      const task = bauenAt(2, seed);
      if (task.kind !== 'bauen') throw new Error('not a bauen task');
      expect(task.target).toHaveLength(3);
      for (const row of task.target) expect(row).toHaveLength(3);
      for (const h of task.target.flat()) expect(h >= 0 && h <= 3).toBe(true);
      expect(isReadable(task.target)).toBe(true);
      sawEmpty ||= task.target.flat().includes(0);
    }
    expect(sawEmpty).toBe(true);
  });

  it('keeps within the parent\'s largest plan and highest stack (FR-032)', () => {
    const settings = defaultSettings();
    settings.buildings.maxPlan = 2;
    settings.buildings.maxStack = 2;
    for (let seed = 1; seed <= 100; seed++) {
      const task = bauenAt(2, seed, settings);
      if (task.kind !== 'bauen') throw new Error('not a bauen task');
      expect(task.target).toHaveLength(2);
      expect(Math.max(...task.target.flat())).toBeLessThanOrEqual(2);
    }
  });

  it('makes the same task again from the same seed', () => {
    const ident = { id: 'a', seed: 5, level: 1 as const };
    expect(generateBauen(createRng(42), ident)).toEqual(generateBauen(createRng(42), ident));
  });
});

describe('checkPlan (FR-021)', () => {
  const target = [
    [3, 2, 1],
    [2, 1, 0],
    [1, 0, 0],
  ];

  it('finds nothing wrong in the right plan', () => {
    expect(checkPlan(target, target.map((row) => [...row]))).toEqual([]);
  });

  it('names only the squares that differ', () => {
    const input = target.map((row) => [...row]);
    input[1]![2] = 2;
    expect(checkPlan(target, input)).toEqual([squareId(1, 2)]);
  });

  it('counts empty squares as wrong, also where the building has no stack', () => {
    const input: (number | null)[][] = target.map((row) => [...row]);
    input[2]![2] = null;
    input[0]![0] = null;
    expect(checkPlan(target, input)).toEqual(['0,0', '2,2']);
    expect(checkPlan(target, target.map((row) => row.map(() => null)))).toHaveLength(9);
  });
});
