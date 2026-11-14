// Adapted from math-soccer src/core/settings/defaults.ts: the Mathe-Flieger limits and defaults (FR-051).
import { SIDES, TASK_KINDS, type Side, type TaskKind } from '../types';
import type { Settings } from './schema';

/** Limits from data-model.md "Settings". */
export const BOMBS_MIN = 5;
export const BOMBS_MAX = 20;
export const TASKS_MIN = 3;
export const TASKS_MAX = 10;
/** Largest plan the parent can allow: 2×2 or 3×3 (FR-028). */
export const MAX_PLANS = [2, 3] as const;
export type MaxPlan = (typeof MAX_PLANS)[number];
/** Highest stack the parent can allow. */
export const MAX_STACKS = [2, 3, 4] as const;
export type MaxStack = (typeof MAX_STACKS)[number];

/** The defaults listed in data-model.md "Settings". A new object on every call. */
export function defaultSettings(): Settings {
  return {
    version: 1,
    levels: { treffer: { start: 1, hardest: 5 }, bauenMalen: { start: 1, hardest: 5 } },
    adaptive: true,
    kinds: Object.fromEntries(TASK_KINDS.map((k) => [k, true])) as Record<TaskKind, boolean>,
    buildings: {
      maxPlan: 3,
      maxStack: 3,
      sides: Object.fromEntries(SIDES.map((s) => [s, true])) as Record<Side, boolean>,
      mixedPieces: true,
    },
    round: { bombs: 10, tasks: 5 },
    sound: { effects: true, speech: false },
    numberPad: 'auto',
    showClock: false,
    showRecords: true,
    pointAfterFullHelp: true,
    hangar: true,
  };
}
