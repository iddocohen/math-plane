// Adapted from math-soccer src/app/persistence.test.ts: the Hangar instead of the locker room, no cup, levels per mode
// and the running round.
import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../core/settings/defaults';
import { memoryKeyValue, type KeyValue } from '../core/storage/keyValue';
import { emptyHangar, emptyProgress, emptyRecords, type AttemptRecord, type StoredRound } from '../core/storage/schemas';
import { HANGAR_KEY, PROGRESS_KEY, RECORDS_KEY, ROUND_KEY, SETTINGS_KEY } from '../core/storage/storage';
import { createPersistence } from './persistence';

/** A key-value store whose writes to `keys` fail, as when browser storage is full or blocked. */
function failingKeys(kv: KeyValue, keys: Set<string>): KeyValue {
  return {
    get: (key) => kv.get(key),
    set: (key, value) => {
      if (keys.has(key)) throw new DOMException('quota', 'QuotaExceededError');
      kv.set(key, value);
    },
    remove: (key) => kv.remove(key),
  };
}

const richHangar = () => ({ ...emptyHangar(), stars: 40 });

function storedRound(): StoredRound {
  return {
    version: 1,
    mode: 'bauenMalen',
    seed: 3,
    level: 2,
    elapsedMs: 5000,
    bombsTotal: 0,
    bombsLeft: 0,
    hits: 0,
    tasksTotal: 5,
    tasksDone: 1,
    solvedAlone: 1,
    stars: 3,
    taskIndex: 2,
    previousKind: 'bauen',
    content: { kind: 'bauen', level: 2, plan: { size: 3, minStack: 0, maxStack: 3 } },
    solved: false,
    misses: 0,
    helpStep: 0,
    taskStartMs: 4000,
    marked: [],
    ruleState: { input: [[1, null], [null, 2]] },
  };
}

describe('createPersistence', () => {
  it('saves settings so a new instance on the same store loads them', () => {
    const kv = memoryKeyValue();
    const p = createPersistence(kv);
    expect(p.saveSettings({ ...defaultSettings(), showClock: true })).toEqual({ ok: true });
    expect(createPersistence(kv).settings().showClock).toBe(true);
  });

  it('keeps a value for this session when its save fails', () => {
    const p = createPersistence(failingKeys(memoryKeyValue(), new Set([HANGAR_KEY])));
    expect(p.awardStars(3)).toEqual({ ok: false });
    expect(p.hangar().stars).toBe(3);
  });

  it('records attempts per mode and reports a raised level', () => {
    const p = createPersistence(memoryKeyValue());
    const record: AttemptRecord = { mode: 'bauenMalen', kind: 'bauen', level: 1, outcome: 'alone', helpStep: 0, misses: 0, ms: 4000, at: '2026-11-14T10:00:00.000Z' };
    const levelUps = [0, 1, 2].map(() => p.recordAttempt(record, defaultSettings()).levelUp);
    expect(levelUps).toEqual([null, null, 2]);
    expect(p.progress().levels).toEqual({ treffer: 1, bauenMalen: 2 });
    expect(p.progress().attempts).toHaveLength(3);
  });

  it('saves, loads and removes the running round', () => {
    const kv = memoryKeyValue();
    const p = createPersistence(kv);
    expect(p.round()).toBeNull();
    expect(p.saveRound(storedRound())).toEqual({ ok: true });
    expect(createPersistence(kv).round()).toEqual(storedRound());
    expect(p.saveRound(null)).toEqual({ ok: true });
    expect(kv.get(ROUND_KEY)).toBeNull();
    expect(p.round()).toBeNull();
  });
});

describe('data that could not be loaded is never saved over (math-soccer amendment 01)', () => {
  it('keeps damaged progress under <key>.unreadable and then saves the new progress', () => {
    const kv = memoryKeyValue({ [PROGRESS_KEY]: '{"version":1,"attempts":[' });
    const p = createPersistence(kv);
    expect(kv.get(`${PROGRESS_KEY}.unreadable`)).toBe('{"version":1,"attempts":[');
    expect(p.resetProgress()).toEqual({ ok: true });
    expect(kv.get(`${PROGRESS_KEY}.unreadable`)).toBe('{"version":1,"attempts":[');
    expect(JSON.parse(kv.get(PROGRESS_KEY)!)).toEqual(emptyProgress());
  });

  it('refuses to save over damaged data when its copy cannot be written', () => {
    const inner = memoryKeyValue({ [PROGRESS_KEY]: 'broken' });
    const p = createPersistence(failingKeys(inner, new Set([`${PROGRESS_KEY}.unreadable`])));
    expect(p.resetProgress()).toEqual({ ok: false });
    expect(inner.get(PROGRESS_KEY)).toBe('broken');
  });

  it('never saves over data from a newer version of the game; other data still saves', () => {
    const newer = JSON.stringify({ ...emptyHangar(), version: 5, stars: 40 });
    const kv = memoryKeyValue({ [HANGAR_KEY]: newer });
    const p = createPersistence(kv);
    expect(p.awardStars(3)).toEqual({ ok: false });
    expect(kv.get(HANGAR_KEY)).toBe(newer);
    expect(p.saveSettings({ ...defaultSettings(), showClock: true })).toEqual({ ok: true });
  });
});

describe('restoring kept copies', () => {
  const COPY = `${HANGAR_KEY}.unreadable`;

  it('offers a readable copy and restores it, then removes the copy', () => {
    const kv = memoryKeyValue({ [HANGAR_KEY]: JSON.stringify(emptyHangar()), [COPY]: JSON.stringify(richHangar()) });
    const p = createPersistence(kv);
    expect(p.backups()).toEqual(['hangar']);
    expect(p.restoreBackups()).toEqual({ ok: true });
    expect(p.hangar().stars).toBe(40);
    expect(JSON.parse(kv.get(HANGAR_KEY)!)).toMatchObject({ stars: 40 });
    expect(kv.get(COPY)).toBeNull();
    expect(p.backups()).toEqual([]);
    expect(createPersistence(kv).hangar().stars).toBe(40);
  });

  it('offers settings, progress and records copies the same way, in the usual order', () => {
    const kv = memoryKeyValue({
      [`${PROGRESS_KEY}.unreadable`]: JSON.stringify(emptyProgress()),
      [`${SETTINGS_KEY}.unreadable`]: JSON.stringify(defaultSettings()),
      [`${RECORDS_KEY}.unreadable`]: JSON.stringify(emptyRecords()),
    });
    expect(createPersistence(kv).backups()).toEqual(['settings', 'progress', 'records']);
  });

  it('does not offer a copy this version cannot read, nor one from a newer version', () => {
    const kv = memoryKeyValue({ [COPY]: '{"stars":', [`${PROGRESS_KEY}.unreadable`]: JSON.stringify({ ...emptyProgress(), version: 9 }) });
    const p = createPersistence(kv);
    expect(p.backups()).toEqual([]);
    expect(p.restoreBackups()).toEqual({ ok: false });
    expect(kv.get(COPY)).toBe('{"stars":');
  });

  it('restores all copies or none: a failed write keeps the copies and the current data', () => {
    const inner = memoryKeyValue({
      [HANGAR_KEY]: JSON.stringify(emptyHangar()),
      [COPY]: JSON.stringify(richHangar()),
      [`${PROGRESS_KEY}.unreadable`]: JSON.stringify(emptyProgress()),
    });
    const p = createPersistence(failingKeys(inner, new Set([HANGAR_KEY])));
    expect(p.restoreBackups()).toEqual({ ok: false });
    expect(p.hangar().stars).toBe(0);
    expect(inner.get(PROGRESS_KEY)).toBeNull();
    expect(inner.get(COPY)).not.toBeNull();
    expect(inner.get(`${PROGRESS_KEY}.unreadable`)).not.toBeNull();
  });
});

describe('resetAll ("Alles zurücksetzen")', () => {
  it('saves empty progress, records and Hangar together, removes the running round and keeps the settings', () => {
    const settings = JSON.stringify({ ...defaultSettings(), showClock: true });
    const kv = memoryKeyValue({ [SETTINGS_KEY]: settings, [HANGAR_KEY]: JSON.stringify({ ...emptyHangar(), stars: 5 }), [ROUND_KEY]: JSON.stringify(storedRound()) });
    const p = createPersistence(kv);
    expect(p.round()).not.toBeNull();
    p.saveRecords({ ...emptyRecords(), best: { 'treffer:10': 7 } });
    expect(p.resetAll()).toEqual({ ok: true });
    expect(p.hangar()).toEqual(emptyHangar());
    expect(p.records()).toEqual(emptyRecords());
    expect(p.progress()).toEqual(emptyProgress());
    expect(p.round()).toBeNull();
    expect(kv.get(ROUND_KEY)).toBeNull();
    expect(kv.get(SETTINGS_KEY)).toBe(settings);
    expect(JSON.parse(kv.get(HANGAR_KEY)!)).toMatchObject({ stars: 0 });
  });

  it('changes nothing when one of the writes fails', () => {
    const inner = memoryKeyValue({ [HANGAR_KEY]: JSON.stringify({ ...emptyHangar(), stars: 5 }), [ROUND_KEY]: JSON.stringify(storedRound()) });
    const p = createPersistence(failingKeys(inner, new Set([RECORDS_KEY])));
    expect(p.resetAll()).toEqual({ ok: false });
    expect(p.hangar().stars).toBe(5);
    expect(JSON.parse(inner.get(HANGAR_KEY)!).stars).toBe(5);
    expect(inner.get(ROUND_KEY)).not.toBeNull();
  });
});

/** A store whose writes to `failing` fail, and whose writes of old text back to `stuck` fail too. */
function stuckRollback(kv: KeyValue, failing: string, stuck: string): KeyValue {
  const written = new Set<string>();
  return {
    get: (key) => kv.get(key),
    set: (key, value) => {
      if (key === failing) throw new DOMException('quota', 'QuotaExceededError');
      if (key === stuck && written.has(key)) throw new DOMException('quota', 'QuotaExceededError');
      written.add(key);
      kv.set(key, value);
    },
    remove: (key) => kv.remove(key),
  };
}

describe('a save of several kinds that cannot be undone', () => {
  it('resetAll says partial when the old text cannot be written back', () => {
    const inner = memoryKeyValue({
      [PROGRESS_KEY]: JSON.stringify(emptyProgress()),
      [HANGAR_KEY]: JSON.stringify({ ...emptyHangar(), stars: 5 }),
    });
    const p = createPersistence(stuckRollback(inner, HANGAR_KEY, PROGRESS_KEY));
    expect(p.resetAll()).toEqual({ ok: false, partial: true });
    // The session keeps its old values.
    expect(p.hangar().stars).toBe(5);
  });

  it('a transfer and an import say partial the same way', () => {
    const data = { settings: defaultSettings(), progress: emptyProgress(), records: emptyRecords(), hangar: emptyHangar() };
    const p = createPersistence(stuckRollback(memoryKeyValue({ [SETTINGS_KEY]: JSON.stringify(defaultSettings()) }), HANGAR_KEY, SETTINGS_KEY));
    expect(p.applyTransfer(data)).toEqual({ ok: false, partial: true });
    const text = createPersistence(memoryKeyValue()).exportText();
    const q = createPersistence(stuckRollback(memoryKeyValue({ [SETTINGS_KEY]: JSON.stringify(defaultSettings()) }), HANGAR_KEY, SETTINGS_KEY));
    expect(q.importText(text)).toEqual({ ok: false, reason: 'storePartial' });
  });

  it('a failed save whose old text goes back stays a plain failure', () => {
    const p = createPersistence(failingKeys(memoryKeyValue(), new Set([RECORDS_KEY])));
    expect(p.resetAll()).toEqual({ ok: false });
  });
});

describe('export, import and transfer', () => {
  it('carry the Hangar, progress, records and settings', () => {
    const from = createPersistence(memoryKeyValue());
    from.awardStars(12);
    from.saveRecords({ ...emptyRecords(), best: { 'bauenMalen:5': 4 } });
    const to = createPersistence(memoryKeyValue());
    expect(to.importText(from.exportText()).ok).toBe(true);
    expect(to.hangar().stars).toBe(12);
    expect(to.records().best).toEqual({ 'bauenMalen:5': 4 });
    const other = createPersistence(memoryKeyValue());
    expect(other.applyTransfer(from.saveData())).toEqual({ ok: true });
    expect(other.hangar().stars).toBe(12);
  });
});

describe('resetReasons', () => {
  it('names the kinds reset on load and why, and nothing for clean data', () => {
    expect(createPersistence(memoryKeyValue()).resetReasons()).toEqual([]);
    const kv = memoryKeyValue({
      [PROGRESS_KEY]: '{broken',
      [HANGAR_KEY]: JSON.stringify({ ...emptyHangar(), version: 9 }),
    });
    expect(createPersistence(kv).resetReasons()).toEqual([
      { kind: 'progress', reason: 'invalid' },
      { kind: 'hangar', reason: 'newer' },
    ]);
  });

  it('drops a damaged round without naming it', () => {
    const p = createPersistence(memoryKeyValue({ [ROUND_KEY]: '{broken' }));
    expect(p.round()).toBeNull();
    expect(p.resetReasons()).toEqual([]);
  });
});
