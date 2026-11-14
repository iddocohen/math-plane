// Adapted from math-soccer src/core/progress/adaptive.test.ts: levels per mode, `alone` and `withHelp`, counters by
// kind, level and side (research R10, R12).
import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../settings/defaults';
import type { Settings } from '../settings/schema';
import { emptyProgress, type AttemptRecord, type Progress } from '../storage/schemas';
import type { Level, Mode, Outcome } from '../types';
import { kindKey, kindMastered, levelKey, levelRaised, MAX_ATTEMPTS, recordAttempt, sideKey } from './adaptive';
import { isMastered } from './mastery';
import { outcomeOf } from './outcome';

function attempt(outcome: Outcome, over: Partial<AttemptRecord> = {}): AttemptRecord {
  return {
    mode: 'treffer',
    kind: 'koerper',
    level: 1,
    outcome,
    helpStep: outcome === 'alone' ? 0 : 1,
    misses: 0,
    ms: 4000,
    at: '2026-11-14T10:00:00.000Z',
    ...over,
  };
}

function settings(change: (s: Settings) => void = () => {}): Settings {
  const s = defaultSettings();
  change(s);
  return s;
}

/** Plays `outcomes` at the mode's current level each time. */
function play(p: Progress, outcomes: Outcome[], s: Settings, mode: Mode = 'treffer'): Progress {
  return outcomes.reduce((acc, o) => recordAttempt(acc, attempt(o, { mode, level: acc.levels[mode] as Level, kind: mode === 'treffer' ? 'koerper' : 'bauen' }), s), p);
}

const A: Outcome = 'alone';
const H: Outcome = 'withHelp';

describe('outcomeOf (FR-035)', () => {
  it('is alone only when the first try was right and no help step was used', () => {
    expect(outcomeOf(true, 0)).toBe('alone');
    expect(outcomeOf(true, 1)).toBe('withHelp');
    expect(outcomeOf(false, 0)).toBe('withHelp');
    expect(outcomeOf(false, 3)).toBe('withHelp');
  });
});

describe('recordAttempt: the level per mode (FR-030, FR-031, research R10)', () => {
  it('rises one level after 3 current-level tasks in a row solved alone, and starts the row again', () => {
    const s = settings();
    let p = play(emptyProgress(), [A, A], s);
    expect(p.levels.treffer).toBe(1);
    p = play(p, [A], s);
    expect(p.levels.treffer).toBe(2);
    expect(p.recent.treffer).toEqual([]);
    expect(p.levels.bauenMalen).toBe(1);
  });

  it('drops one level when 2 of the last 3 current-level tasks were not alone, and never shows it as raised', () => {
    const s = settings();
    const before: Progress = { ...emptyProgress(), levels: { treffer: 3, bauenMalen: 1 } };
    const after = play(before, [H, A, H], s);
    expect(after.levels.treffer).toBe(2);
    expect(levelRaised(before, after, 'treffer', s)).toBeNull();
  });

  it('reports the raised level', () => {
    const s = settings();
    const before = play(emptyProgress(), [A, A], s);
    const after = play(before, [A], s);
    expect(levelRaised(before, after, 'treffer', s)).toBe(2);
  });

  it('ignores review tasks from lower levels for the row and the level', () => {
    const s = settings();
    let p: Progress = { ...emptyProgress(), levels: { treffer: 3, bauenMalen: 1 } };
    p = recordAttempt(p, attempt(A, { level: 3 }), s);
    p = recordAttempt(p, attempt(H, { level: 1 }), s);
    p = recordAttempt(p, attempt(H, { level: 2 }), s);
    expect(p.levels.treffer).toBe(3);
    expect(p.recent.treffer).toEqual([A]);
    p = recordAttempt(p, attempt(A, { level: 3 }), s);
    p = recordAttempt(p, attempt(A, { level: 3 }), s);
    expect(p.levels.treffer).toBe(4);
  });

  it('stays inside the parent range and skips levels whose kinds are off', () => {
    const top = settings((x) => (x.levels.treffer = { start: 1, hardest: 2 }));
    expect(play({ ...emptyProgress(), levels: { treffer: 2, bauenMalen: 1 } }, [A, A, A], top).levels.treffer).toBe(2);
    const bottom = settings((x) => (x.levels.treffer = { start: 2, hardest: 5 }));
    expect(play({ ...emptyProgress(), levels: { treffer: 2, bauenMalen: 1 } }, [H, H], bottom).levels.treffer).toBe(2);
    const skip = settings((x) => (x.kinds.formen = false));
    expect(play(emptyProgress(), [A, A, A], skip).levels.treffer).toBe(3);
  });

  it('never moves the level with adaptive difficulty off', () => {
    const s = settings((x) => (x.adaptive = false));
    expect(play(emptyProgress(), [A, A, A, A], s).levels.treffer).toBe(1);
  });

  it('keeps the levels of the two modes apart', () => {
    const s = settings();
    const p = play(emptyProgress(), [A, A, A], s, 'bauenMalen');
    expect(p.levels).toEqual({ treffer: 1, bauenMalen: 2 });
  });
});

describe('recordAttempt: counters and attempts (FR-047, FR-048)', () => {
  it('counts per mode:kind:level, mode:kind:side and mode:kind', () => {
    const s = settings();
    let p = recordAttempt(emptyProgress(), attempt(A, { mode: 'bauenMalen', kind: 'malen', level: 3, side: 'rechts' }), s);
    p = recordAttempt(p, attempt(H, { mode: 'bauenMalen', kind: 'malen', level: 3, side: 'oben' }), s);
    expect(p.counts[levelKey('bauenMalen', 'malen', 3)]).toEqual({ alone: 1, withHelp: 1, window: [A, H] });
    expect(p.counts[sideKey('bauenMalen', 'malen', 'rechts')]).toEqual({ alone: 1, withHelp: 0, window: [A] });
    expect(p.counts[sideKey('bauenMalen', 'malen', 'oben')]).toEqual({ alone: 0, withHelp: 1, window: [H] });
    expect(p.counts[kindKey('bauenMalen', 'malen')]).toEqual({ alone: 1, withHelp: 1, window: [A, H] });
    expect(Object.keys(p.counts)).toHaveLength(4);
  });

  it('keeps the newest 2000 attempts and the last 10 outcomes per counter', () => {
    const s = settings((x) => (x.adaptive = false));
    let p = emptyProgress();
    for (let i = 0; i < MAX_ATTEMPTS + 5; i++) p = recordAttempt(p, attempt(i % 2 === 0 ? A : H, { ms: i }), s);
    expect(p.attempts).toHaveLength(2000);
    expect(p.attempts[0]!.ms).toBe(5);
    const c = p.counts[levelKey('treffer', 'koerper', 1)]!;
    expect(c.window).toHaveLength(10);
    expect(c.alone + c.withHelp).toBe(2005);
  });
});

describe('mastery (FR-049, research R12)', () => {
  it('needs 10 outcomes with at least 8 of the last 10 alone', () => {
    expect(isMastered([A, A, A, A, A, A, A, A, A])).toBe(false);
    expect(isMastered([H, H, A, A, A, A, A, A, A, A])).toBe(true);
    expect(isMastered([H, H, H, A, A, A, A, A, A, A])).toBe(false);
    expect(isMastered([H, H, H, H, A, A, A, A, A, A, A, A])).toBe(true);
  });

  it('is decided per mode and kind', () => {
    const s = settings((x) => (x.adaptive = false));
    let p = emptyProgress();
    for (let i = 0; i < 10; i++) p = recordAttempt(p, attempt(A, { kind: 'formen', level: 2 }), s);
    expect(kindMastered(p, 'treffer', 'formen')).toBe(true);
    expect(kindMastered(p, 'treffer', 'koerper')).toBe(false);
  });
});
