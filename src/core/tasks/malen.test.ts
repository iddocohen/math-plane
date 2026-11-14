// T050: "Malen" generation within the level, the parent's sides and limits, and the paint check (FR-022, FR-024).
import { describe, expect, it } from 'vitest';
import { isReadable } from '../geometry/plan';
import { cubeView } from '../geometry/views';
import { createRng } from '../rng';
import { defaultSettings } from '../settings/defaults';
import type { Settings } from '../settings/schema';
import type { Side } from '../types';
import { generateTask } from './generate';
import { capContent, levelDef } from './levels';
import { checkPaint, emptyPaint, generateMalen, worthPainting } from './malen';
import type { MalenTask } from './types';

function malenAt(level: 3 | 4 | 5, seed: number, settings: Settings = defaultSettings()): MalenTask {
  const def = levelDef('bauenMalen', level).contents.find((c) => c.kind === 'malen')!;
  const task = generateTask({ content: capContent(def, level, settings), settings, rng: createRng(seed), id: `t-${seed}`, seed });
  if (task.kind !== 'malen') throw new Error('not a malen task');
  return task;
}

/** Every rule a "Malen" task keeps (FR-024, research R4). */
function expectGood(task: MalenTask, gridHeight: number): void {
  expect(task.mode).toBe('bauenMalen');
  expect(isReadable(task.building)).toBe(true);
  expect(task.expected).toEqual(cubeView(task.building, task.side, gridHeight));
  const all = task.expected.cells.flat();
  expect(all).toContain(true);
  expect(all).toContain(false);
  const cols = task.expected.cells[0]!.length;
  const columns = new Set(Array.from({ length: cols }, (_, c) => task.expected.cells.map((row) => row[c]).join()));
  expect(columns.size).toBeGreaterThanOrEqual(2);
  expect(task.color).toMatch(/^#[0-9a-f]{6}$/i);
}

describe('generateMalen (FR-022, FR-024)', () => {
  it('level 3 asks for vorn and oben only; every view is worth painting over 500 seeds', () => {
    const seen = new Set<Side>();
    for (let seed = 1; seed <= 500; seed++) {
      const task = malenAt(3, seed);
      expect(['vorn', 'oben']).toContain(task.side);
      expect(task.level).toBe(3);
      expect(task.building).toHaveLength(3);
      expectGood(task, 3);
      seen.add(task.side);
    }
    expect([...seen].sort()).toEqual(['oben', 'vorn']);
  });

  it('level 4 asks for all four sides; every view is worth painting over 500 seeds', () => {
    const seen = new Set<Side>();
    for (let seed = 1; seed <= 500; seed++) {
      const task = malenAt(4, seed);
      expectGood(task, 3);
      expect(task.expected.cells).toHaveLength(3);
      seen.add(task.side);
    }
    expect([...seen].sort()).toEqual(['links', 'oben', 'rechts', 'vorn']);
  });

  it('keeps to the sides the parent left on', () => {
    const s = defaultSettings();
    s.buildings.sides = { vorn: false, oben: false, rechts: true, links: false };
    for (let seed = 1; seed <= 100; seed++) expect(malenAt(4, seed, s).side).toBe('rechts');
  });

  it('side views are as high as the parent\'s highest stack', () => {
    const s = defaultSettings();
    s.buildings.maxStack = 4;
    s.buildings.sides = { vorn: true, oben: false, rechts: true, links: true };
    for (let seed = 1; seed <= 100; seed++) {
      const task = malenAt(4, seed, s);
      expect(task.expected.cells).toHaveLength(4);
      expectGood(task, 4);
    }
    s.buildings.maxStack = 2;
    for (let seed = 1; seed <= 100; seed++) {
      const task = malenAt(4, seed, s);
      expect(task.expected.cells).toHaveLength(2);
      for (const h of task.building.flat()) expect(h).toBeLessThanOrEqual(2);
      expectGood(task, 2);
    }
  });

  it('a 2×2 plan never asks for the view from above, which would be all filled', () => {
    const s = defaultSettings();
    s.buildings.maxPlan = 2;
    for (let seed = 1; seed <= 100; seed++) {
      const task = malenAt(3, seed, s);
      expect(task.building).toHaveLength(2);
      expect(task.side).toBe('vorn');
      expectGood(task, 3);
    }
  });

  it('the same seed makes the same task', () => {
    const make = () => generateMalen(createRng(77), { id: 'a', seed: 77, level: 4 }, ['vorn', 'rechts']);
    expect(make()).toEqual(make());
  });
});

describe('worthPainting', () => {
  it('rejects views that are all filled, empty, or have equal columns', () => {
    expect(worthPainting(cubeView([[1, 1], [1, 1]], 'oben', 3))).toBe(false);
    expect(worthPainting(cubeView([[2, 2], [1, 1]], 'vorn', 3))).toBe(false);
    expect(worthPainting(cubeView([[3, 3], [3, 3]], 'vorn', 3))).toBe(false);
    expect(worthPainting(cubeView([[3, 2], [1, 1]], 'vorn', 3))).toBe(true);
  });
});

describe('checkPaint (FR-009, FR-022)', () => {
  const view = cubeView([[2, 1], [1, 0]], 'vorn', 3);

  it('is right when every square matches', () => {
    expect(checkPaint(view, view.cells.map((r) => [...r]))).toEqual([]);
  });

  it('marks an extra and a missing square, and nothing else (acceptance 4)', () => {
    const paint = view.cells.map((r) => [...r]);
    paint[0]![0] = true; // extra
    paint[2]![1] = false; // missing
    expect(checkPaint(view, paint)).toEqual(['0,0', '2,1']);
  });

  it('marks every filled square of an empty grid', () => {
    expect(checkPaint(view, emptyPaint(view))).toEqual(['1,0', '2,0', '2,1']);
  });
});
