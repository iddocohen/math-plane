// Adapted from math-soccer src/core/settings/validate.ts: the Mathe-Flieger rules across fields.
import { MODES } from '../types';
import { BOMBS_MAX, BOMBS_MIN, TASKS_MAX, TASKS_MIN } from './defaults';
import type { Settings } from './schema';

/** Keys of `settingsErrors` in the translation table (src/i18n/de.ts). */
export const SETTINGS_ERROR_KEYS = ['notInteger', 'levelOrder', 'noSide', 'bombs', 'tasks'] as const;

export type SettingsErrorKey = (typeof SETTINGS_ERROR_KEYS)[number];

/** A translation key plus the path of the field it belongs to. */
export interface SettingsError {
  key: SettingsErrorKey;
  path: string;
}

/** Checks a whole number in [lo, hi]: 'notInteger' for a fraction, `outside` for a whole number out of range. */
function checkCount(v: number, lo: number, hi: number, outside: SettingsErrorKey, path: string): SettingsError[] {
  if (!Number.isInteger(v)) return [{ key: 'notInteger', path }];
  return v < lo || v > hi ? [{ key: outside, path }] : [];
}

/** Checks every rule of data-model.md "Settings". An empty list means the settings are valid. */
export function validateSettings(s: Settings): SettingsError[] {
  const errors: SettingsError[] = [];

  // levels: the start level is not above the hardest level, per mode (FR-031).
  for (const mode of MODES) {
    const { start, hardest } = s.levels[mode];
    if (start > hardest) errors.push({ key: 'levelOrder', path: `levels.${mode}` });
  }

  // buildings.sides: at least one side stays on.
  if (!Object.values(s.buildings.sides).some(Boolean)) errors.push({ key: 'noSide', path: 'buildings.sides' });

  // round: bombs 5 to 20, tasks 3 to 10.
  errors.push(...checkCount(s.round.bombs, BOMBS_MIN, BOMBS_MAX, 'bombs', 'round.bombs'));
  errors.push(...checkCount(s.round.tasks, TASKS_MIN, TASKS_MAX, 'tasks', 'round.tasks'));
  return errors;
}
