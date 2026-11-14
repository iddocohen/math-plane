// T056: help in three steps for all seven kinds (FR-033, research R15).
import { describe, expect, it } from 'vitest';
import { hasForbiddenWord } from '../../i18n';
import { de } from '../../i18n/de';
import { createRng } from '../rng';
import { defaultSettings } from '../settings/defaults';
import { TASK_KINDS, type Level, type TaskKind } from '../types';
import { generateTask } from './generate';
import { firstWrongSquare, helpFor } from './help';
import { capContent, levelDef } from './levels';
import { regionsOf } from './maleAn';
import type { BauenTask, MaleAnTask, MalenTask, Task } from './types';

const LEVEL_OF: Record<TaskKind, Level> = { koerper: 1, formen: 2, bauplanFinden: 3, ansichtFinden: 5, bauen: 2, malen: 4, maleAn: 5 };

function make(kind: TaskKind, seed: number): Task {
  const mode = ['bauen', 'malen', 'maleAn'].includes(kind) ? 'bauenMalen' : 'treffer';
  const level = LEVEL_OF[kind];
  const settings = defaultSettings();
  const def = levelDef(mode, level).contents.find((c) => c.kind === kind)!;
  return generateTask({ content: capContent(def, level, settings), settings, rng: createRng(seed), id: `t-${seed}`, seed });
}

describe('helpFor (FR-033, research R15)', () => {
  it('shows nothing at step 0 and a sentence without a mark at step 1 for every kind', () => {
    for (const kind of TASK_KINDS) {
      const task = make(kind, 3);
      expect(helpFor(task, null, 0)).toBeNull();
      const one = helpFor(task, null, 1)!;
      expect(one.step).toBe(1);
      expect(one.mark).toBeNull();
      expect(one.sentence.length).toBeGreaterThan(10);
    }
  });

  it('names the solid or shape asked for, and the side asked for in view tasks', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const k = make('koerper', seed);
      if (k.kind === 'koerper') expect(helpFor(k, null, 1)!.sentence).toBe(de.help.solids[k.target]);
      const f = make('formen', seed);
      if (f.kind === 'formen') expect(helpFor(f, null, 1)!.sentence).toBe(de.help.shapes[f.target]);
      const a = make('ansichtFinden', seed);
      expect(helpFor(a, null, 1)!.sentence).toBe(de.help.sides[a.side!]);
      const m = make('maleAn', seed);
      expect(helpFor(m, null, 1)!.sentence).toBe(`${de.help.sides[m.side!]} ${de.help.maleAn}`);
    }
    expect(helpFor(make('bauplanFinden', 1), null, 1)!.sentence).toBe(de.help.bauplanFinden);
    expect(helpFor(make('bauen', 1), null, 1)!.sentence).toBe(de.help.bauen);
  });

  it('"Treffer": step 2 blinks the right choices, step 3 adds the arrow; steps above 3 stay at 3', () => {
    for (const kind of ['koerper', 'formen', 'bauplanFinden', 'ansichtFinden'] as const) {
      const task = make(kind, 5);
      if (!('rightIndexes' in task)) throw new Error('no Treffer task');
      expect(helpFor(task, { slots: [0, 1, 2] }, 2)).toEqual({ step: 2, sentence: de.help.pointerBlink, mark: { type: 'target', choices: task.rightIndexes, arrow: false } });
      expect(helpFor(task, null, 3)).toEqual({ step: 3, sentence: de.help.answerTarget, mark: { type: 'target', choices: task.rightIndexes, arrow: true } });
      expect(helpFor(task, null, 7)).toEqual(helpFor(task, null, 3));
    }
  });

  it('"Bauen": step 2 shows the number of the first wrong or empty square only, step 3 the whole plan', () => {
    const task = make('bauen', 9) as BauenTask;
    const target = task.target;
    const empty = target.map((row) => row.map(() => null));
    const two = helpFor(task, { planInput: empty }, 2)!;
    expect(two.sentence).toBe(de.help.pointerCubes(target[0]![0]!));
    expect(two.mark).toEqual({ type: 'plan', heights: target.map((row, r) => row.map((h, c) => (r === 0 && c === 0 ? h : null))) });

    // The first square right, the second wrong: the pointer goes to the second.
    const input = target.map((row) => [...row]) as (number | null)[][];
    input[0]![1] = (target[0]![1]! + 1) % 5;
    const at = firstWrongSquare(target, input);
    expect(at).toEqual({ row: 0, col: 1 });
    const mark = helpFor(task, { planInput: input }, 2)!.mark;
    expect(mark).toEqual({ type: 'plan', heights: target.map((row, r) => row.map((h, c) => (r === 0 && c === 1 ? h : null))) });

    expect(helpFor(task, { planInput: empty }, 3)).toEqual({ step: 3, sentence: de.help.answerPlan, mark: { type: 'plan', heights: target } });
  });

  it('"Bauen": a plan that is already right points at the first square', () => {
    const task = make('bauen', 4) as BauenTask;
    expect(firstWrongSquare(task.target, task.target)).toEqual({ row: 0, col: 0 });
  });

  it('"Bauen": the pointer sentence says "1 Würfel" or "n Würfel"', () => {
    expect(de.help.pointerCubes(1)).toBe('Hier steht 1 Würfel.');
    expect(de.help.pointerCubes(3)).toBe('Hier stehen 3 Würfel.');
  });

  it('"Malen": step 2 shows the view faintly, step 3 stronger', () => {
    const task = make('malen', 6) as MalenTask;
    expect(helpFor(task, null, 2)).toEqual({ step: 2, sentence: de.help.pointerView, mark: { type: 'view', cells: task.expected.cells, strong: false } });
    expect(helpFor(task, null, 3)).toEqual({ step: 3, sentence: de.help.answerView, mark: { type: 'view', cells: task.expected.cells, strong: true } });
  });

  it('"Male an": step 2 shows the right color on the first region not filled with it, step 3 on every region', () => {
    const task = make('maleAn', 11) as MaleAnTask;
    const regions = regionsOf(task.view).sort((a, b) => a - b);
    const right = regions.map((index) => ({ index, color: task.building.pieces[index]!.color }));
    const empty = task.building.pieces.map(() => null);
    expect(helpFor(task, { regionColors: empty }, 2)).toEqual({ step: 2, sentence: de.help.pointerColor, mark: { type: 'regions', regions: [right[0]], fill: false } });

    // The first region filled right: the dot goes to the second.
    const colors: (string | null)[] = [...empty];
    colors[right[0]!.index] = right[0]!.color;
    expect(helpFor(task, { regionColors: colors }, 2)!.mark).toEqual({ type: 'regions', regions: [right[1]], fill: false });

    expect(helpFor(task, { regionColors: empty }, 3)).toEqual({ step: 3, sentence: de.help.answerColors, mark: { type: 'regions', regions: right, fill: true } });
  });

  it('never uses a forbidden word in any help sentence, over many tasks', () => {
    for (const kind of TASK_KINDS) {
      for (let seed = 1; seed <= 30; seed++) {
        const task = make(kind, seed);
        for (const step of [1, 2, 3]) expect(hasForbiddenWord(helpFor(task, null, step)!.sentence)).toBe(false);
      }
    }
  });
});
