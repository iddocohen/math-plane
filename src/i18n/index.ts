// Adapted from math-soccer src/i18n/index.ts: Mathe-Flieger's sections and the 8-word limit (FR-040).
import { de } from './de';

/** The shape every translation table must have; de.ts is the source of truth for keys. */
export type Messages = typeof de;

/**
 * Why stored data was reset on load, as math-soccer's src/core/storage/storage.ts names it. The storage module (T012)
 * becomes the source of this type when it is copied.
 */
export type ResetReason = 'none' | 'invalid' | 'newer' | 'unavailable';

const active: Messages = de;

/** The active translation table. */
export function t(): Messages {
  return active;
}

/** No child-facing text may contain one of these, case-insensitive, also inside compounds (FR-041, SC-009). */
export const forbiddenWords: readonly string[] = ['falsch', 'verloren', 'Fehler', 'schlecht'];

/** Sections of the table a child reads or hears; the rest is for parents. */
export const CHILD_SECTIONS = ['appName', 'start', 'round', 'names', 'tasks', 'kinds', 'feedback', 'levels', 'help', 'roundEnd', 'hangar', 'storage'] as const;

/**
 * Child sections whose texts may be longer than `MAX_WORDS`: the help sentences (research R15), and the stored-data
 * notices on the start screen, which are written for the parent.
 */
export const LONG_SECTIONS: readonly string[] = ['help', 'storage'];

/** The most words a child text outside `LONG_SECTIONS` may have (FR-040: short). */
export const MAX_WORDS = 8;

/** True when `text` contains a forbidden word. */
export function hasForbiddenWord(text: string): boolean {
  const lower = text.toLocaleLowerCase('de');
  return forbiddenWords.some((w) => lower.includes(w.toLocaleLowerCase('de')));
}

/** The number of words in `text`, split at spaces. */
export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** The short note after stored data was reset on load (FR-052), or null when nothing was reset. */
export function resetMessage(reason: ResetReason): string | null {
  return reason === 'none' ? null : active.storage.reset[reason];
}
