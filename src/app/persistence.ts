// Adapted from math-soccer src/app/persistence.ts: the Hangar instead of the locker room, no cup, levels per mode, and
// the running round loaded and saved here too.
/**
 * Browser persistence for settings, progress, personal bests, the Hangar and the running round (FR-052, FR-053).
 * Loads them once and keeps the current values in memory, so the game reads them without parsing storage again.
 * Every save goes to storage at once; a failed save keeps the value for this session and reports `ok: false`.
 *
 * The Hangar has its own key, so "Fortschritt zurücksetzen" never touches the stars.
 *
 * Keeping the child's progress (as math-soccer amendment 01):
 * - Data from a newer version of the game is never saved over in this session, nor is damaged data whose copy under
 *   `<key>.unreadable` could not be written (storage.ts keeps that copy when it loads).
 * - `backups()` names the kinds whose kept copy this version can read; `restoreBackups()` saves those copies as the
 *   current data, all or none, and removes the copies.
 * - `resetAll()` ("Alles zurücksetzen") saves empty progress, personal bests and Hangar, all or none, and then removes
 *   the running round; the settings stay.
 * - When a save of several kinds fails and the old text cannot be written back either, the result says `partial: true`.
 * - `resetReasons()` names the kinds that were reset on load, for the notice on the start screen.
 *
 * The running round (`mathplane.round.v1`) is kept apart from the four data kinds: it is not exported, has no kept
 * copy to restore (a damaged round is dropped on load), and a failed save only loses the round on refresh.
 */
import { levelRaised, recordAttempt as addAttempt } from '../core/progress/adaptive';
import { award } from '../core/rewards/hangar';
import type { Settings } from '../core/settings/schema';
import { exportData, importData, type ImportResult, type SaveData } from '../core/storage/exportImport';
import type { KeyValue } from '../core/storage/keyValue';
import {
  emptyHangar,
  emptyProgress,
  emptyRecords,
  type AttemptRecord,
  type Hangar,
  type Progress,
  type Records,
  type StoredRound,
} from '../core/storage/schemas';
import {
  clearRound,
  HANGAR,
  load,
  loadRound,
  PROGRESS,
  RECORDS,
  saveRound,
  SETTINGS,
  unreadableKey,
  type ResetReason,
  type StoredKind,
} from '../core/storage/storage';
import type { Level } from '../core/types';

/** The kinds of stored data, each under its own `mathplane.` key; the running round is kept apart. */
export type DataKind = 'settings' | 'progress' | 'records' | 'hangar';

const DATA_ORDER: DataKind[] = ['settings', 'progress', 'records', 'hangar'];

/**
 * The result of a save. `partial` is true when a save of several kinds failed and some keys still hold the new text,
 * because writing back the old text failed too.
 */
export interface SaveResult {
  ok: boolean;
  partial?: boolean;
}

/** The values of every kind of data, as the session holds them. */
type Values = { settings: Settings; progress: Progress; records: Records; hangar: Hangar };

const KINDS: { [K in DataKind]: StoredKind<Values[K]> } = { settings: SETTINGS, progress: PROGRESS, records: RECORDS, hangar: HANGAR };

/**
 * The copies under `<key>.unreadable`, seen under the usual keys, so the usual loader reads them. Writing through this
 * view is refused.
 */
function keptCopies(kv: KeyValue): KeyValue {
  const refuse = () => {
    throw new Error('kept copies are read only');
  };
  return { get: (key) => kv.get(unreadableKey(key)), set: refuse, remove: refuse };
}

export interface Persistence {
  settings(): Settings;
  progress(): Progress;
  records(): Records;
  hangar(): Hangar;
  /** The round saved before a refresh, or null. */
  round(): StoredRound | null;
  saveSettings(s: Settings): { ok: boolean };
  /**
   * Adds one finished task to the progress, moving the mode's level for the settings in use, and saves; `levelUp` is a
   * level it raised to.
   */
  recordAttempt(record: AttemptRecord, settings: Settings): { ok: boolean; levelUp: Level | null };
  /** Empties the progress; the stars and the personal bests stay. */
  resetProgress(): { ok: boolean };
  /** Adds stars earned in a round to the Hangar and saves (FR-044). */
  awardStars(n: number): { ok: boolean };
  /** The Hangar after a purchase or a choice. */
  saveHangar(h: Hangar): { ok: boolean };
  /** Personal bests changed by the round end. */
  saveRecords(r: Records): { ok: boolean };
  /** Saves the running round, or removes it with null (the round ended or was left). */
  saveRound(r: StoredRound | null): { ok: boolean };
  /** The export file for "Daten sichern" (FR-053). */
  exportText(now?: Date): string;
  /** Reads an export file for "Daten laden"; stores everything, or nothing when the file is refused. */
  importText(text: string): ImportResult;
  /** The data a transfer link carries. */
  saveData(): SaveData;
  /** Takes over a transferred save: all four kinds are stored, or the old ones are put back (`partial` when that failed). */
  applyTransfer(data: SaveData): SaveResult;
  /** "Alles zurücksetzen": saves empty progress, personal bests and Hangar, all or none; the settings stay. */
  resetAll(): SaveResult;
  /** The kinds of data with a kept copy under `<key>.unreadable` that this version can read, in the usual order. */
  backups(): DataKind[];
  /**
   * "Kopie wiederherstellen": saves the copies of `backups()` as the current data, all or none, and removes the copies.
   * `ok: false` when there is nothing to restore or the save fails; then nothing changes.
   */
  restoreBackups(): SaveResult;
  /** The kinds of data that were reset on load and why, in the usual order; empty when none was. */
  resetReasons(): Array<{ kind: DataKind; reason: Exclude<ResetReason, 'none'> }>;
}

export function createPersistence(kv: KeyValue): Persistence {
  const loaded = {
    settings: load(kv, SETTINGS),
    progress: load(kv, PROGRESS),
    records: load(kv, RECORDS),
    hangar: load(kv, HANGAR),
  };
  const values: Values = {
    settings: loaded.settings.value,
    progress: loaded.progress.value,
    records: loaded.records.value,
    hangar: loaded.hangar.value,
  };
  let round: StoredRound | null = loadRound(kv).value;

  // Kinds of data that are never saved over in this session: data from a newer version, and damaged data whose copy
  // under `<key>.unreadable` could not be written.
  const kept = new Set<DataKind>();
  for (const kind of DATA_ORDER) {
    const reason = loaded[kind].resetReason;
    if (reason === 'newer') kept.add(kind);
    if (reason !== 'invalid') continue;
    try {
      if (kv.get(unreadableKey(KINDS[kind].key)) !== kv.get(KINDS[kind].key)) kept.add(kind);
    } catch {
      kept.add(kind);
    }
  }

  /**
   * Saves the given kinds of data, all or none. On success the session takes the new values; when any write fails or
   * a kind is kept, the keys written so far get their old text back and nothing changes.
   */
  function save(next: Partial<Values>): SaveResult {
    const kinds = DATA_ORDER.filter((kind) => next[kind] !== undefined);
    if (kinds.some((kind) => kept.has(kind))) return { ok: false };
    const written: Array<{ key: string; old: string | null }> = [];
    try {
      for (const kind of kinds) {
        const key = KINDS[kind].key;
        const old = kinds.length > 1 ? kv.get(key) : null;
        kv.set(key, JSON.stringify(next[kind]));
        written.push({ key, old });
      }
    } catch {
      let partial = false;
      for (const { key, old } of written.reverse()) {
        try {
          if (old === null) kv.remove(key);
          else kv.set(key, old);
        } catch {
          // Storage refuses even the old text: this key keeps the new text. The session keeps its old values.
          partial = true;
        }
      }
      return partial ? { ok: false, partial: true } : { ok: false };
    }
    Object.assign(values, next);
    return { ok: true };
  }

  /** Saves one kind of data during play: the value applies for this session even when the write fails. */
  function saveOne<K extends DataKind>(kind: K, value: Values[K]): { ok: boolean } {
    const r = save({ [kind]: value } as Partial<Values>);
    values[kind] = value;
    return r;
  }

  /** The kept copies this version can read: valid, and not from a newer version. */
  function readableCopies(): Partial<Values> {
    const copies = keptCopies(kv);
    const found: Partial<Values> = {};
    for (const kind of DATA_ORDER) {
      let raw: string | null;
      try {
        raw = kv.get(unreadableKey(KINDS[kind].key));
      } catch {
        continue;
      }
      if (raw === null) continue;
      // Loading through the read-only view cannot write another copy; a refused write is caught in storage.ts.
      const r = load(copies, KINDS[kind] as StoredKind<unknown>);
      if (r.resetReason === 'none') (found as Record<DataKind, unknown>)[kind] = r.value;
    }
    return found;
  }

  const saveData = (): SaveData => ({ ...values });

  return {
    settings: () => values.settings,
    progress: () => values.progress,
    records: () => values.records,
    hangar: () => values.hangar,
    round: () => round,
    saveSettings: (s) => saveOne('settings', structuredClone(s)),
    recordAttempt(record, inUse) {
      const before = values.progress;
      const after = addAttempt(before, record, inUse);
      return { ...saveOne('progress', after), levelUp: levelRaised(before, after, record.mode, inUse) };
    },
    resetProgress: () => saveOne('progress', emptyProgress()),
    awardStars: (n) => saveOne('hangar', award(values.hangar, n)),
    saveHangar: (h) => saveOne('hangar', structuredClone(h)),
    saveRecords: (r) => saveOne('records', r),
    saveRound(r) {
      round = r === null ? null : structuredClone(r);
      return r === null ? clearRound(kv) : saveRound(kv, r);
    },
    exportText: (now = new Date()) => exportData(saveData(), now),
    importText(text) {
      const r = importData(text);
      if (!r.ok) return r;
      const data: Values = { settings: r.settings, progress: r.progress, records: r.records, hangar: r.hangar };
      const saved = save(structuredClone(data));
      if (saved.ok) return r;
      return { ok: false, reason: saved.partial ? 'storePartial' : 'storeFailed' };
    },
    saveData,
    applyTransfer: (data) => save(structuredClone({ settings: data.settings, progress: data.progress, records: data.records, hangar: data.hangar })),
    resetAll() {
      const r = save({ progress: emptyProgress(), records: emptyRecords(), hangar: emptyHangar() });
      if (r.ok) {
        // The running round would bring back stars and levels of the old data.
        round = null;
        clearRound(kv);
      }
      return r;
    },
    backups() {
      const copies = readableCopies();
      return DATA_ORDER.filter((kind) => copies[kind] !== undefined);
    },
    restoreBackups() {
      const copies = readableCopies();
      const kinds = DATA_ORDER.filter((kind) => copies[kind] !== undefined);
      if (kinds.length === 0) return { ok: false };
      const r = save(copies);
      if (!r.ok) return r;
      for (const kind of kinds) {
        try {
          kv.remove(unreadableKey(KINDS[kind].key));
        } catch {
          // The data is restored; a copy left behind is offered again, and restoring it twice changes nothing.
        }
      }
      return r;
    },
    resetReasons: () =>
      DATA_ORDER.flatMap((kind) => {
        const reason = loaded[kind].resetReason;
        return reason === 'none' ? [] : [{ kind, reason }];
      }),
  };
}
