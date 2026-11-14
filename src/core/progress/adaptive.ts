// Adapted from math-soccer src/core/progress/adaptive.ts: one level per mode, outcomes `alone` and `withHelp`, counters
// keyed by mode, kind, level and side, and no guesses (research R10, R12).
/**
 * Records one finished task in Progress (FR-030, FR-031, FR-047 to FR-049). Pure: returns a new Progress.
 *
 * - The attempt list keeps the newest `MAX_ATTEMPTS`.
 * - Counters (FR-048) are keyed `mode:kind:level` and, for tasks that ask about a side, `mode:kind:side`. A third key
 *   `mode:kind` holds the mastery window of the kind in the mode (FR-049).
 * - Only tasks of the mode's current level enter `recent` and move the level (research R10), so review tasks from lower
 *   levels neither raise nor lower it. With adaptive difficulty on, the level goes up one after `RAISE_ROW` current-level
 *   tasks in a row solved alone, and down one when `LOWER_NEEDED` of the last `LOWER_WINDOW` were not solved alone,
 *   always within the parent's range (tasks/levels.ts). `recent` is cleared on a level change, so the row starts again.
 */
import { MAX_ATTEMPTS, RECENT_MAX, WINDOW_MAX, type AttemptRecord, type Count, type Progress } from '../storage/schemas';
import type { Settings } from '../settings/schema';
import { currentLevel, levelDown, levelUp } from '../tasks/levels';
import type { Level, Mode, Outcome, Side, TaskKind } from '../types';
import { isMastered } from './mastery';

export { MAX_ATTEMPTS };
/** Up after this many current-level tasks in a row solved alone. */
export const RAISE_ROW = 3;
/** Down when at least LOWER_NEEDED of the last LOWER_WINDOW current-level tasks were not solved alone. */
export const LOWER_WINDOW = 3;
export const LOWER_NEEDED = 2;

/** Counter key of a kind at a level (FR-048). */
export function levelKey(mode: Mode, kind: TaskKind, level: Level): string {
  return `${mode}:${kind}:${level}`;
}

/** Counter key of a kind and an asked side (FR-048). */
export function sideKey(mode: Mode, kind: TaskKind, side: Side): string {
  return `${mode}:${kind}:${side}`;
}

/** Counter key of a kind in a mode, whose window decides mastery (FR-049). */
export function kindKey(mode: Mode, kind: TaskKind): string {
  return `${mode}:${kind}`;
}

export function emptyCount(): Count {
  return { alone: 0, withHelp: 0, window: [] };
}

function addOutcome(c: Count, outcome: Outcome): Count {
  return {
    alone: c.alone + (outcome === 'alone' ? 1 : 0),
    withHelp: c.withHelp + (outcome === 'alone' ? 0 : 1),
    window: [...c.window, outcome].slice(-WINDOW_MAX),
  };
}

/** The current-level outcomes solved alone at the end of `recent`. */
function rowOf(recent: readonly Outcome[]): number {
  let row = 0;
  while (row < recent.length && recent[recent.length - 1 - row] === 'alone') row += 1;
  return row;
}

/** The level and recent outcomes of `mode` after one attempt. */
function nextLevel(p: Progress, a: AttemptRecord, settings: Settings): { level: Level; recent: Outcome[] } {
  const level = currentLevel(a.mode, p.levels[a.mode], settings);
  if (a.level !== level) return { level, recent: p.recent[a.mode] };
  const recent = [...p.recent[a.mode], a.outcome].slice(-RECENT_MAX);
  if (!settings.adaptive) return { level, recent };
  const notAlone = recent.slice(-LOWER_WINDOW).filter((o) => o !== 'alone').length;
  let next = level;
  if (rowOf(recent) >= RAISE_ROW) next = levelUp(a.mode, level, settings);
  else if (notAlone >= LOWER_NEEDED) next = levelDown(a.mode, level, settings);
  return next === level ? { level, recent } : { level: next, recent: [] };
}

/** Adds one finished task to `p`; `settings` are the ones the task used. */
export function recordAttempt(p: Progress, a: AttemptRecord, settings: Settings): Progress {
  const keys = [levelKey(a.mode, a.kind, a.level), kindKey(a.mode, a.kind)];
  if (a.side) keys.push(sideKey(a.mode, a.kind, a.side));
  const counts = { ...p.counts };
  for (const key of keys) counts[key] = addOutcome(counts[key] ?? emptyCount(), a.outcome);
  const { level, recent } = nextLevel(p, a, settings);
  return {
    ...p,
    attempts: [...p.attempts, a].slice(-MAX_ATTEMPTS),
    levels: { ...p.levels, [a.mode]: level },
    recent: { ...p.recent, [a.mode]: recent },
    counts,
  };
}

/**
 * The level reached by an attempt (FR-030): the new level of `mode` when `after` is higher than `before`, else null. A
 * level going down returns null, so it never shows.
 */
export function levelRaised(before: Progress, after: Progress, mode: Mode, settings: Settings): Level | null {
  const from = currentLevel(mode, before.levels[mode], settings);
  const to = currentLevel(mode, after.levels[mode], settings);
  return to > from ? to : null;
}

/** True when the child has mastered `kind` in `mode` (FR-049). */
export function kindMastered(p: Progress, mode: Mode, kind: TaskKind): boolean {
  return isMastered(p.counts[kindKey(mode, kind)]?.window ?? []);
}
