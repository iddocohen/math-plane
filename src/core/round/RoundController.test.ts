import { describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '../settings/defaults';
import type { Settings } from '../settings/schema';
import { emptyProgress, emptyRecords, roundSchema, type Progress } from '../storage/schemas';
import { FALLBACK_MS, PASS_MS, RoundController, type RoundEvent } from './RoundController';
import type { BauenMalenRules, TaskBase, TrefferRules } from './rules';

// ---- stub rules ------------------------------------------------------------------------------------------------

/** A "Treffer" task with 4 choices; `right` lists the right choices (several, as `rightIndexes` of view tasks). */
interface ChoiceTask extends TaskBase {
  right: number[];
}
interface SlotState {
  slots: number[];
}

const trefferRules: TrefferRules<ChoiceTask, SlotState> = {
  mode: 'treffer',
  createTask: ({ content, rng, id, seed }) => ({ id, seed, kind: content.kind, mode: 'treffer', level: content.level, right: [rng.int(0, 3)] }),
  createState: (_task, rng) => ({ slots: rng.shuffled([0, 1, 2, 3]) }),
  restoreState: (_task, raw) => {
    const slots = (raw as SlotState | null)?.slots;
    return Array.isArray(slots) && slots.length === 4 ? { slots: [...slots] } : null;
  },
  choiceAt: (_task, state, slot) => state.slots[slot] ?? null,
  isHit: (task, choice) => task.right.includes(choice),
  afterMiss: (_task, state) => ({ slots: [...state.slots.slice(1), state.slots[0]!] }),
  slots: (state) => [...state.slots],
};

/** A "Bauen und Malen" task: type the heights of `target`, one per column. */
interface BuildTask extends TaskBase {
  target: number[];
}
interface BuildState {
  values: number[];
}

const bauenRules: BauenMalenRules<BuildTask, BuildState> = {
  mode: 'bauenMalen',
  createTask: ({ content, id, seed }) => ({ id, seed, kind: content.kind, mode: 'bauenMalen', level: content.level, side: content.sides?.[0], target: [1, 2] }),
  createState: () => ({ values: [0, 0] }),
  restoreState: (_task, raw) => {
    const values = (raw as BuildState | null)?.values;
    return Array.isArray(values) ? { values: [...values] } : null;
  },
  apply: (_task, state, input) => {
    if (input.type !== 'typeHeight') return null;
    const values = [...state.values];
    const from = values[input.col]!;
    values[input.col] = input.height;
    return { state: { values }, events: [{ type: 'cratesChanged', row: 0, col: input.col, from, to: input.height }], unmark: [String(input.col)] };
  },
  check: (task, state) => {
    const marked = task.target.flatMap((h, i) => (state.values[i] === h ? [] : [String(i)]));
    return { right: marked.length === 0, marked };
  },
};

// ---- helpers ---------------------------------------------------------------------------------------------------

function settings(change: (s: Settings) => void = () => {}): Settings {
  const s = defaultSettings();
  change(s);
  return s;
}

function clock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

function treffer(opts: { settings?: Settings; progress?: Progress; seed?: number } = {}) {
  const c = clock();
  const round = new RoundController({ rules: trefferRules, settings: opts.settings ?? settings(), progress: opts.progress ?? emptyProgress(), seed: opts.seed ?? 5, now: c.now });
  const events: RoundEvent<ChoiceTask>[] = [];
  round.subscribe((e) => events.push(e));
  return { round, events, clock: c };
}

function bauen(opts: { settings?: Settings; seed?: number } = {}) {
  const c = clock();
  const s = opts.settings ?? settings((x) => (x.round.tasks = 3));
  const round = new RoundController({ rules: bauenRules, settings: s, progress: emptyProgress(), seed: opts.seed ?? 5, now: c.now });
  const events: RoundEvent<BuildTask>[] = [];
  round.subscribe((e) => events.push(e));
  return { round, events, clock: c };
}

/** The slot of the right choice and a slot of a wrong one. */
function slotsOf(round: RoundController<ChoiceTask, SlotState>) {
  const { task, taskState } = round.state();
  const right = taskState.slots.findIndex((c) => task.right.includes(c));
  const wrong = taskState.slots.findIndex((c) => !task.right.includes(c));
  return { right, wrong };
}

function bomb(round: RoundController<ChoiceTask, SlotState>, which: 'right' | 'wrong') {
  round.tapChoice(slotsOf(round)[which]);
  round.landBomb();
}

const types = (events: RoundEvent[]) => events.map((e) => e.type).filter((t) => t !== 'phaseChanged');

// ---- "Treffer" -------------------------------------------------------------------------------------------------

describe('RoundController in "Treffer"', () => {
  it('starts at aim with the bomb bay of the settings and a task of the current level', () => {
    const { round } = treffer({ settings: settings((x) => (x.round.bombs = 7)) });
    const s = round.state();
    expect(s).toMatchObject({ mode: 'treffer', phase: 'aim', bombsTotal: 7, bombsLeft: 7, hits: 0, taskIndex: 1, level: 1, helpStep: 0, misses: 0 });
    expect(s.task.kind).toBe('koerper');
  });

  it('a hit: pass, landing, one star, an alone attempt, celebrate, then the next task', () => {
    const { round, events } = treffer();
    const { right } = slotsOf(round);
    round.tapChoice(right);
    expect(round.state().phase).toBe('pass');
    round.landBomb();
    expect(round.state()).toMatchObject({ phase: 'celebrate', hits: 1, bombsLeft: 9, stars: 1 });
    expect(types(events)).toEqual(['passStarted', 'bombLanded', 'attemptRecorded', 'starsAwarded']);
    const recorded = events.find((e) => e.type === 'attemptRecorded');
    expect(recorded).toMatchObject({ record: { mode: 'treffer', kind: 'koerper', level: 1, outcome: 'alone', helpStep: 0, misses: 0 } });
    round.next();
    expect(round.state()).toMatchObject({ phase: 'aim', taskIndex: 2, misses: 0 });
    expect(types(events).at(-1)).toBe('taskStarted');
  });

  it('ignores taps during a pass and a second landing (FR-008)', () => {
    const { round, events } = treffer();
    const { right, wrong } = slotsOf(round);
    round.tapChoice(wrong);
    round.tapChoice(right);
    expect(round.state().lastBomb?.slot).toBe(wrong);
    round.landBomb();
    round.landBomb();
    expect(round.state().bombsLeft).toBe(9);
    expect(events.filter((e) => e.type === 'passStarted')).toHaveLength(1);
  });

  it('a miss uses a bomb, reshuffles the slots and goes back to aim after feedback; no star is taken', () => {
    const { round, events } = treffer();
    const before = round.state().taskState.slots;
    bomb(round, 'wrong');
    expect(round.state()).toMatchObject({ phase: 'feedback', bombsLeft: 9, misses: 1, stars: 0 });
    expect(events.find((e) => e.type === 'slotsShuffled')).toEqual({ type: 'slotsShuffled', slots: [...before.slice(1), before[0]] });
    round.next();
    expect(round.state().phase).toBe('aim');
    expect(round.state().taskIndex).toBe(1);
  });

  it('opens help step 1 by itself after 2 misses and the next step after each further miss (FR-034)', () => {
    const { round, events } = treffer();
    bomb(round, 'wrong');
    round.next();
    expect(events.some((e) => e.type === 'helpOpened')).toBe(false);
    bomb(round, 'wrong');
    expect(events.filter((e) => e.type === 'helpOpened')).toEqual([{ type: 'helpOpened', step: 1, auto: true }]);
    round.next();
    bomb(round, 'wrong');
    expect(round.state().helpStep).toBe(2);
    round.next();
    bomb(round, 'right');
    const recorded = events.find((e) => e.type === 'attemptRecorded');
    expect(recorded).toMatchObject({ record: { outcome: 'withHelp', helpStep: 2, misses: 3 } });
    expect(round.state().stars).toBe(1);
  });

  it('counts a hit on any right index (several rightIndexes)', () => {
    const rules: typeof trefferRules = { ...trefferRules, createTask: (r) => ({ ...trefferRules.createTask(r), right: [0, 2] }) };
    const round = new RoundController({ rules, settings: settings(), progress: emptyProgress(), seed: 1, now: () => 0 });
    const slotOf2 = round.state().taskState.slots.indexOf(2);
    round.tapChoice(slotOf2);
    round.landBomb();
    expect(round.state().hits).toBe(1);
  });

  it('lands the bomb by itself after the pass time plus 1 second of play time, not while paused (R18)', () => {
    const { round, clock: c } = treffer();
    round.tapChoice(slotsOf(round).right);
    c.advance(1000);
    round.pause();
    c.advance(60_000);
    round.tick();
    expect(round.state().phase).toBe('paused');
    round.resume();
    expect(round.state().phase).toBe('pass');
    c.advance(PASS_MS + FALLBACK_MS - 1000 - 1);
    round.tick();
    expect(round.state().phase).toBe('pass');
    c.advance(1);
    round.tick();
    expect(round.state().phase).toBe('celebrate');
  });

  it('ends after the last bomb with the summary and a new best keyed treffer:<bombs> (R16)', () => {
    const { round, events } = treffer({ settings: settings((x) => (x.round.bombs = 5)) });
    bomb(round, 'wrong');
    round.next();
    for (let i = 0; i < 4; i++) {
      bomb(round, 'right');
      round.next();
    }
    expect(round.state().phase).toBe('ended');
    const ended = events.find((e) => e.type === 'roundEnded');
    expect(ended).toMatchObject({ summary: { mode: 'treffer', quit: false, hits: 4, bombsTotal: 5, newRecord: true, best: 4, records: { best: { 'treffer:5': 4 } } } });
    expect(round.toStored()).toBeNull();
    round.tapChoice(0);
    expect(round.state().phase).toBe('ended');
  });

  it('a round that ends with a miss goes from feedback to ended', () => {
    const { round } = treffer({ settings: settings((x) => (x.round.bombs = 5)) });
    for (let i = 0; i < 5; i++) {
      bomb(round, 'wrong');
      round.next();
    }
    expect(round.state()).toMatchObject({ phase: 'ended', bombsLeft: 0, hits: 0 });
  });

  it('raises the level after 3 tasks solved alone and names it (FR-030)', () => {
    const { round, events } = treffer();
    for (let i = 0; i < 3; i++) {
      bomb(round, 'right');
      round.next();
    }
    expect(events.find((e) => e.type === 'levelUp')).toEqual({ type: 'levelUp', level: 2, name: 'Formen' });
    expect(round.state().level).toBe(2);
  });

  it('lowers the level after 2 of 3 tasks with help and says nothing about it (FR-030)', () => {
    const progress = emptyProgress();
    progress.levels.treffer = 2;
    const { round, events } = treffer({ progress });
    expect(round.state().level).toBe(2);
    for (let i = 0; i < 2; i++) {
      // A miss first makes the task count as solved with help.
      bomb(round, 'wrong');
      round.next();
      bomb(round, 'right');
      round.next();
    }
    expect(round.state().level).toBe(1);
    expect(events.some((e) => e.type === 'levelUp')).toBe(false);
  });

  it('never lowers the level below the parent start level (FR-031)', () => {
    const progress = emptyProgress();
    progress.levels.treffer = 3;
    const { round } = treffer({ progress, settings: settings((x) => (x.levels.treffer = { start: 3, hardest: 5 })) });
    for (let i = 0; i < 3; i++) {
      bomb(round, 'wrong');
      round.next();
      bomb(round, 'right');
      round.next();
    }
    expect(round.state().level).toBe(3);
  });

  it('ignores "Bauen und Malen" inputs and "Fertig"', () => {
    const { round, events } = treffer();
    round.typeHeight(0, 0, 2);
    round.done();
    expect(events).toEqual([]);
  });

  it('makes the same tasks for the same seed', () => {
    const a = treffer({ seed: 99 }).round;
    const b = treffer({ seed: 99 }).round;
    expect(b.state().task).toEqual(a.state().task);
    expect(b.state().taskState).toEqual(a.state().taskState);
  });
});

// ---- "Bauen und Malen" -----------------------------------------------------------------------------------------

describe('RoundController in "Bauen und Malen"', () => {
  it('passes inputs to the rules and reports crates', () => {
    const { round, events } = bauen();
    round.typeHeight(0, 1, 2);
    expect(round.state().taskState.values).toEqual([0, 2]);
    // The crates first, then the note that the task state changed, so views and the overlay redraw.
    expect(events).toEqual([{ type: 'cratesChanged', row: 0, col: 1, from: 0, to: 2 }, { type: 'inputApplied' }]);
  });

  it('a wrong "Fertig" marks, counts a miss and stays on the task; an input clears its mark', () => {
    const { round, events } = bauen();
    round.typeHeight(0, 1, 2);
    round.done();
    expect(round.state()).toMatchObject({ phase: 'check', misses: 1, marked: ['0'] });
    expect(events.find((e) => e.type === 'checked')).toEqual({ type: 'checked', right: false, marked: ['0'] });
    round.typeHeight(0, 0, 1);
    expect(round.state()).toMatchObject({ phase: 'aim', marked: [] });
    round.done();
    expect(round.state()).toMatchObject({ phase: 'celebrate', tasksDone: 1, solvedAlone: 0, stars: 3 });
  });

  it('a task right on the first "Fertig" without help counts as solved alone, with 3 stars', () => {
    const { round, events } = bauen();
    round.typeHeight(0, 0, 1);
    round.typeHeight(0, 1, 2);
    round.done();
    expect(round.state()).toMatchObject({ tasksDone: 1, solvedAlone: 1, stars: 3 });
    expect(events.find((e) => e.type === 'attemptRecorded')).toMatchObject({ record: { outcome: 'alone', kind: 'bauen' } });
  });

  it('a help step before the right answer makes it withHelp; no stars after step 3 with "Punkt nach voller Hilfe" off', () => {
    const { round, events } = bauen({ settings: settings((x) => (x.pointAfterFullHelp = false)) });
    round.help();
    round.help();
    round.help();
    round.help();
    expect(round.state().helpStep).toBe(3);
    expect(events.filter((e) => e.type === 'helpOpened').map((e) => (e as { step: number }).step)).toEqual([1, 2, 3]);
    round.typeHeight(0, 0, 1);
    round.typeHeight(0, 1, 2);
    round.done();
    expect(round.state()).toMatchObject({ phase: 'celebrate', stars: 0, solvedAlone: 0 });
    expect(events.some((e) => e.type === 'starsAwarded')).toBe(false);
  });

  it('ends after round.tasks tasks with a best keyed bauenMalen:<tasks> of tasks solved alone', () => {
    const { round, events } = bauen();
    for (let i = 0; i < 3; i++) {
      round.typeHeight(0, 0, 1);
      round.typeHeight(0, 1, 2);
      round.done();
      round.next();
    }
    expect(round.state().phase).toBe('ended');
    expect(events.find((e) => e.type === 'roundEnded')).toMatchObject({
      summary: { mode: 'bauenMalen', tasksDone: 3, tasksTotal: 3, solvedAlone: 3, stars: 9, newRecord: true, records: { best: { 'bauenMalen:3': 3 } } },
    });
  });

  it('ignores bomb taps', () => {
    const { round, events } = bauen();
    round.tapChoice(0);
    round.landBomb();
    expect(events).toEqual([]);
  });
});

// ---- both modes ------------------------------------------------------------------------------------------------

describe('RoundController: pause, time, settings and storage', () => {
  it('counts play time only while not paused and not hidden, also in the attempt time', () => {
    const { round, events, clock: c } = treffer();
    c.advance(1000);
    round.pause();
    c.advance(5000);
    expect(round.state().elapsedMs).toBe(1000);
    round.resume();
    c.advance(500);
    round.setHidden(true);
    c.advance(9000);
    round.setHidden(false);
    c.advance(500);
    expect(round.state().elapsedMs).toBe(2000);
    bomb(round, 'right');
    expect(events.find((e) => e.type === 'attemptRecorded')).toMatchObject({ record: { ms: 2000 } });
  });

  it('pause returns to the phase it came from and ignores taps meanwhile', () => {
    const { round } = treffer();
    round.pause();
    round.tapChoice(slotsOf(round).right);
    expect(round.state().phase).toBe('paused');
    round.resume();
    expect(round.state().phase).toBe('aim');
  });

  it('help is ignored during a pass and stops at step 3', () => {
    const { round } = treffer();
    round.tapChoice(0);
    round.help();
    expect(round.state().helpStep).toBe(0);
  });

  it('quit ends the round without comparing bests', () => {
    const records = { ...emptyRecords(), best: { 'treffer:10': 3 } };
    const round = new RoundController({ rules: trefferRules, settings: settings(), progress: emptyProgress(), records, seed: 1, now: () => 0 });
    const events: RoundEvent[] = [];
    round.subscribe((e) => events.push(e));
    bomb(round as RoundController<ChoiceTask, SlotState>, 'right');
    round.quit();
    expect(events.find((e) => e.type === 'roundEnded')).toMatchObject({ summary: { quit: true, newRecord: false, best: 3, records } });
  });

  it('applySettings keeps the round length and shapes the next task (FR-054)', () => {
    const { round } = treffer();
    round.applySettings(settings((x) => {
      x.round.bombs = 20;
      x.levels.treffer = { start: 2, hardest: 2 };
    }));
    expect(round.state().bombsTotal).toBe(10);
    expect(round.state().task.kind).toBe('koerper');
    bomb(round, 'right');
    round.next();
    expect(round.state().task).toMatchObject({ kind: 'formen', level: 2 });
  });

  it('saves the round and continues it after a refresh: task, slots, misses, help, bombs and time', () => {
    const { round, clock: c } = treffer();
    c.advance(3000);
    bomb(round, 'wrong');
    bomb(round, 'wrong'); // ignored: feedback
    round.next();
    round.help();
    const stored = round.toStored()!;
    const parsed = roundSchema.parse(JSON.parse(JSON.stringify(stored)));
    const later = clock(5_000_000);
    const again = new RoundController({ rules: trefferRules, settings: settings(), progress: emptyProgress(), seed: 5, now: later.now, stored: parsed });
    expect(again.restored).toBe(true);
    const a = round.state();
    const b = again.state();
    expect(b).toMatchObject({ phase: 'aim', task: a.task, taskState: a.taskState, misses: 1, helpStep: 1, bombsLeft: 9, taskIndex: 1, elapsedMs: 3000 });
    later.advance(250);
    expect(again.state().elapsedMs).toBe(3250);
  });

  it('a stored round in the air continues at aim without spending the bomb; a solved one at celebrate', () => {
    const { round } = treffer();
    round.tapChoice(slotsOf(round).right);
    const inAir = new RoundController({ rules: trefferRules, settings: settings(), progress: emptyProgress(), seed: 5, now: () => 0, stored: round.toStored() });
    expect(inAir.state()).toMatchObject({ phase: 'aim', bombsLeft: 10 });
    round.landBomb();
    const solved = new RoundController({ rules: trefferRules, settings: settings(), progress: emptyProgress(), seed: 5, now: () => 0, stored: round.toStored() });
    expect(solved.state()).toMatchObject({ phase: 'celebrate', hits: 1, stars: 1 });
    solved.next();
    expect(solved.state().taskIndex).toBe(2);
  });

  it('discards a stored round that no longer fits the mode or the settings', () => {
    const { round } = treffer();
    const stored = round.toStored()!;
    const noKind = new RoundController({ rules: trefferRules, settings: settings((x) => (x.kinds.koerper = false)), progress: emptyProgress(), seed: 6, now: () => 0, stored });
    expect(noKind.restored).toBe(false);
    expect(noKind.state().task.kind).not.toBe('koerper');
    const otherMode = new RoundController({ rules: bauenRules, settings: settings(), progress: emptyProgress(), seed: 6, now: () => 0, stored });
    expect(otherMode.restored).toBe(false);
  });

  it('hands out the last bomb as a copy and the task read-only', () => {
    const { round } = treffer();
    round.tapChoice(slotsOf(round).right);
    const view = round.state();
    expect(view.lastBomb).not.toBeNull();
    (view.lastBomb as { hit: boolean }).hit = !view.lastBomb!.hit;
    expect(round.state().lastBomb!.hit).not.toBe(view.lastBomb!.hit);
    // Only typed, never called: the task a view reads is deeply read-only, so tsc rejects the change.
    const change = () => {
      // @ts-expect-error `right` is a read-only array in the view.
      view.task.right.push(9);
    };
    expect(change).toBeTypeOf('function');
  });

  it('continues a stored round with its own seed when the page gives another one', () => {
    const { round } = treffer({ seed: 5 });
    const stored = round.toStored()!;
    const again = new RoundController({ rules: trefferRules, settings: settings(), progress: emptyProgress(), seed: 77, now: () => 0, stored });
    expect(again.restored).toBe(true);
    expect(again.state().task).toEqual(round.state().task);
    expect(again.toStored()!.seed).toBe(5);
  });

  it('warns and starts a new round when a stored round cannot be rebuilt', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const { round } = treffer();
      const broken: typeof trefferRules = {
        ...trefferRules,
        restoreState: () => {
          throw new Error('broken state');
        },
      };
      const again = new RoundController({ rules: broken, settings: settings(), progress: emptyProgress(), seed: 6, now: () => 0, stored: round.toStored() });
      expect(again.restored).toBe(false);
      expect(again.toStored()!.seed).toBe(6);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('stored round could not be continued'), expect.any(Error));
    } finally {
      warn.mockRestore();
    }
  });

  it('restores the marks of a wrong "Fertig" in "Bauen und Malen"', () => {
    const { round } = bauen();
    round.typeHeight(0, 1, 2);
    round.done();
    const again = new RoundController({ rules: bauenRules, settings: settings((x) => (x.round.tasks = 3)), progress: emptyProgress(), seed: 5, now: () => 0, stored: round.toStored() });
    expect(again.state()).toMatchObject({ phase: 'check', marked: ['0'], misses: 1, taskState: { values: [0, 2] } });
  });
});
