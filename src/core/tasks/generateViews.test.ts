import { describe, expect, it } from 'vitest';
import { hasForbiddenWord } from '../../i18n';
import { mixedProblem, mixedView } from '../geometry/mixed';
import { isUniform, mirrorFB, mirrorLR, plansEqual, rotate90, type Plan } from '../geometry/plan';
import { cubeView } from '../geometry/views';
import { createRng } from '../rng';
import { defaultSettings } from '../settings/defaults';
import type { Settings } from '../settings/schema';
import { SIDES, type Level, type Side } from '../types';
import { checkBomb } from './check';
import { PIECE_COLORS } from './colors';
import { generateTask } from './generate';
import { capContent, levelDef } from './levels';
import { isCubeCard, isMixedBuilding, type AnsichtFindenTask, type BauplanFindenTask } from './types';

const SEEDS = Array.from({ length: 500 }, (_, i) => i + 1);

function make(level: Level, seed: number, settings: Settings = defaultSettings()) {
  const content = capContent(levelDef('treffer', level).contents[0]!, level, settings);
  return generateTask({ content, settings, rng: createRng(seed), id: `t-${seed}`, seed });
}

function isCloseVariant(p: Plan, v: Plan): boolean {
  const turns = [rotate90(p), rotate90(rotate90(p)), rotate90(rotate90(rotate90(p)))];
  if ([mirrorLR(p), mirrorFB(p), ...turns].some((s) => plansEqual(s, v))) return true;
  const diffs = p.flat().map((h, i) => v.flat()[i]! - h).filter((d) => d !== 0);
  return diffs.length === 1 && Math.abs(diffs[0]!) === 1;
}

describe('"Bauplan finden" on level 3 (FR-018, research R5)', () => {
  it('shows a 2×2 plan with stacks 1 to 3 and exactly one matching building of 3, over 500 seeds', () => {
    for (const seed of SEEDS) {
      const task = make(3, seed) as BauplanFindenTask;
      expect(task.kind).toBe('bauplanFinden');
      expect(task.level).toBe(3);
      expect(task.plan).toHaveLength(2);
      for (const h of task.plan.flat()) expect(h >= 1 && h <= 3).toBe(true);
      expect(isUniform(task.plan)).toBe(false);
      expect(task.choices).toHaveLength(3);
      expect(task.choices.filter((c) => plansEqual(c, task.plan))).toHaveLength(1);
      expect(task.rightIndexes).toEqual([task.choices.findIndex((c) => plansEqual(c, task.plan))]);
      expect(plansEqual(task.choices[0]!, task.choices[1]!) || plansEqual(task.choices[1]!, task.choices[2]!) || plansEqual(task.choices[0]!, task.choices[2]!)).toBe(false);
      for (const c of task.choices) {
        for (const h of c.flat()) expect(h >= 1 && h <= 3).toBe(true);
        if (!plansEqual(c, task.plan)) expect(isCloseVariant(task.plan, c)).toBe(true);
      }
      expect(new Set(task.colors).size).toBe(3);
      for (const c of task.colors) expect(PIECE_COLORS).toContain(c);
    }
  });

  it('a miss on another building says it has another plan', () => {
    const task = make(3, 9) as BauplanFindenTask;
    const wrong = [0, 1, 2].find((i) => !task.rightIndexes.includes(i))!;
    expect(checkBomb(task, wrong)).toEqual({ hit: false, named: 'Dieses Gebäude hat einen anderen Bauplan.' });
    expect(checkBomb(task, task.rightIndexes[0]!).hit).toBe(true);
  });

  it('keeps stacks within a highest stack of 2', () => {
    const settings = defaultSettings();
    settings.buildings.maxStack = 2;
    for (const seed of SEEDS.slice(0, 100)) {
      const task = make(3, seed, settings) as BauplanFindenTask;
      for (const c of task.choices) for (const h of c.flat()) expect(h >= 1 && h <= 2).toBe(true);
      expect(task.choices.filter((c) => plansEqual(c, task.plan))).toHaveLength(1);
    }
  });
});

/** The view of the task's building from `side`, as a card would show it. */
function viewOf(task: AnsichtFindenTask, side: Side) {
  return isMixedBuilding(task.building) ? mixedView(task.building, side) : cubeView(task.building, side, 3);
}

function checkViewTask(task: AnsichtFindenTask): void {
  expect(task.kind).toBe('ansichtFinden');
  expect(task.choices).toHaveLength(3);
  const asked = viewOf(task, task.side).signature;
  // Exactly one card equals the asked view (SC-005), and the cards differ from each other.
  expect(task.choices.filter((c) => c.view.signature === asked)).toHaveLength(1);
  expect(new Set(task.choices.map((c) => c.view.signature)).size).toBe(3);
  expect(task.rightIndexes).toEqual([task.choices.findIndex((c) => c.view.signature === asked)]);
  // Every side that looks like the asked side counts for the right card (research R7).
  const right = task.choices[task.rightIndexes[0]!]!;
  expect(right.shows).toEqual(SIDES.filter((s) => viewOf(task, s).signature === asked));
  // All cards have the same size, so the size gives nothing away.
  const size = (c: (typeof task.choices)[number]) => (isCubeCard(c.view) ? `${c.view.cells[0]!.length}x${c.view.cells.length}` : `${c.view.width}x${c.view.height}`);
  expect(new Set(task.choices.map(size)).size).toBe(1);
  // A wrong card's miss line names a side it shows, or says it is another view.
  task.choices.forEach((c, i) => {
    const check = checkBomb(task, i);
    expect(check.hit).toBe(i === task.rightIndexes[0]);
    if (check.hit) return;
    expect(check.named).toMatch(/^(Das ist die Ansicht von (vorn|oben|rechts|links)\.|Das ist eine andere Ansicht\.)$/);
    expect(hasForbiddenWord(check.named)).toBe(false);
    const named = /von (\w+)\./.exec(check.named)?.[1] as Side | undefined;
    if (named) expect(viewOf(task, named).signature).toBe(c.view.signature);
  });
}

describe('"Ansicht finden" on level 4 (FR-019, research R7)', () => {
  it('asks for vorn or oben of a cube building with exactly one right card, over 500 seeds', () => {
    const sides = new Set<Side>();
    for (const seed of SEEDS) {
      const task = make(4, seed) as AnsichtFindenTask;
      expect(['vorn', 'oben']).toContain(task.side);
      sides.add(task.side);
      expect(isMixedBuilding(task.building)).toBe(false);
      for (const c of task.choices) expect(isCubeCard(c.view)).toBe(true);
      checkViewTask(task);
    }
    expect([...sides].sort()).toEqual(['oben', 'vorn']);
  });

  it('names the side a wrong card shows: "Das ist die Ansicht von links."', () => {
    const lines = new Set<string>();
    for (const seed of SEEDS) {
      const task = make(5, seed) as AnsichtFindenTask;
      task.choices.forEach((_, i) => lines.add(checkBomb(task, i).named));
    }
    expect(lines).toContain('Das ist die Ansicht von links.');
    expect(lines).toContain('Das ist eine andere Ansicht.');
  });
});

describe('"Ansicht finden" on level 5', () => {
  it('asks about all four sides, with mixed buildings that keep the rules, over 500 seeds', () => {
    const sides = new Set<Side>();
    let mixed = 0;
    let circles = 0;
    for (const seed of SEEDS) {
      const task = make(5, seed) as AnsichtFindenTask;
      sides.add(task.side);
      if (isMixedBuilding(task.building)) {
        mixed += 1;
        expect(mixedProblem(task.building, SIDES)).toBeNull();
        if (task.choices.some((c) => !isCubeCard(c.view) && c.view.outlines.some((o) => o.shape === 'circle'))) circles += 1;
      }
      checkViewTask(task);
    }
    expect([...sides].sort()).toEqual([...SIDES].sort());
    expect(mixed).toBeGreaterThan(150);
    expect(circles).toBeGreaterThan(100);
  });

  it('keeps within the parent limits: no mixed pieces, 2×2 plans, sides vorn and rechts only', () => {
    const settings = defaultSettings();
    settings.buildings.mixedPieces = false;
    settings.buildings.maxPlan = 2;
    settings.buildings.sides = { vorn: true, oben: false, rechts: true, links: false };
    for (const seed of SEEDS.slice(0, 200)) {
      const task = make(5, seed, settings) as AnsichtFindenTask;
      expect(isMixedBuilding(task.building)).toBe(false);
      expect(task.building as Plan).toHaveLength(2);
      expect(['vorn', 'rechts']).toContain(task.side);
      checkViewTask(task);
    }
  });

  it('makes the same task for the same seed', () => {
    expect(make(5, 42)).toEqual(make(5, 42));
  });
});
