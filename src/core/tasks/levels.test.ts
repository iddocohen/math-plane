import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { defaultSettings } from '../settings/defaults';
import type { Settings } from '../settings/schema';
import type { TaskKind } from '../types';
import { currentLevel, levelDown, levelRange, levelUp, LEVELS, pickContent } from './levels';

function settings(change: (s: Settings) => void = () => {}): Settings {
  const s = defaultSettings();
  change(s);
  return s;
}

describe('LEVELS (FR-028)', () => {
  it('has 5 levels per mode with German names and kinds', () => {
    expect(LEVELS.treffer.map((l) => l.name)).toEqual(['Körper', 'Formen', 'Baupläne finden', 'Ansichten vorn und oben', 'Alle Seiten']);
    expect(LEVELS.bauenMalen.map((l) => l.name)).toEqual(['Kleine Baupläne', 'Große Baupläne', 'Vorn und oben', 'Rechts und links', 'Male an']);
    expect(LEVELS.treffer.map((l) => l.contents.map((c) => c.kind))).toEqual([['koerper'], ['formen'], ['bauplanFinden'], ['ansichtFinden'], ['ansichtFinden']]);
    expect(LEVELS.bauenMalen.map((l) => l.contents.map((c) => c.kind))).toEqual([['bauen'], ['bauen'], ['malen'], ['malen'], ['maleAn', 'malen']]);
  });

  it('uses 2×2 plans with stacks 1 to 3 on "Kleine Baupläne" and 3×3 with stacks 0 to 3 on "Große Baupläne"', () => {
    expect(LEVELS.bauenMalen[0]!.contents[0]!.plan).toEqual({ size: 2, minStack: 1, maxStack: 3 });
    expect(LEVELS.bauenMalen[1]!.contents[0]!.plan).toEqual({ size: 3, minStack: 0, maxStack: 3 });
    expect(LEVELS.treffer[2]!.contents[0]!.plan).toEqual({ size: 2, minStack: 1, maxStack: 3 });
  });

  it('asks vorn and oben on level 4 of "Treffer", all sides with cylinders and spheres on level 5', () => {
    expect(LEVELS.treffer[3]!.contents[0]).toMatchObject({ sides: ['vorn', 'oben'], mixed: false });
    expect(LEVELS.treffer[4]!.contents[0]).toMatchObject({ sides: ['vorn', 'oben', 'rechts', 'links'], mixed: true });
  });
});

describe('levelRange and the level helpers (FR-031)', () => {
  it('is the parent range without levels whose every kind is off', () => {
    expect(levelRange('treffer', settings())).toEqual([1, 2, 3, 4, 5]);
    expect(levelRange('treffer', settings((s) => (s.kinds.formen = false)))).toEqual([1, 3, 4, 5]);
    expect(levelRange('bauenMalen', settings((s) => (s.levels.bauenMalen = { start: 2, hardest: 4 })))).toEqual([2, 3, 4]);
  });

  it('keeps level 5 of "Bauen und Malen" while one of its two kinds is on', () => {
    expect(levelRange('bauenMalen', settings((s) => (s.kinds.maleAn = false)))).toEqual([1, 2, 3, 4, 5]);
    expect(levelRange('bauenMalen', settings((s) => (s.kinds.bauen = false)))).toEqual([3, 4, 5]);
  });

  it('falls back to the nearest offered level outside the range, and is empty when every kind is off', () => {
    const s = settings((x) => {
      x.levels.treffer = { start: 3, hardest: 5 };
      x.kinds.bauplanFinden = false;
      x.kinds.ansichtFinden = false;
    });
    expect(levelRange('treffer', s)).toEqual([2]);
    const none = settings((x) => {
      for (const k of ['koerper', 'formen', 'bauplanFinden', 'ansichtFinden'] as TaskKind[]) x.kinds[k] = false;
    });
    expect(levelRange('treffer', none)).toEqual([]);
  });

  it('clamps the stored level into the range, and uses the first level with adaptive off', () => {
    const s = settings((x) => (x.levels.treffer = { start: 2, hardest: 4 }));
    expect(currentLevel('treffer', 1, s)).toBe(2);
    expect(currentLevel('treffer', 5, s)).toBe(4);
    expect(currentLevel('treffer', 3, s)).toBe(3);
    expect(currentLevel('treffer', 3, { ...s, adaptive: false })).toBe(2);
  });

  it('moves up and down over skipped levels and stops at the ends', () => {
    const s = settings((x) => (x.kinds.formen = false));
    expect(levelUp('treffer', 1, s)).toBe(3);
    expect(levelDown('treffer', 3, s)).toBe(1);
    expect(levelUp('treffer', 5, s)).toBe(5);
    expect(levelDown('treffer', 1, s)).toBe(1);
  });
});

describe('pickContent (research R10, FR-029, FR-032)', () => {
  it('takes the current level about 60 % of the time and lower levels uniformly otherwise', () => {
    const s = settings();
    const counts = [0, 0, 0, 0, 0, 0];
    const rng = createRng(7);
    const n = 6000;
    for (let i = 0; i < n; i++) counts[pickContent('treffer', 5, s, rng).level]! += 1;
    expect(counts[5]! / n).toBeGreaterThan(0.56);
    expect(counts[5]! / n).toBeLessThan(0.64);
    for (const l of [1, 2, 3, 4]) {
      expect(counts[l]! / n).toBeGreaterThan(0.08);
      expect(counts[l]! / n).toBeLessThan(0.12);
    }
  });

  it('always takes level 1, and never goes below the parent start level', () => {
    const rng = createRng(3);
    for (let i = 0; i < 50; i++) expect(pickContent('treffer', 1, settings(), rng).level).toBe(1);
    const s = settings((x) => (x.levels.treffer = { start: 3, hardest: 5 }));
    for (let i = 0; i < 200; i++) expect(pickContent('treffer', 5, s, rng).level).toBeGreaterThanOrEqual(3);
  });

  it('skips lower levels whose kinds are off', () => {
    const s = settings((x) => (x.kinds.koerper = false));
    const rng = createRng(11);
    for (let i = 0; i < 200; i++) expect(pickContent('treffer', 3, s, rng).kind).not.toBe('koerper');
  });

  it('alternates "Male an" and "Malen" within level 5', () => {
    const s = settings((x) => (x.levels.bauenMalen = { start: 5, hardest: 5 }));
    const rng = createRng(1);
    const kinds: TaskKind[] = [];
    let previous: TaskKind | null = null;
    for (let i = 0; i < 6; i++) {
      previous = pickContent('bauenMalen', 5, s, rng, previous).kind;
      kinds.push(previous);
    }
    expect(kinds).toEqual(['maleAn', 'malen', 'maleAn', 'malen', 'maleAn', 'malen']);
  });

  it('caps plans by the largest plan and the highest stack', () => {
    const s = settings((x) => {
      x.levels.bauenMalen = { start: 2, hardest: 2 };
      x.buildings.maxPlan = 2;
      x.buildings.maxStack = 2;
    });
    expect(pickContent('bauenMalen', 2, s, createRng(1))).toEqual({ kind: 'bauen', level: 2, plan: { size: 2, minStack: 0, maxStack: 2 } });
  });

  it('keeps only the allowed sides, and offers the closest sides when a level loses all of its own', () => {
    const frontTop = settings((x) => {
      x.levels.bauenMalen = { start: 4, hardest: 4 };
      x.buildings.sides.rechts = false;
      x.buildings.sides.links = false;
    });
    expect(pickContent('bauenMalen', 4, frontTop, createRng(1)).sides).toEqual(['vorn', 'oben']);
    const rightOnly = settings((x) => {
      x.levels.bauenMalen = { start: 3, hardest: 3 };
      x.buildings.sides.vorn = false;
      x.buildings.sides.oben = false;
      x.buildings.sides.links = false;
    });
    expect(pickContent('bauenMalen', 3, rightOnly, createRng(1)).sides).toEqual(['rechts']);
  });

  it('turns off cylinders and spheres when the parent does', () => {
    const s = settings((x) => {
      x.levels.treffer = { start: 5, hardest: 5 };
      x.buildings.mixedPieces = false;
    });
    expect(pickContent('treffer', 5, s, createRng(1))).toMatchObject({ kind: 'ansichtFinden', mixed: false });
  });
});
