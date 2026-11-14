// T045: the rules of "Bauen und Malen" for "Bauen" with the RoundController (FR-020, FR-021, FR-024b).
import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { defaultSettings } from '../settings/defaults';
import type { Settings } from '../settings/schema';
import { emptyProgress } from '../storage/schemas';
import { hitTest } from '../geometry/mixed';
import type { BauenTask, MaleAnTask, MalenTask } from '../tasks/types';
import { bauenMalenRules, bauenRules, nextSquare, type BauenState, type MaleAnState, type MalenState } from './BauenMalenRules';
import { RoundController, type RoundEvent } from './RoundController';
import type { TaskBase } from './rules';

function settings(change: (s: Settings) => void = () => {}): Settings {
  const s = defaultSettings();
  s.levels.bauenMalen = { start: 1, hardest: 1 };
  change(s);
  return s;
}

function round(opts: { settings?: Settings; seed?: number } = {}) {
  const controller = new RoundController<TaskBase, unknown>({
    rules: bauenMalenRules,
    settings: opts.settings ?? settings(),
    progress: emptyProgress(),
    seed: opts.seed ?? 3,
    now: () => 1_000_000,
  });
  const events: RoundEvent[] = [];
  controller.subscribe((e) => events.push(e));
  const task = () => controller.state().task as BauenTask;
  const state = () => controller.state().taskState as BauenState;
  return { controller, events, task, state };
}

/** Types `plan` square by square in reading order, starting with the first square selected. */
function typePlan(c: RoundController<TaskBase, unknown>, plan: number[][]): void {
  c.select(0, 0);
  plan.forEach((row, r) => row.forEach((h, k) => c.typeHeight(r, k, h)));
}

describe('bauenMalenRules "Bauen"', () => {
  it('starts with an empty plan, an empty field and the first square selected', () => {
    const { controller, task, state } = round();
    expect(controller.state().task.kind).toBe('bauen');
    expect(controller.state().tasksTotal).toBe(5);
    expect(state().planInput).toEqual(task().target.map((row) => row.map(() => null)));
    expect(state().built).toEqual(task().target.map((row) => row.map(() => 0)));
    expect(state().selected).toEqual({ row: 0, col: 0 });
  });

  it('typing a height builds the stack, reports the crates and moves the frame on', () => {
    const { controller, events, state } = round();
    controller.typeHeight(0, 0, 3);
    expect(state().planInput[0]![0]).toBe(3);
    expect(state().built[0]![0]).toBe(3);
    expect(state().selected).toEqual({ row: 0, col: 1 });
    expect(events).toContainEqual({ type: 'cratesChanged', row: 0, col: 0, from: 0, to: 3 });
    events.length = 0;
    controller.typeHeight(0, 0, 1);
    expect(state().built[0]![0]).toBe(1);
    expect(events).toContainEqual({ type: 'cratesChanged', row: 0, col: 0, from: 3, to: 1 });
  });

  it('ignores digits above 4 and other numbers, and inputs of other kinds (acceptance 6)', () => {
    const { controller, events, state } = round();
    const before = structuredClone(state());
    for (const h of [5, 9, -1, 1.5, Number.NaN]) controller.typeHeight(0, 0, h);
    controller.togglePaint(0, 0);
    controller.pickColor('#ff0000');
    controller.fillRegion(0);
    controller.typeHeight(7, 0, 2);
    controller.select(-1, 0);
    expect(state()).toEqual(before);
    expect(events.filter((e) => e.type === 'cratesChanged')).toEqual([]);
  });

  it('accepts 4 as the highest stack', () => {
    const { controller, state } = round();
    controller.typeHeight(1, 1, 4);
    expect(state().planInput[1]![1]).toBe(4);
  });

  it('selects a square and clears it with Backspace', () => {
    const { controller, events, state } = round();
    controller.select(1, 0);
    expect(state().selected).toEqual({ row: 1, col: 0 });
    // A selection has no crates, but the views and the overlay still hear of it.
    expect(events).toEqual([{ type: 'inputApplied' }]);
    controller.typeHeight(1, 0, 2);
    controller.clearHeight(1, 0);
    expect(state().planInput[1]![0]).toBeNull();
    expect(state().built[1]![0]).toBe(0);
    expect(state().selected).toEqual({ row: 1, col: 0 });
    expect(events).toContainEqual({ type: 'cratesChanged', row: 1, col: 0, from: 2, to: 0 });
  });

  it('the frame stays on the last square', () => {
    const { controller, task, state } = round();
    const last = task().target.length - 1;
    controller.typeHeight(last, last, 1);
    expect(state().selected).toEqual({ row: last, col: last });
    expect(nextSquare([[1, 2], [3, 4]], 0, 1)).toEqual({ row: 1, col: 0 });
  });

  it('a wrong "Fertig" marks only the wrong square; fixing it unmarks it and the next "Fertig" solves the task with 3 stars', () => {
    const { controller, events, task } = round();
    const plan = task().target.map((row) => [...row]);
    plan[1]![0] = plan[1]![0] === 1 ? 2 : 1;
    typePlan(controller, plan);
    controller.done();
    expect(controller.state().phase).toBe('check');
    expect(controller.state().marked).toEqual(['1,0']);
    expect(controller.state().misses).toBe(1);
    expect(events).toContainEqual({ type: 'checked', right: false, marked: ['1,0'] });

    controller.select(1, 0);
    expect(controller.state().phase).toBe('aim');
    expect(controller.state().marked).toEqual(['1,0']);
    controller.typeHeight(1, 0, task().target[1]![0]!);
    expect(controller.state().marked).toEqual([]);
    controller.done();
    expect(controller.state().phase).toBe('celebrate');
    expect(controller.state().tasksDone).toBe(1);
    expect(events).toContainEqual({ type: 'starsAwarded', n: 3 });
  });

  it('an empty square is wrong', () => {
    const { controller, task } = round();
    const plan = task().target;
    plan.forEach((row, r) => row.forEach((h, k) => (r === 0 && k === 1 ? undefined : controller.typeHeight(r, k, h))));
    controller.done();
    expect(controller.state().marked).toEqual(['0,1']);
  });

  it('a round has round.tasks tasks and ends after the last one', () => {
    const { controller, events } = round({ settings: settings((s) => (s.round.tasks = 3)) });
    for (let i = 0; i < 3; i++) {
      const t = controller.state().task as BauenTask;
      typePlan(controller, t.target);
      controller.done();
      expect(controller.state().phase).toBe('celebrate');
      controller.next();
    }
    expect(controller.state().phase).toBe('ended');
    const end = events.find((e) => e.type === 'roundEnded');
    expect(end && end.type === 'roundEnded' && end.summary.tasksDone).toBe(3);
    expect(end && end.type === 'roundEnded' && end.summary.solvedAlone).toBe(3);
  });

  it('answers with the building plan and restores a stored state', () => {
    const { controller, task, state } = round();
    expect(bauenMalenRules.answer!(task(), state())).toBe(task().target.map((r) => r.join(',')).join('/'));
    controller.typeHeight(0, 0, 2);
    const stored = structuredClone(state());
    expect(bauenRules.restoreState(task(), stored)).toEqual(stored);
    expect(bauenRules.restoreState(task(), { ...stored, built: [[9]] })).toBeNull();
    expect(bauenRules.restoreState(task(), { ...stored, selected: { row: 5, col: 0 } })).toBeNull();
    expect(bauenRules.restoreState(task(), 'nope')).toBeNull();
  });

  it('continues a stored round with the plan written so far', () => {
    const s = settings();
    const first = new RoundController<TaskBase, unknown>({ rules: bauenMalenRules, settings: s, progress: emptyProgress(), seed: 9, now: () => 0 });
    first.typeHeight(0, 0, 2);
    const again = new RoundController<TaskBase, unknown>({ rules: bauenMalenRules, settings: s, progress: emptyProgress(), seed: 9, now: () => 0, stored: first.toStored() });
    expect(again.restored).toBe(true);
    expect((again.state().taskState as BauenState).planInput[0]![0]).toBe(2);
    expect(again.state().task).toEqual(first.state().task);
  });

  it('continues a stored round with the same building when the page gives a new seed, and keeps the stored seed', () => {
    const s = settings((x) => (x.round.tasks = 3));
    const first = new RoundController<TaskBase, unknown>({ rules: bauenMalenRules, settings: s, progress: emptyProgress(), seed: 9, now: () => 0 });
    first.typeHeight(0, 0, 2);
    const stored = first.toStored()!;
    // A refresh without `?seed=` makes the controller with a new random seed.
    const again = new RoundController<TaskBase, unknown>({ rules: bauenMalenRules, settings: s, progress: emptyProgress(), seed: 123456, now: () => 0, stored });
    expect(again.restored).toBe(true);
    expect(again.state().task).toEqual(first.state().task);
    expect((again.state().taskState as BauenState).planInput[0]![0]).toBe(2);
    expect(again.toStored()!.seed).toBe(9);
    // The next task is the one the first round would have made.
    typePlan(first, (first.state().task as BauenTask).target);
    first.done();
    first.next();
    typePlan(again, (again.state().task as BauenTask).target);
    again.done();
    again.next();
    expect(again.state().task).toEqual(first.state().task);
  });
});

describe('bauenMalenRules "Malen" (T052, FR-009, FR-022)', () => {
  const level = (n: 3 | 4) =>
    settings((x) => {
      x.levels.bauenMalen = { start: n, hardest: n };
      x.adaptive = false;
    });

  function malen(seed = 4) {
    const r = round({ settings: level(4), seed });
    return { ...r, task: () => r.controller.state().task as MalenTask, state: () => r.controller.state().taskState as MalenState };
  }

  it('starts with an empty grid of the view\'s size and the marker on the bottom left square', () => {
    const { controller, task, state } = malen();
    expect(controller.state().task.kind).toBe('malen');
    expect(controller.state().task.side).toBe(task().side);
    expect(state().paint).toEqual(task().expected.cells.map((row) => row.map(() => false)));
    expect(state().selected).toEqual({ row: task().expected.cells.length - 1, col: 0 });
  });

  it('togglePaint colors and empties a square and moves the marker; nothing is checked before "Fertig" (acceptance 3)', () => {
    const { controller, events, state } = malen();
    controller.togglePaint(0, 1);
    expect(state().paint[0]![1]).toBe(true);
    expect(state().selected).toEqual({ row: 0, col: 1 });
    controller.togglePaint(0, 1);
    expect(state().paint[0]![1]).toBe(false);
    expect(events.filter((e) => e.type === 'checked')).toEqual([]);
    expect(events.filter((e) => e.type === 'inputApplied')).toHaveLength(2);
    expect(controller.state().misses).toBe(0);
  });

  it('select moves the marker inside the grid; other inputs are ignored', () => {
    const { controller, state } = malen();
    controller.select(1, 2);
    expect(state().selected).toEqual({ row: 1, col: 2 });
    const before = structuredClone(state());
    controller.select(9, 0);
    controller.togglePaint(-1, 0);
    controller.typeHeight(0, 0, 2);
    controller.pickColor('#e0413a');
    controller.fillRegion(0);
    expect(state()).toEqual(before);
  });

  it('marks exactly an extra and a missing square, fixing them solves the task (acceptance 4, 5)', () => {
    const { controller, task, state } = malen();
    const cells = task().expected.cells;
    cells.forEach((row, r) => row.forEach((on, c) => on && controller.togglePaint(r, c)));
    const extra = cells.flatMap((row, r) => row.flatMap((on, c) => (on ? [] : [[r, c] as const])))[0]!;
    const missing = cells.flatMap((row, r) => row.flatMap((on, c) => (on ? [[r, c] as const] : [])))[0]!;
    controller.togglePaint(...extra);
    controller.togglePaint(...missing);
    controller.done();
    const marks = [`${extra[0]},${extra[1]}`, `${missing[0]},${missing[1]}`].sort();
    expect([...controller.state().marked].sort()).toEqual(marks);
    expect(controller.state().phase).toBe('check');
    expect(controller.state().misses).toBe(1);
    controller.togglePaint(...extra);
    expect(controller.state().marked).toEqual([`${missing[0]},${missing[1]}`]);
    controller.togglePaint(...missing);
    expect(state().paint).toEqual(cells);
    controller.done();
    expect(controller.state().phase).toBe('celebrate');
  });

  it('level 3 asks only for vorn and oben', () => {
    const { controller } = round({ settings: level(3), seed: 2 });
    for (let i = 0; i < 5; i++) {
      expect(controller.state().task.kind).toBe('malen');
      expect(['vorn', 'oben']).toContain(controller.state().task.side);
      const task = controller.state().task as MalenTask;
      task.expected.cells.forEach((row, r) => row.forEach((on, c) => on && controller.togglePaint(r, c)));
      controller.done();
      controller.next();
    }
  });

  it('data-answer is the view, and a stored round keeps the painted squares', () => {
    const s = level(4);
    const first = new RoundController<TaskBase, unknown>({ rules: bauenMalenRules, settings: s, progress: emptyProgress(), seed: 9, now: () => 0 });
    const task = first.state().task as MalenTask;
    expect(bauenMalenRules.answer!(task, first.state().taskState)).toBe(task.expected.signature);
    first.togglePaint(0, 0);
    const again = new RoundController<TaskBase, unknown>({ rules: bauenMalenRules, settings: s, progress: emptyProgress(), seed: 9, now: () => 0, stored: first.toStored() });
    expect(again.restored).toBe(true);
    expect((again.state().taskState as MalenState).paint[0]![0]).toBe(true);
  });
});

describe('bauenMalenRules "Male an" (T052, FR-009, FR-023)', () => {
  const level5 = () =>
    settings((x) => {
      x.levels.bauenMalen = { start: 5, hardest: 5 };
      x.adaptive = false;
    });

  function maleAn(seed = 4) {
    const r = round({ settings: level5(), seed });
    expect(r.controller.state().task.kind).toBe('maleAn');
    return { ...r, task: () => r.controller.state().task as MaleAnTask, state: () => r.controller.state().taskState as MaleAnState };
  }

  it('starts with empty regions, no color and the marker on the first color', () => {
    const { task, state } = maleAn();
    expect(state().regionColors).toEqual(task().building.pieces.map(() => null));
    expect(state().color).toBeNull();
    expect(state().selected).toEqual({ row: 1, col: 0 });
  });

  it('a region fills only after a color is picked, and can be changed before "Fertig" (acceptance 7)', () => {
    const { controller, events, task, state } = maleAn();
    controller.fillRegion(0);
    expect(state().regionColors[0]).toBeNull();
    const [a, b] = task().palette;
    controller.pickColor(a!);
    expect(state().color).toBe(a);
    expect(state().selected).toEqual({ row: 1, col: 0 });
    controller.fillRegion(0);
    expect(state().regionColors[0]).toBe(a);
    expect(state().selected).toEqual({ row: 0, col: 0 });
    controller.pickColor(b!);
    controller.fillRegion(0);
    expect(state().regionColors[0]).toBe(b);
    expect(events.filter((e) => e.type === 'checked')).toEqual([]);
  });

  it('ignores colors outside the palette, unknown regions and inputs of other kinds', () => {
    const { controller, state } = maleAn();
    const before = structuredClone(state());
    controller.pickColor('#000000');
    controller.fillRegion(99);
    controller.select(2, 0);
    controller.select(0, 99);
    controller.togglePaint(0, 0);
    controller.typeHeight(0, 0, 1);
    expect(state()).toEqual(before);
    controller.select(0, 1);
    expect(state().selected).toEqual({ row: 0, col: 1 });
  });

  it('marks only the region with a wrong color; fixing it solves the task (acceptance 8)', () => {
    const { controller, task } = maleAn();
    const pieces = task().building.pieces;
    pieces.forEach((p, i) => {
      controller.pickColor(i === 1 ? task().palette.find((c) => c !== p.color)! : p.color);
      controller.fillRegion(i);
    });
    controller.done();
    expect(controller.state().marked).toEqual(['r1']);
    expect(controller.state().phase).toBe('check');
    controller.pickColor(pieces[1]!.color);
    controller.fillRegion(1);
    expect(controller.state().marked).toEqual([]);
    controller.done();
    expect(controller.state().phase).toBe('celebrate');
  });

  it('marks empty regions', () => {
    const { controller, task } = maleAn();
    controller.done();
    expect(controller.state().marked).toEqual(task().building.pieces.map((_, i) => `r${i}`));
  });

  it('data-answer gives each region\'s color and a point inside it', () => {
    const { controller, task } = maleAn();
    const answer = bauenMalenRules.answer!(task(), controller.state().taskState);
    const [size, ...parts] = answer.split(' ');
    expect(size).toBe(`${task().view.width}x${task().view.height}`);
    expect(parts).toHaveLength(task().building.pieces.length);
    parts.forEach((part, i) => {
      const m = /^(\d+):(#[0-9a-f]{6})@([\d.]+),([\d.]+)$/.exec(part)!;
      expect(Number(m[1])).toBe(i);
      expect(m[2]).toBe(task().building.pieces[i]!.color);
      expect(hitTest(task().view, Number(m[3]), Number(m[4]))).toBe(i);
    });
  });

  it('level 5 alternates "Male an" and "Malen" (FR-020)', () => {
    const { controller } = round({ settings: level5(), seed: 4 });
    const kinds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const task = controller.state().task;
      kinds.push(task.kind);
      if (task.kind === 'malen') (task as MalenTask).expected.cells.forEach((row, r) => row.forEach((on, c) => on && controller.togglePaint(r, c)));
      else
        (task as MaleAnTask).building.pieces.forEach((p, k) => {
          controller.pickColor(p.color);
          controller.fillRegion(k);
        });
      controller.done();
      expect(controller.state().phase).toBe('celebrate');
      controller.next();
    }
    expect(kinds).toEqual(['maleAn', 'malen', 'maleAn', 'malen', 'maleAn']);
    expect(controller.state().phase).toBe('ended');
  });
});

describe('bauenMalenRules tasks', () => {
  it('the same seed makes the same "Bauen" task', () => {
    const request = (seed: number) => ({ content: { kind: 'bauen' as const, level: 2 as const, plan: { size: 3 as const, minStack: 0, maxStack: 3 } }, settings: settings(), rng: createRng(seed), id: 'x', seed });
    expect(bauenMalenRules.createTask(request(8))).toEqual(bauenMalenRules.createTask(request(8)));
  });
});
