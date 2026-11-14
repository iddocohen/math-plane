// Adapted from math-soccer src/core/storage/storage.ts: the mathplane keys, the Hangar instead of the locker room, no
// cup and no stored data baseline, because Mathe-Flieger has no data from before version 1 (research R11).
import { defaultSettings } from '../settings/defaults';
import type { Settings } from '../settings/schema';
import { isRecord } from '../util';
import type { KeyValue } from './keyValue';
import { migrate, parseSettings, type StoredKindName } from './migrate';
import {
  emptyHangar,
  emptyProgress,
  emptyRecords,
  hangarSchema,
  progressSchema,
  recordsSchema,
  roundSchema,
  type Hangar,
  type Progress,
  type Records,
  type StoredRound,
} from './schemas';

/** Storage keys (data-model.md, research R11). The names keep `.v1`; the version inside the stored value can be higher. */
export const SETTINGS_KEY = 'mathplane.settings.v1';
export const PROGRESS_KEY = 'mathplane.progress.v1';
export const RECORDS_KEY = 'mathplane.records.v1';
export const HANGAR_KEY = 'mathplane.hangar.v1';
export const ROUND_KEY = 'mathplane.round.v1';

/** Every key that holds stored game data; each can have a kept copy under `unreadableKey`. */
export const DATA_KEYS = [SETTINGS_KEY, PROGRESS_KEY, RECORDS_KEY, HANGAR_KEY, ROUND_KEY] as const;

/**
 * Why loaded data was replaced by its defaults: 'invalid' for damaged or invalid data, 'newer' for data written by a
 * newer version of the game, 'unavailable' when storage cannot be read. The parent sees a short message (FR-052).
 */
export type ResetReason = 'none' | 'invalid' | 'newer' | 'unavailable';

/** One stored kind: its key, its current version, how to read it and what to use when there is nothing usable. */
export interface StoredKind<T> {
  name: StoredKindName;
  key: string;
  version: number;
  /** The value after migration and validation, or null when it is not usable. */
  parse(raw: unknown): T | null;
  empty(): T;
}

function schemaParser<T>(name: StoredKindName, schema: { safeParse(v: unknown): { success: true; data: T } | { success: false } }) {
  return (raw: unknown): T | null => {
    const r = schema.safeParse(migrate(raw, name));
    return r.success ? r.data : null;
  };
}

export const SETTINGS: StoredKind<Settings> = {
  name: 'settings',
  key: SETTINGS_KEY,
  version: 1,
  parse: parseSettings,
  empty: defaultSettings,
};

export const PROGRESS: StoredKind<Progress> = {
  name: 'progress',
  key: PROGRESS_KEY,
  version: 1,
  parse: schemaParser('progress', progressSchema),
  empty: emptyProgress,
};

export const RECORDS: StoredKind<Records> = {
  name: 'records',
  key: RECORDS_KEY,
  version: 1,
  parse: schemaParser('records', recordsSchema),
  empty: emptyRecords,
};

export const HANGAR: StoredKind<Hangar> = {
  name: 'hangar',
  key: HANGAR_KEY,
  version: 1,
  parse: schemaParser('hangar', hangarSchema),
  empty: emptyHangar,
};

/** A round is either stored or not; "empty" is no round to continue. */
export const ROUND: StoredKind<StoredRound | null> = {
  name: 'round',
  key: ROUND_KEY,
  version: 1,
  parse: schemaParser('round', roundSchema),
  empty: () => null,
};

/** Where a copy of stored data that could not be read is kept, before anything is saved over it. */
export function unreadableKey(key: string): string {
  return `${key}.unreadable`;
}

/** True when `value` carries a version number above the one this game writes. */
function isNewer(value: unknown, current: number): boolean {
  return isRecord(value) && typeof value.version === 'number' && value.version > current;
}

/** Keeps the text that could not be read; a failed write changes nothing for the player. */
function keepUnreadable(kv: KeyValue, key: string, text: string): void {
  try {
    kv.set(unreadableKey(key), text);
  } catch {
    // Storage is full or blocked; the reset itself still goes ahead.
  }
}

/**
 * Loads one stored kind. Missing data gives the empty value with reason 'none'. Damaged, invalid, newer or unreadable
 * data gives the empty value with its reason, and the old text is kept under `unreadableKey` (FR-052).
 */
export function load<T>(kv: KeyValue, kind: StoredKind<T>): { value: T; resetReason: ResetReason } {
  let text: string | null;
  try {
    text = kv.get(kind.key);
  } catch {
    return { value: kind.empty(), resetReason: 'unavailable' };
  }
  if (text === null) return { value: kind.empty(), resetReason: 'none' };

  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    keepUnreadable(kv, kind.key, text);
    return { value: kind.empty(), resetReason: 'invalid' };
  }
  if (isNewer(raw, kind.version)) {
    keepUnreadable(kv, kind.key, text);
    return { value: kind.empty(), resetReason: 'newer' };
  }
  const value = kind.parse(raw);
  if (value === null) {
    keepUnreadable(kv, kind.key, text);
    return { value: kind.empty(), resetReason: 'invalid' };
  }
  return { value, resetReason: 'none' };
}

/** Saves one stored kind; `ok` is false when storage is full or blocked, and the game keeps going. */
export function save<T>(kv: KeyValue, kind: StoredKind<T>, value: T): { ok: boolean } {
  try {
    kv.set(kind.key, JSON.stringify(value));
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** Deletes one stored kind, for example the round when it ends. */
export function clear<T>(kv: KeyValue, kind: StoredKind<T>): { ok: boolean } {
  try {
    kv.remove(kind.key);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export const loadSettings = (kv: KeyValue) => load(kv, SETTINGS);
export const saveSettings = (kv: KeyValue, s: Settings) => save(kv, SETTINGS, s);
export const loadProgress = (kv: KeyValue) => load(kv, PROGRESS);
export const saveProgress = (kv: KeyValue, p: Progress) => save(kv, PROGRESS, p);
export const loadRecords = (kv: KeyValue) => load(kv, RECORDS);
export const saveRecords = (kv: KeyValue, r: Records) => save(kv, RECORDS, r);
export const loadHangar = (kv: KeyValue) => load(kv, HANGAR);
export const saveHangar = (kv: KeyValue, h: Hangar) => save(kv, HANGAR, h);
/**
 * Loads the stored round. A round that cannot be read is removed once its copy is kept under `unreadableKey`, so later
 * loads do not parse it and copy it again.
 */
export function loadRound(kv: KeyValue): { value: StoredRound | null; resetReason: ResetReason } {
  const loaded = load(kv, ROUND);
  if (loaded.resetReason === 'invalid' || loaded.resetReason === 'newer') clear(kv, ROUND);
  return loaded;
}
export const saveRound = (kv: KeyValue, r: StoredRound) => save(kv, ROUND, r);
export const clearRound = (kv: KeyValue) => clear(kv, ROUND);

/** The part of `navigator.storage` this game uses. */
export interface PersistentStorage {
  persist?: () => Promise<boolean>;
  persisted?: () => Promise<boolean>;
}

export type PersistOutcome = 'granted' | 'denied' | 'unsupported' | 'failed';

/**
 * Asks the browser once, on start, to keep this game's data when space runs low (as math-soccer).
 * Pass `navigator.storage`; a missing API gives 'unsupported' and an error gives 'failed', never a throw.
 */
export async function requestPersistentStorage(storage: PersistentStorage | undefined): Promise<PersistOutcome> {
  if (!storage?.persist) return 'unsupported';
  try {
    if (storage.persisted && (await storage.persisted())) return 'granted';
    return (await storage.persist()) ? 'granted' : 'denied';
  } catch {
    return 'failed';
  }
}
