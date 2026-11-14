// Adapted from math-soccer src/core/progress/summarize.ts: rows per mode, level, task kind and side.
/**
 * Data for the parent progress page (FR-048, FR-049, contracts/screens.md "Progress"). Pure: reads Progress, the
 * personal bests and the settings and returns plain rows; the page only formats them.
 *
 * - Per mode the current level (the stored level moved into the parent's range, tasks/levels.ts `currentLevel`), or
 *   null when every kind of the mode is off.
 * - Per mode one row for every level of the ladder and every task kind of that level, in ladder order, with the
 *   counters keyed `mode:kind:level`. Rows without attempts are listed too, so the parent sees what lies ahead.
 *   "gemeistert" is per mode and kind (FR-049), so every row of a kind shows the same answer.
 * - Per mode one row for every view kind of its ladder ("Ansicht finden", "Malen", "Male an") and every side, with
 *   the counters keyed `mode:kind:side`.
 * - The personal bests, "Treffer" first, each by round length.
 */
import type { Settings } from '../settings/schema';
import type { Count, Progress, Records } from '../storage/schemas';
import { currentLevel, levelRange, LEVELS as LADDERS } from '../tasks/levels';
import { MODES, SIDES, type Level, type Mode, type Side, type TaskKind } from '../types';
import { emptyCount, kindMastered, levelKey, sideKey } from './adaptive';

/** One task kind at one level. */
export interface LevelKindRow {
  level: Level;
  kind: TaskKind;
  alone: number;
  withHelp: number;
  mastered: boolean;
}

/** One view kind and one side asked. */
export interface SideRow {
  kind: TaskKind;
  side: Side;
  alone: number;
  withHelp: number;
}

export interface ModeSummary {
  mode: Mode;
  /** The level the next task comes from; null when every kind of the mode is off. */
  level: Level | null;
  levels: LevelKindRow[];
  sides: SideRow[];
}

export interface BestRow {
  mode: Mode;
  /** Bombs ("Treffer") or tasks ("Bauen und Malen") of the round. */
  length: number;
  /** Hits ("Treffer") or tasks solved alone ("Bauen und Malen"). */
  best: number;
}

export interface ProgressSummary {
  modes: ModeSummary[];
  bests: BestRow[];
  /** No task was recorded yet. */
  empty: boolean;
}

/** A record key (records.ts `recordKey`): `treffer:<bombs>` or `bauenMalen:<tasks>`; null for any other key. */
export function parseRecordKey(key: string): Pick<BestRow, 'mode' | 'length'> | null {
  const m = /^(treffer|bauenMalen):(\d+)$/.exec(key);
  return m ? { mode: m[1] as Mode, length: Number(m[2]) } : null;
}

function count(p: Progress, key: string): Count {
  return p.counts[key] ?? emptyCount();
}

function summarizeMode(p: Progress, mode: Mode, settings: Settings): ModeSummary {
  const ladder = LADDERS[mode];
  const levels: LevelKindRow[] = [];
  const viewKinds: TaskKind[] = [];
  for (const def of ladder) {
    for (const content of def.contents) {
      const c = count(p, levelKey(mode, content.kind, def.level));
      levels.push({ level: def.level, kind: content.kind, alone: c.alone, withHelp: c.withHelp, mastered: kindMastered(p, mode, content.kind) });
      if (content.sides && !viewKinds.includes(content.kind)) viewKinds.push(content.kind);
    }
  }
  const sides: SideRow[] = viewKinds.flatMap((kind) =>
    SIDES.map((side) => {
      const c = count(p, sideKey(mode, kind, side));
      return { kind, side, alone: c.alone, withHelp: c.withHelp };
    }),
  );
  const level = levelRange(mode, settings).length > 0 ? currentLevel(mode, p.levels[mode], settings) : null;
  return { mode, level, levels, sides };
}

export function summarize(p: Progress, records: Records, settings: Settings): ProgressSummary {
  const bests: BestRow[] = [];
  for (const [key, best] of Object.entries(records.best)) {
    const parsed = parseRecordKey(key);
    if (parsed) bests.push({ ...parsed, best });
  }
  bests.sort((a, b) => MODES.indexOf(a.mode) - MODES.indexOf(b.mode) || a.length - b.length);
  return { modes: MODES.map((mode) => summarizeMode(p, mode, settings)), bests, empty: p.attempts.length === 0 };
}
