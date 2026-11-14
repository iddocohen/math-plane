// Adapted from math-soccer src/core/storage/exportImport.ts: the Hangar instead of the locker room, no cup.
import type { Settings } from '../settings/schema';
import { isRecord } from '../util';
import { type Hangar, type Progress, type Records } from './schemas';
import { HANGAR, PROGRESS, RECORDS, SETTINGS } from './storage';

/** Marks an export file as ours. */
export const EXPORT_APP = 'math-plane';

/** Why an import was refused; the settings page maps each reason to a German message (de.ts `importFailed`). */
export type ImportFailure =
  | 'notJson'
  | 'wrongApp'
  | 'invalidSettings'
  | 'invalidProgress'
  | 'invalidRecords'
  | 'invalidHangar'
  /** The file was fine, but the browser could not store it; nothing was changed. */
  | 'storeFailed'
  /** The browser stored part of the file and could not put the old data back. */
  | 'storePartial';

export interface SaveData {
  settings: Settings;
  progress: Progress;
  records: Records;
  hangar: Hangar;
}

export type ImportResult = ({ ok: true } & SaveData) | { ok: false; reason: ImportFailure };

/** JSON text of `{ app, exportedAt, settings, progress, records, hangar }` for the "Daten sichern" download. */
export function exportData(data: SaveData, now: Date = new Date()): string {
  return JSON.stringify({ app: EXPORT_APP, exportedAt: now.toISOString(), ...data }, null, 2);
}

/**
 * Reads an export file with the same migrations, schemas and settings rules as loading from storage. It returns new
 * objects and stores nothing; the caller saves them only when `ok` is true. The running round is never exported.
 */
export function importData(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, reason: 'notJson' };
  }
  if (!isRecord(raw)) return { ok: false, reason: 'notJson' };
  if (raw.app !== EXPORT_APP) return { ok: false, reason: 'wrongApp' };

  const settings = SETTINGS.parse(raw.settings);
  if (!settings) return { ok: false, reason: 'invalidSettings' };
  const progress = PROGRESS.parse(raw.progress);
  if (!progress) return { ok: false, reason: 'invalidProgress' };
  const records = RECORDS.parse(raw.records);
  if (!records) return { ok: false, reason: 'invalidRecords' };
  const hangar = HANGAR.parse(raw.hangar);
  if (!hangar) return { ok: false, reason: 'invalidHangar' };

  return { ok: true, settings, progress, records, hangar };
}
