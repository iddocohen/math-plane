// The data of the progress page (FR-048, FR-049): rows per mode, level, kind and side, and the personal bests.
import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../settings/defaults';
import { emptyProgress, emptyRecords, type AttemptRecord, type Progress } from '../storage/schemas';
import { TASK_KINDS, type Outcome } from '../types';
import { recordAttempt } from './adaptive';
import { parseRecordKey, summarize } from './summarize';

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

function played(records: AttemptRecord[], settings = defaultSettings()): Progress {
  return records.reduce((p, a) => recordAttempt(p, a, settings), emptyProgress());
}

describe('summarize (FR-048, FR-049)', () => {
  it('lists every level and kind of each ladder in order, with zero counts before any attempt', () => {
    const s = summarize(emptyProgress(), emptyRecords(), defaultSettings());
    expect(s.empty).toBe(true);
    const [treffer, bauenMalen] = s.modes;
    expect(treffer!.mode).toBe('treffer');
    expect(treffer!.level).toBe(1);
    expect(treffer!.levels.map((r) => `${r.level}:${r.kind}`)).toEqual(['1:koerper', '2:formen', '3:bauplanFinden', '4:ansichtFinden', '5:ansichtFinden']);
    expect(bauenMalen!.levels.map((r) => `${r.level}:${r.kind}`)).toEqual(['1:bauen', '2:bauen', '3:malen', '4:malen', '5:maleAn', '5:malen']);
    expect(treffer!.levels.every((r) => r.alone === 0 && r.withHelp === 0 && !r.mastered)).toBe(true);
  });

  it('lists every side of the view kinds of each mode', () => {
    const s = summarize(emptyProgress(), emptyRecords(), defaultSettings());
    expect(s.modes[0]!.sides.map((r) => `${r.kind}:${r.side}`)).toEqual(['ansichtFinden:vorn', 'ansichtFinden:oben', 'ansichtFinden:rechts', 'ansichtFinden:links']);
    expect(s.modes[1]!.sides.map((r) => `${r.kind}:${r.side}`)).toEqual([
      'malen:vorn',
      'malen:oben',
      'malen:rechts',
      'malen:links',
      'maleAn:vorn',
      'maleAn:oben',
      'maleAn:rechts',
      'maleAn:links',
    ]);
  });

  it('counts tasks solved alone and with help per level, kind and side', () => {
    const p = played([
      attempt('alone'),
      attempt('withHelp'),
      attempt('alone', { kind: 'ansichtFinden', level: 4, side: 'rechts' }),
      attempt('withHelp', { kind: 'ansichtFinden', level: 5, side: 'rechts' }),
      attempt('alone', { mode: 'bauenMalen', kind: 'maleAn', level: 5, side: 'oben' }),
    ]);
    const s = summarize(p, emptyRecords(), defaultSettings());
    expect(s.empty).toBe(false);
    const [treffer, bauenMalen] = s.modes;
    expect(treffer!.levels[0]).toMatchObject({ level: 1, kind: 'koerper', alone: 1, withHelp: 1 });
    expect(treffer!.levels[3]).toMatchObject({ level: 4, kind: 'ansichtFinden', alone: 1, withHelp: 0 });
    expect(treffer!.levels[4]).toMatchObject({ level: 5, kind: 'ansichtFinden', alone: 0, withHelp: 1 });
    expect(treffer!.sides.find((r) => r.side === 'rechts')).toEqual({ kind: 'ansichtFinden', side: 'rechts', alone: 1, withHelp: 1 });
    expect(bauenMalen!.sides.find((r) => r.kind === 'maleAn' && r.side === 'oben')).toMatchObject({ alone: 1, withHelp: 0 });
    expect(bauenMalen!.levels[4]).toMatchObject({ level: 5, kind: 'maleAn', alone: 1 });
  });

  it('marks a kind mastered after 10 attempts with 8 alone, on every level row of that kind', () => {
    const s = defaultSettings();
    s.adaptive = false;
    const outcomes: Outcome[] = ['withHelp', 'withHelp', 'alone', 'alone', 'alone', 'alone', 'alone', 'alone', 'alone', 'alone'];
    const p = played(
      outcomes.map((o, i) => attempt(o, { kind: 'ansichtFinden', level: i % 2 === 0 ? 4 : 5, side: 'vorn' })),
      s,
    );
    const rows = summarize(p, emptyRecords(), s).modes[0]!.levels;
    expect(rows.filter((r) => r.kind === 'ansichtFinden').map((r) => r.mastered)).toEqual([true, true]);
    expect(rows.find((r) => r.kind === 'koerper')!.mastered).toBe(false);
  });

  it('gives the current level within the parent range, and null when every kind of the mode is off', () => {
    const p = emptyProgress();
    p.levels.treffer = 1;
    const s = defaultSettings();
    s.levels.treffer = { start: 3, hardest: 5 };
    for (const kind of TASK_KINDS) if (['bauen', 'malen', 'maleAn'].includes(kind)) s.kinds[kind] = false;
    const summary = summarize(p, emptyRecords(), s);
    expect(summary.modes[0]!.level).toBe(3);
    expect(summary.modes[1]!.level).toBeNull();
  });

  it('lists the personal bests, "Treffer" first, by round length, and skips unknown keys', () => {
    const records = emptyRecords();
    records.best['bauenMalen:5'] = 4;
    records.best['treffer:15'] = 12;
    records.best['treffer:10'] = 8;
    records.best['other:3'] = 1;
    expect(summarize(emptyProgress(), records, defaultSettings()).bests).toEqual([
      { mode: 'treffer', length: 10, best: 8 },
      { mode: 'treffer', length: 15, best: 12 },
      { mode: 'bauenMalen', length: 5, best: 4 },
    ]);
  });

  it('parses record keys', () => {
    expect(parseRecordKey('treffer:10')).toEqual({ mode: 'treffer', length: 10 });
    expect(parseRecordKey('bauenMalen:3')).toEqual({ mode: 'bauenMalen', length: 3 });
    expect(parseRecordKey('treffer:')).toBeNull();
  });
});
