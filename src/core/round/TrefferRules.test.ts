import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { defaultSettings } from '../settings/defaults';
import type { Settings } from '../settings/schema';
import { emptyProgress } from '../storage/schemas';
import type { KoerperTask, TrefferTask } from '../tasks/types';
import { FALLBACK_MS, PASS_MS, RoundController, type RoundEvent } from './RoundController';
import { reshuffle, trefferRules, type TrefferState } from './TrefferRules';

function settings(change: (s: Settings) => void = () => {}): Settings {
  const s = defaultSettings();
  change(s);
  return s;
}

function round(opts: { settings?: Settings; seed?: number } = {}) {
  let t = 1_000_000;
  const controller = new RoundController<TrefferTask, TrefferState>({
    rules: trefferRules,
    settings: opts.settings ?? settings(),
    progress: emptyProgress(),
    seed: opts.seed ?? 3,
    now: () => t,
  });
  const events: RoundEvent<TrefferTask>[] = [];
  controller.subscribe((e) => events.push(e));
  return { controller, events, advance: (ms: number) => (t += ms) };
}

/** The task and task state, typed as the rule functions take them; `state()` hands them out read-only. */
function current(c: RoundController<TrefferTask, TrefferState>): { task: TrefferTask; taskState: TrefferState } {
  const { task, taskState } = c.state();
  return { task: task as TrefferTask, taskState: taskState as TrefferState };
}

function slotOf(c: RoundController<TrefferTask, TrefferState>, which: 'right' | 'wrong'): number {
  const { task, taskState } = c.state();
  return taskState.slots.findIndex((choice) => task.rightIndexes.includes(choice) === (which === 'right'));
}

describe('trefferRules', () => {
  it('stands every choice in one slot and answers with the slot of the target', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const { controller } = round({ seed });
      const { task, taskState } = current(controller);
      expect([...taskState.slots].sort()).toEqual([0, 1, 2, 3]);
      const answer = Number(trefferRules.answer!(task, taskState));
      expect(task.choices[trefferRules.choiceAt(task, taskState, answer)!]).toBe((task as KoerperTask).target);
      expect(trefferRules.choiceAt(task, taskState, 4)).toBeNull();
    }
  });

  it('a hit gives a star, celebrates and goes on to a new task (FR-014)', () => {
    const { controller, events } = round();
    controller.tapChoice(slotOf(controller, 'right'));
    controller.landBomb();
    expect(controller.state()).toMatchObject({ phase: 'celebrate', hits: 1, stars: 1, bombsLeft: 9 });
    expect(events.find((e) => e.type === 'bombLanded')).toMatchObject({ hit: true });
    const before = controller.state().task.id;
    controller.next();
    expect(controller.state().phase).toBe('aim');
    expect(controller.state().task.id).not.toBe(before);
  });

  it('a miss moves the hit choice to another slot, keeps the task and remembers what was hit (FR-008)', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const { controller, events } = round({ seed });
      const wrong = slotOf(controller, 'wrong');
      const { task, taskState } = current(controller);
      const choice = taskState.slots[wrong]!;
      controller.tapChoice(wrong);
      controller.landBomb();
      const after = controller.state();
      expect(after.phase).toBe('feedback');
      expect(after.task.id).toBe(task.id);
      expect(after.taskState.slots.indexOf(choice)).not.toBe(wrong);
      expect([...after.taskState.slots].sort()).toEqual([0, 1, 2, 3]);
      expect(after.taskState.lastHit).toBe(choice);
      expect(events.find((e) => e.type === 'slotsShuffled')).toEqual({ type: 'slotsShuffled', slots: after.taskState.slots });
      controller.next();
      expect(controller.state().phase).toBe('aim');
    }
  });

  it('taps during a pass are ignored: one bomb per pass (FR-008)', () => {
    const { controller, events } = round();
    const wrong = slotOf(controller, 'wrong');
    controller.tapChoice(wrong);
    expect(controller.state().phase).toBe('pass');
    controller.tapChoice(slotOf(controller, 'right'));
    controller.tapChoice(wrong);
    expect(events.filter((e) => e.type === 'passStarted')).toHaveLength(1);
    expect(controller.state().lastBomb).toMatchObject({ slot: wrong, hit: false });
    controller.landBomb();
    controller.landBomb();
    expect(controller.state().bombsLeft).toBe(9);
    expect(events.filter((e) => e.type === 'bombLanded')).toHaveLength(1);
  });

  it('taps outside aim are ignored: during feedback and celebrate', () => {
    const { controller, events } = round();
    controller.tapChoice(slotOf(controller, 'wrong'));
    controller.landBomb();
    controller.tapChoice(slotOf(controller, 'right'));
    expect(controller.state().phase).toBe('feedback');
    controller.next();
    controller.tapChoice(slotOf(controller, 'right'));
    controller.landBomb();
    controller.tapChoice(0);
    expect(controller.state().phase).toBe('celebrate');
    expect(events.filter((e) => e.type === 'passStarted')).toHaveLength(2);
  });

  it('lands the bomb itself after the pass time plus 1 second when the view did not (research R18)', () => {
    const { controller, advance } = round();
    controller.tapChoice(slotOf(controller, 'right'));
    advance(PASS_MS + FALLBACK_MS - 1);
    controller.tick();
    expect(controller.state().phase).toBe('pass');
    advance(1);
    controller.tick();
    expect(controller.state()).toMatchObject({ phase: 'celebrate', bombsLeft: 9 });
  });

  it('counts the bomb bay down and ends the round after the last bomb (FR-015)', () => {
    const { controller, events } = round({ settings: settings((s) => (s.round.bombs = 5)) });
    const hitsWanted = [true, false, true, false, false];
    hitsWanted.forEach((hit, i) => {
      controller.tapChoice(slotOf(controller, hit ? 'right' : 'wrong'));
      controller.landBomb();
      expect(controller.state().bombsLeft).toBe(4 - i);
      controller.next();
    });
    expect(controller.state().phase).toBe('ended');
    const end = events.find((e) => e.type === 'roundEnded');
    expect(end).toMatchObject({ summary: { hits: 2, bombsTotal: 5, quit: false } });
  });

  it('a stored state is kept when it fits the task and dropped when it does not', () => {
    const { controller } = round();
    const { task } = current(controller);
    expect(trefferRules.restoreState(task, { slots: [3, 1, 0, 2], lastHit: 1 })).toEqual({ slots: [3, 1, 0, 2], lastHit: 1 });
    expect(trefferRules.restoreState(task, { slots: [3, 1, 0, 2], lastHit: 9 })).toEqual({ slots: [3, 1, 0, 2], lastHit: null });
    expect(trefferRules.restoreState(task, { slots: [0, 0, 1, 2] })).toBeNull();
    expect(trefferRules.restoreState(task, { slots: [0, 1, 2] })).toBeNull();
    expect(trefferRules.restoreState(task, null)).toBeNull();
  });
});

describe('reshuffle', () => {
  it('always moves the hit choice, also when the random orders keep it in place', () => {
    const stuck = { ...createRng(1), shuffled: <T>(items: readonly T[]) => [...items] };
    expect(reshuffle([2, 0, 3, 1], 0, stuck)).toEqual([0, 3, 1, 2]);
    for (let seed = 1; seed <= 300; seed++) {
      const slots = createRng(seed).shuffled([0, 1, 2, 3]);
      const choice = seed % 4;
      expect(reshuffle(slots, choice, createRng(seed + 1000)).indexOf(choice)).not.toBe(slots.indexOf(choice));
    }
  });
});

describe('trefferRules with plan and view tasks (US2)', () => {
  for (const level of [3, 4, 5] as const) {
    it(`level ${level}: 3 choices in 3 slots, one right slot, and a miss remembers the choice hit for the "Getroffen" card`, () => {
      for (let seed = 1; seed <= 60; seed++) {
        const { controller } = round({ seed, settings: settings((s) => (s.levels.treffer = { start: level, hardest: level })) });
        const { task, taskState } = current(controller);
        expect(task.kind).toBe(level === 3 ? 'bauplanFinden' : 'ansichtFinden');
        expect([...taskState.slots].sort()).toEqual([0, 1, 2]);
        expect(trefferRules.answer!(task, taskState).split(',')).toHaveLength(1);
        const wrong = slotOf(controller, 'wrong');
        const choice = taskState.slots[wrong]!;
        controller.tapChoice(wrong);
        controller.landBomb();
        const after = controller.state();
        expect(after.taskState.lastHit).toBe(choice);
        expect(after.taskState.slots.indexOf(choice)).not.toBe(wrong);
        expect(after.task.id).toBe(task.id);
      }
    });
  }
});
