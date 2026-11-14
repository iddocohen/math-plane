// T045: the rules of "Bauen und Malen" for "Bauen" with the RoundController (FR-020, FR-021, FR-024b).
import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { defaultSettings } from '../settings/defaults';
import type { Settings } from '../settings/schema';
import { emptyProgress } from '../storage/schemas';
import type { BauenTask } from '../tasks/types';
import { bauenMalenRules, bauenRules, nextSquare, type BauenState } from './BauenMalenRules';
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
});

describe('bauenMalenRules on levels 3 to 5 (until US4)', () => {
  it('makes "Malen" and "Male an" tasks that alternate on level 5, and "Fertig" solves them', () => {
    const s = settings((x) => {
      x.levels.bauenMalen = { start: 5, hardest: 5 };
      x.adaptive = false;
    });
    const { controller } = round({ settings: s, seed: 4 });
    const kinds: string[] = [];
    for (let i = 0; i < 5; i++) {
      kinds.push(controller.state().task.kind);
      expect(controller.state().task.mode).toBe('bauenMalen');
      controller.done();
      expect(controller.state().phase).toBe('celebrate');
      controller.next();
    }
    expect(kinds).toEqual(['maleAn', 'malen', 'maleAn', 'malen', 'maleAn']);
    expect(controller.state().phase).toBe('ended');
  });

  it('the same seed makes the same "Bauen" task', () => {
    const request = (seed: number) => ({ content: { kind: 'bauen' as const, level: 2 as const, plan: { size: 3 as const, minStack: 0, maxStack: 3 } }, settings: settings(), rng: createRng(seed), id: 'x', seed });
    expect(bauenMalenRules.createTask(request(8))).toEqual(bauenMalenRules.createTask(request(8)));
  });
});
