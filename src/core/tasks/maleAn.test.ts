// T051: "Male an" generation (mixed building, side, palette) and the region check (FR-023, FR-025 to FR-027, R8).
import { describe, expect, it } from 'vitest';
import { hitTest, mixedProblem, mixedView } from '../geometry/mixed';
import { createRng } from '../rng';
import { defaultSettings } from '../settings/defaults';
import type { Settings } from '../settings/schema';
import type { Side } from '../types';
import { PIECE_COLORS } from './colors';
import { generateTask } from './generate';
import { capContent, levelDef } from './levels';
import { checkRegions, generateMaleAn, paletteOf, regionPoint, regionsOf } from './maleAn';
import type { MaleAnTask } from './types';

function maleAnAt(seed: number, settings: Settings = defaultSettings()): MaleAnTask {
  const def = levelDef('bauenMalen', 5).contents.find((c) => c.kind === 'maleAn')!;
  const task = generateTask({ content: capContent(def, 5, settings), settings, rng: createRng(seed), id: `t-${seed}`, seed });
  if (task.kind !== 'maleAn') throw new Error('not a maleAn task');
  return task;
}

describe('generateMaleAn (FR-023, FR-025, research R6, R8)', () => {
  it('makes a mixed building seen from one of four sides, with the building\'s colors as palette, over 300 seeds', () => {
    const sides = new Set<Side>();
    let round = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const task = maleAnAt(seed);
      expect(task.mode).toBe('bauenMalen');
      expect(task.level).toBe(5);
      sides.add(task.side);
      expect(mixedProblem(task.building, [task.side])).toBeNull();
      expect(task.view).toEqual(mixedView(task.building, task.side));
      // Each piece has its own color, and the palette holds exactly those colors in the fixed order.
      const colors = task.building.pieces.map((p) => p.color);
      expect(new Set(colors).size).toBe(colors.length);
      expect(task.palette).toEqual(PIECE_COLORS.filter((c) => colors.includes(c)));
      expect(task.palette.length).toBeGreaterThanOrEqual(2);
      // Every piece shows a region that a tap can reach.
      expect(regionsOf(task.view).sort()).toEqual(task.building.pieces.map((_, i) => i));
      for (const i of regionsOf(task.view)) {
        const p = regionPoint(task.view, i)!;
        expect(hitTest(task.view, p.x, p.y)).toBe(i);
      }
      if (task.building.pieces.some((p) => p.kind !== 'box')) round += 1;
    }
    expect([...sides].sort()).toEqual(['links', 'oben', 'rechts', 'vorn']);
    expect(round).toBe(300);
  });

  it('uses boxes only when the parent turned cylinders and spheres off', () => {
    const s = defaultSettings();
    s.buildings.mixedPieces = false;
    for (let seed = 1; seed <= 100; seed++) {
      const task = maleAnAt(seed, s);
      for (const p of task.building.pieces) expect(p.kind).toBe('box');
    }
  });

  it('keeps to the parent\'s sides, largest plan and highest stack', () => {
    const s = defaultSettings();
    s.buildings.sides = { vorn: false, oben: true, rechts: false, links: false };
    s.buildings.maxPlan = 2;
    s.buildings.maxStack = 2;
    for (let seed = 1; seed <= 100; seed++) {
      const task = maleAnAt(seed, s);
      expect(task.side).toBe('oben');
      expect(task.building.cols).toBe(2);
      for (const p of task.building.pieces) expect(p.z + p.h).toBeLessThanOrEqual(2);
    }
  });

  it('the same seed makes the same task', () => {
    const make = () => generateMaleAn(createRng(31), { id: 'a', seed: 31, level: 5 }, ['vorn', 'rechts'], true);
    expect(make()).toEqual(make());
  });
});

describe('paletteOf', () => {
  it('lists the building\'s colors in the order of PIECE_COLORS', () => {
    const task = maleAnAt(7);
    const reversed = { ...task.building, pieces: [...task.building.pieces].reverse() };
    expect(paletteOf(reversed)).toEqual(paletteOf(task.building));
  });
});

describe('checkRegions (FR-023, research R8)', () => {
  const task = maleAnAt(11);
  const right = task.building.pieces.map((p) => p.color);

  it('is right when every region has its piece\'s color', () => {
    expect(checkRegions(task, right)).toEqual([]);
  });

  it('marks only the region with a wrong color (acceptance 8)', () => {
    const colors = [...right];
    colors[1] = task.palette.find((c) => c !== right[1])!;
    expect(checkRegions(task, colors)).toEqual([1]);
  });

  it('marks empty regions', () => {
    expect(checkRegions(task, right.map(() => null))).toEqual(right.map((_, i) => i));
  });
});
