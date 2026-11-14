// Adapted from math-soccer src/core/records/records.ts: one number per key, keyed by mode and round length (R16).
/**
 * Personal bests (FR-037, FR-039, research R16). Pure functions; storage.ts keeps them under `mathplane.records.v1`.
 *
 * - "Treffer": the most hits in a round with the same number of bombs, keyed `treffer:<bombs>`.
 * - "Bauen und Malen": the most tasks solved alone in a round with the same number of tasks, keyed
 *   `bauenMalen:<tasks>`.
 *
 * A round with 0 is never a record.
 */
import { emptyRecords, type Records } from '../storage/schemas';
import type { Mode } from '../types';

export { emptyRecords, type Records };

/** The key of a round of `mode` with `length` bombs or tasks. */
export function recordKey(mode: Mode, length: number): string {
  return `${mode}:${length}`;
}

export interface SubmitOutcome {
  records: Records;
  /** The result beat the stored best, or there was none and the result is above 0. */
  newRecord: boolean;
  /** The best for the key after this result, or null when there is none. */
  best: number | null;
}

/** Compares a finished round with the stored best and returns new records; `records` itself is not changed. */
export function submitResult(records: Records, key: string, result: number): SubmitOutcome {
  const stored = records.best[key] ?? null;
  const newRecord = result > 0 && (stored === null || result > stored);
  if (!newRecord) return { records, newRecord, best: stored };
  return { records: { ...records, best: { ...records.best, [key]: result } }, newRecord, best: result };
}
