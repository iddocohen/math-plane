import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { defaultSettings } from '../settings/defaults';
import { FLAT_SHAPES, SOLIDS, type Level, type TaskKind } from '../types';
import { PIECE_COLORS } from './colors';
import { generateTask, MAX_TURN, RECT_ASPECT } from './generate';
import type { FormenTask, KoerperTask } from './types';

const SEEDS = Array.from({ length: 500 }, (_, i) => i + 1);

function make(kind: TaskKind, level: Level, seed: number) {
  return generateTask({ content: { kind, level }, settings: defaultSettings(), rng: createRng(seed), id: `t-${seed}`, seed });
}

describe('generateTask "Körper finden"', () => {
  it('shows 4 different solids in 4 different colors with exactly one answer, over 500 seeds', () => {
    for (const seed of SEEDS) {
      const task = make('koerper', 1, seed) as KoerperTask;
      expect(task.kind).toBe('koerper');
      expect(task.choices).toHaveLength(4);
      expect(new Set(task.choices).size).toBe(4);
      for (const c of task.choices) expect(SOLIDS).toContain(c);
      expect(new Set(task.colors).size).toBe(4);
      for (const c of task.colors) expect(PIECE_COLORS).toContain(c);
      expect(task.rightIndexes).toHaveLength(1);
      expect(task.choices.filter((c) => c === task.target)).toHaveLength(1);
      expect(task.choices[task.rightIndexes[0]!]).toBe(task.target);
    }
  });

  it('asks for every solid across seeds and is the same for the same seed', () => {
    const targets = new Set(SEEDS.map((s) => (make('koerper', 1, s) as KoerperTask).target));
    expect([...targets].sort()).toEqual([...SOLIDS].sort());
    expect(make('koerper', 1, 42)).toEqual(make('koerper', 1, 42));
  });

  it('carries the identity of the request', () => {
    const task = make('koerper', 1, 7);
    expect(task).toMatchObject({ id: 't-7', seed: 7, mode: 'treffer', level: 1 });
  });
});

describe('generateTask "Formen finden"', () => {
  it('shows each flat shape once in different colors with exactly one answer, over 500 seeds', () => {
    for (const seed of SEEDS) {
      const task = make('formen', 2, seed) as FormenTask;
      expect(task.kind).toBe('formen');
      expect([...task.choices].sort()).toEqual([...FLAT_SHAPES].sort());
      expect(new Set(task.colors).size).toBe(4);
      expect(task.rightIndexes).toHaveLength(1);
      expect(task.choices[task.rightIndexes[0]!]).toBe(task.target);
    }
  });

  it('draws the Rechteck 1.6 to 2.2 times as long as wide; the others vary in size and turn up to 20 degrees (FR-024c)', () => {
    const turns: number[] = [];
    const scales: number[] = [];
    for (const seed of SEEDS) {
      const task = make('formen', 2, seed) as FormenTask;
      task.choices.forEach((shape, i) => {
        const look = task.looks[i]!;
        if (shape === 'rechteck') {
          expect(look.aspect).toBeGreaterThanOrEqual(RECT_ASPECT.min);
          expect(look.aspect).toBeLessThanOrEqual(RECT_ASPECT.max);
        } else {
          expect(look.aspect).toBe(1);
          expect(Math.abs(look.turn)).toBeLessThanOrEqual(MAX_TURN);
          turns.push(look.turn);
          scales.push(look.scale);
        }
      });
    }
    expect(Math.max(...turns) - Math.min(...turns)).toBeGreaterThan(30);
    expect(Math.max(...scales) - Math.min(...scales)).toBeGreaterThan(0.2);
  });
});
