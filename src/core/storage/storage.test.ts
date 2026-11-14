// Adapted from math-soccer src/core/storage/storage.test.ts: the mathplane keys, the Hangar, no cup and no baseline.
import { describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '../settings/defaults';
import { exportData, importData, type SaveData } from './exportImport';
import { memoryKeyValue, type KeyValue } from './keyValue';
import { migrate, migrateWith, type MigrationStep } from './migrate';
import { emptyHangar, emptyProgress, emptyRecords, MAX_ATTEMPTS, type AttemptRecord, type StoredRound } from './schemas';
import {
  clearRound,
  DATA_KEYS,
  HANGAR_KEY,
  loadHangar,
  loadProgress,
  loadRecords,
  loadRound,
  loadSettings,
  PROGRESS_KEY,
  RECORDS_KEY,
  requestPersistentStorage,
  ROUND_KEY,
  saveHangar,
  saveProgress,
  saveRecords,
  saveRound,
  saveSettings,
  SETTINGS_KEY,
  unreadableKey,
} from './storage';

/** A stored round at its first task; `over` replaces fields. */
function storedRound(over: Partial<StoredRound> = {}): StoredRound {
  return {
    version: 1,
    mode: 'treffer',
    seed: 1,
    level: 1,
    elapsedMs: 0,
    bombsTotal: 10,
    bombsLeft: 10,
    hits: 0,
    tasksTotal: 0,
    tasksDone: 0,
    solvedAlone: 0,
    stars: 0,
    taskIndex: 1,
    previousKind: null,
    content: { kind: 'koerper', level: 1 },
    solved: false,
    misses: 0,
    helpStep: 0,
    taskStartMs: 0,
    marked: [],
    ruleState: { slots: [2, 0, 1, 3] },
    ...over,
  };
}

function attempt(over: Partial<AttemptRecord> = {}): AttemptRecord {
  return { mode: 'bauenMalen', kind: 'malen', level: 3, side: 'rechts', outcome: 'alone', helpStep: 0, misses: 0, ms: 9000, at: '2026-11-14T10:00:00.000Z', ...over };
}

function throwingKeyValue(): KeyValue {
  const fail = () => {
    throw new Error('blocked');
  };
  return { get: fail, set: fail, remove: fail };
}

describe('storage keys (research R11)', () => {
  it('are the five mathplane keys', () => {
    expect([...DATA_KEYS]).toEqual([
      'mathplane.settings.v1',
      'mathplane.progress.v1',
      'mathplane.records.v1',
      'mathplane.hangar.v1',
      'mathplane.round.v1',
    ]);
  });

  it('save writes under those keys', () => {
    const kv = memoryKeyValue();
    saveSettings(kv, defaultSettings());
    saveProgress(kv, emptyProgress());
    saveRecords(kv, emptyRecords());
    saveHangar(kv, emptyHangar());
    saveRound(kv, storedRound());
    for (const key of DATA_KEYS) expect(kv.get(key)).not.toBeNull();
  });
});

describe('round trip', () => {
  it('keeps every kind unchanged', () => {
    const kv = memoryKeyValue();
    const settings = { ...defaultSettings(), round: { bombs: 15, tasks: 4 }, numberPad: 'always' as const };
    const progress = {
      ...emptyProgress(),
      attempts: [attempt()],
      levels: { treffer: 3 as const, bauenMalen: 2 as const },
      recent: { treffer: ['alone' as const, 'withHelp' as const], bauenMalen: [] },
      counts: { 'bauenMalen:malen:3': { alone: 1, withHelp: 0, window: ['alone' as const] } },
    };
    const records = { version: 1 as const, best: { 'treffer:10': 8, 'bauenMalen:5': 4 } };
    const hangar = { ...emptyHangar(), stars: 12, owned: ['planeColor.blue'], chosen: { ...emptyHangar().chosen, planeColor: 'planeColor.blue' } };
    const round = storedRound({ seed: 42, mode: 'bauenMalen', level: 2, elapsedMs: 61_500, bombsTotal: 0, bombsLeft: 0, tasksTotal: 4, tasksDone: 2 });
    saveSettings(kv, settings);
    saveProgress(kv, progress);
    saveRecords(kv, records);
    saveHangar(kv, hangar);
    saveRound(kv, round);
    expect(loadSettings(kv)).toEqual({ value: settings, resetReason: 'none' });
    expect(loadProgress(kv)).toEqual({ value: progress, resetReason: 'none' });
    expect(loadRecords(kv)).toEqual({ value: records, resetReason: 'none' });
    expect(loadHangar(kv)).toEqual({ value: hangar, resetReason: 'none' });
    expect(loadRound(kv)).toEqual({ value: round, resetReason: 'none' });
  });

  it('clearRound removes the stored round', () => {
    const kv = memoryKeyValue();
    saveRound(kv, storedRound());
    clearRound(kv);
    expect(loadRound(kv)).toEqual({ value: null, resetReason: 'none' });
  });
});

describe('missing key', () => {
  it('gives defaults with resetReason none', () => {
    const kv = memoryKeyValue();
    expect(loadSettings(kv)).toEqual({ value: defaultSettings(), resetReason: 'none' });
    expect(loadProgress(kv)).toEqual({ value: emptyProgress(), resetReason: 'none' });
    expect(loadRecords(kv)).toEqual({ value: emptyRecords(), resetReason: 'none' });
    expect(loadHangar(kv)).toEqual({ value: emptyHangar(), resetReason: 'none' });
    expect(loadRound(kv)).toEqual({ value: null, resetReason: 'none' });
  });

  it('a new player starts at level 1 in both modes with no stars', () => {
    expect(emptyProgress().levels).toEqual({ treffer: 1, bauenMalen: 1 });
    expect(emptyProgress().recent).toEqual({ treffer: [], bauenMalen: [] });
    expect(emptyHangar().stars).toBe(0);
    expect(emptyHangar().owned).toEqual([]);
  });
});

describe('damaged data resets with a reason (FR-052)', () => {
  it('damaged JSON gives defaults with resetReason invalid and keeps the old text', () => {
    const kv = memoryKeyValue({ [SETTINGS_KEY]: '{not json' });
    expect(loadSettings(kv)).toEqual({ value: defaultSettings(), resetReason: 'invalid' });
    expect(kv.get(unreadableKey(SETTINGS_KEY))).toBe('{not json');
  });

  it('schema-invalid data gives defaults with resetReason invalid', () => {
    const kv = memoryKeyValue({
      [PROGRESS_KEY]: JSON.stringify({ version: 1, attempts: 'many' }),
      [HANGAR_KEY]: JSON.stringify({ ...emptyHangar(), stars: -3 }),
      [RECORDS_KEY]: JSON.stringify({ version: 1, best: { 'treffer:10': 2.5 } }),
      [ROUND_KEY]: JSON.stringify({ ...storedRound(), mode: 'penalty' }),
    });
    expect(loadProgress(kv)).toEqual({ value: emptyProgress(), resetReason: 'invalid' });
    expect(loadHangar(kv)).toEqual({ value: emptyHangar(), resetReason: 'invalid' });
    expect(loadRecords(kv)).toEqual({ value: emptyRecords(), resetReason: 'invalid' });
    expect(loadRound(kv)).toEqual({ value: null, resetReason: 'invalid' });
  });

  it('refuses progress with an unknown task kind, a level outside 1 to 5 or too many attempts', () => {
    const load = (p: unknown) => loadProgress(memoryKeyValue({ [PROGRESS_KEY]: JSON.stringify(p) })).resetReason;
    expect(load({ ...emptyProgress(), attempts: [{ ...attempt(), kind: 'cup' }] })).toBe('invalid');
    expect(load({ ...emptyProgress(), levels: { treffer: 6, bauenMalen: 1 } })).toBe('invalid');
    expect(load({ ...emptyProgress(), attempts: Array.from({ length: MAX_ATTEMPTS + 1 }, () => attempt()) })).toBe('invalid');
    expect(load({ ...emptyProgress(), attempts: Array.from({ length: MAX_ATTEMPTS }, () => attempt()) })).toBe('none');
  });

  it('an unreadable round is kept once and its key is cleared, so the next load finds no round', () => {
    const kv = memoryKeyValue({ [ROUND_KEY]: '{not json' });
    expect(loadRound(kv)).toEqual({ value: null, resetReason: 'invalid' });
    expect(kv.get(unreadableKey(ROUND_KEY))).toBe('{not json');
    expect(kv.get(ROUND_KEY)).toBeNull();
    kv.set(unreadableKey(ROUND_KEY), 'older copy');
    expect(loadRound(kv)).toEqual({ value: null, resetReason: 'none' });
    expect(kv.get(unreadableKey(ROUND_KEY))).toBe('older copy');
  });

  it('a round with counts that cannot occur in play is rejected as invalid', () => {
    const impossible: Partial<StoredRound>[] = [
      { bombsTotal: 5, bombsLeft: 6 },
      { bombsTotal: 5, bombsLeft: 0, hits: 6 },
      { mode: 'bauenMalen', bombsTotal: 0, bombsLeft: 0, tasksTotal: 3, tasksDone: 4 },
      { mode: 'bauenMalen', bombsTotal: 0, bombsLeft: 0, tasksTotal: 3, tasksDone: 1, solvedAlone: 2 },
    ];
    for (const over of impossible) {
      const kv = memoryKeyValue({ [ROUND_KEY]: JSON.stringify(storedRound(over)) });
      expect(loadRound(kv), JSON.stringify(over)).toEqual({ value: null, resetReason: 'invalid' });
    }
    const possible = memoryKeyValue({ [ROUND_KEY]: JSON.stringify(storedRound({ bombsTotal: 5, bombsLeft: 2, hits: 3 })) });
    expect(loadRound(possible).resetReason).toBe('none');
  });

  it('a round from a newer version is kept and its key is cleared', () => {
    const text = JSON.stringify({ ...storedRound(), version: 99 });
    const kv = memoryKeyValue({ [ROUND_KEY]: text });
    expect(loadRound(kv)).toEqual({ value: null, resetReason: 'newer' });
    expect(kv.get(unreadableKey(ROUND_KEY))).toBe(text);
    expect(kv.get(ROUND_KEY)).toBeNull();
  });

  it('settings that break a settings rule give defaults with resetReason invalid', () => {
    const bad = { ...defaultSettings(), levels: { treffer: { start: 4, hardest: 2 }, bauenMalen: { start: 1, hardest: 5 } } };
    const kv = memoryKeyValue({ [SETTINGS_KEY]: JSON.stringify(bad) });
    expect(loadSettings(kv)).toEqual({ value: defaultSettings(), resetReason: 'invalid' });
  });

  it('data without a version gives defaults with resetReason invalid', () => {
    const { version: _v, ...noVersion } = defaultSettings();
    void _v;
    const kv = memoryKeyValue({ [SETTINGS_KEY]: JSON.stringify(noVersion) });
    expect(loadSettings(kv).resetReason).toBe('invalid');
  });

  it('data from a newer version of the game gives defaults with resetReason newer', () => {
    const text = JSON.stringify({ ...emptyRecords(), version: 2 });
    const kv = memoryKeyValue({ [RECORDS_KEY]: text });
    expect(loadRecords(kv)).toEqual({ value: emptyRecords(), resetReason: 'newer' });
    expect(kv.get(unreadableKey(RECORDS_KEY))).toBe(text);
  });
});

describe('unavailable storage', () => {
  it('a throwing KeyValue gives defaults with resetReason unavailable', () => {
    expect(loadSettings(throwingKeyValue())).toEqual({ value: defaultSettings(), resetReason: 'unavailable' });
    expect(loadRound(throwingKeyValue())).toEqual({ value: null, resetReason: 'unavailable' });
  });

  it('save and clear return ok false', () => {
    expect(saveSettings(throwingKeyValue(), defaultSettings())).toEqual({ ok: false });
    expect(saveHangar(throwingKeyValue(), emptyHangar())).toEqual({ ok: false });
    expect(clearRound(throwingKeyValue())).toEqual({ ok: false });
  });
});

describe('migrate', () => {
  it('returns version 1 data and non-objects unchanged: no kind has a step yet', () => {
    const s = defaultSettings();
    expect(migrate(s, 'settings')).toBe(s);
    expect(migrate('text', 'progress')).toBe('text');
    expect(migrate([1, 2], 'records')).toEqual([1, 2]);
  });

  it('example: how a future step from version 1 to version 2 runs', () => {
    // A later change would add this step to the kind's list in migrate.ts and raise its schema to version 2.
    const v1ToV2: MigrationStep = (raw) => ({ ...raw, version: 2, trail: 'none' });
    const steps = [v1ToV2];
    expect(migrateWith({ version: 1, stars: 3 }, steps)).toEqual({ version: 2, stars: 3, trail: 'none' });
    // Data already at version 2 runs no step; data without a usable version is left for the schema to refuse.
    const v2 = { version: 2, stars: 3, trail: 'dots' };
    expect(migrateWith(v2, steps)).toBe(v2);
    for (const raw of [{ stars: 3 }, { version: 0 }, { version: 1.5 }, null]) expect(migrateWith(raw, steps)).toBe(raw);
  });
});

describe('requestPersistentStorage', () => {
  it('asks once and reports granted or denied', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    expect(await requestPersistentStorage({ persist, persisted: vi.fn().mockResolvedValue(false) })).toBe('granted');
    expect(persist).toHaveBeenCalledTimes(1);
    expect(await requestPersistentStorage({ persist: vi.fn().mockResolvedValue(false) })).toBe('denied');
  });

  it('does not ask again when the data is already kept', async () => {
    const persist = vi.fn();
    expect(await requestPersistentStorage({ persist, persisted: vi.fn().mockResolvedValue(true) })).toBe('granted');
    expect(persist).not.toHaveBeenCalled();
  });

  it('gives unsupported without the API and failed on an error', async () => {
    expect(await requestPersistentStorage(undefined)).toBe('unsupported');
    expect(await requestPersistentStorage({})).toBe('unsupported');
    expect(await requestPersistentStorage({ persist: vi.fn().mockRejectedValue(new Error('no')) })).toBe('failed');
  });
});

describe('export and import', () => {
  const data = (): SaveData => ({
    settings: { ...defaultSettings(), round: { bombs: 15, tasks: 5 } },
    progress: { ...emptyProgress(), attempts: [attempt()], counts: { 'treffer:koerper:1': { alone: 1, withHelp: 0, window: ['alone'] } } },
    records: { version: 1, best: { 'treffer:15': 11 } },
    hangar: { ...emptyHangar(), stars: 9 },
  });

  it('round-trips all four kinds and stamps the app and the time', () => {
    const text = exportData(data(), new Date('2026-11-14T12:00:00.000Z'));
    const file = JSON.parse(text) as Record<string, unknown>;
    expect(file.app).toBe('math-plane');
    expect(file.exportedAt).toBe('2026-11-14T12:00:00.000Z');
    expect(file).not.toHaveProperty('cup');
    expect(importData(text)).toEqual({ ok: true, ...data() });
  });

  it('refuses text that is not JSON, a file of another app and each invalid part', () => {
    expect(importData('nope')).toEqual({ ok: false, reason: 'notJson' });
    expect(importData('[1]')).toEqual({ ok: false, reason: 'notJson' });
    expect(importData(JSON.stringify({ ...data(), app: 'math-soccer' }))).toEqual({ ok: false, reason: 'wrongApp' });
    const file = (over: Record<string, unknown>) => JSON.stringify({ app: 'math-plane', ...data(), ...over });
    expect(importData(file({ settings: { ...defaultSettings(), round: { bombs: 0, tasks: 5 } } }))).toEqual({ ok: false, reason: 'invalidSettings' });
    expect(importData(file({ progress: null }))).toEqual({ ok: false, reason: 'invalidProgress' });
    expect(importData(file({ records: { version: 1 } }))).toEqual({ ok: false, reason: 'invalidRecords' });
    expect(importData(file({ hangar: { ...emptyHangar(), stars: 1.5 } }))).toEqual({ ok: false, reason: 'invalidHangar' });
  });
});
