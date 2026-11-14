// Adapted from math-soccer src/core/progress/mastery.ts: the window holds `alone` and `withHelp` outcomes, and there
// are no guesses (research R12).
/**
 * Mastery of a task kind in a mode (FR-049): at least 10 attempts and at least 8 of the last 10 solved alone. The
 * window keeps the last 10 outcomes, so a full window means at least 10 attempts.
 */
import type { Outcome } from '../types';

export const MASTERY_WINDOW = 10;
export const MASTERY_NEEDED_IN_WINDOW = 8;

export function isMastered(window: readonly Outcome[]): boolean {
  const last = window.slice(-MASTERY_WINDOW);
  return last.length === MASTERY_WINDOW && last.filter((o) => o === 'alone').length >= MASTERY_NEEDED_IN_WINDOW;
}
