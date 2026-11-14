// Adapted from math-soccer src/core/storage/schemas.ts: Progress, Records, Hangar and the stored round of
// data-model.md; no cup (research R11).
import { z } from 'zod';
import { LEVELS, MODES, OUTCOMES, SIDES, TASK_KINDS, type Mode, type Outcome } from '../types';

/**
 * Schemas of the stored kinds other than settings (data-model.md). Every kind is at version 1. A change to a stored
 * shape raises its version and adds a step in migrate.ts.
 */

/** Most attempt records kept, as math-soccer `MAX_ATTEMPTS`. */
export const MAX_ATTEMPTS = 2000;
/** Current-level outcomes kept per mode for the adaptive rule (research R10). */
export const RECENT_MAX = 6;
/** Outcomes kept per counter for mastery (research R12). */
export const WINDOW_MAX = 10;

export const modeSchema = z.enum(MODES);
export const outcomeSchema = z.enum(OUTCOMES);
const levelSchema = z.literal(LEVELS);

/** One finished task (data-model.md "AttemptRecord", FR-047). */
export const attemptRecordSchema = z.object({
  mode: modeSchema,
  kind: z.enum(TASK_KINDS),
  level: levelSchema,
  /** The side the task asked about, for view tasks. */
  side: z.enum(SIDES).optional(),
  outcome: outcomeSchema,
  /** The highest help step used, 0 to 3. */
  helpStep: z.number().int().min(0).max(3),
  misses: z.number().int().min(0),
  /** Play time from the task appearing to the right answer. */
  ms: z.number().min(0),
  /** ISO 8601 time the task was finished. */
  at: z.string(),
});
export type AttemptRecord = z.infer<typeof attemptRecordSchema>;

/** Counters of one `mode:kind:level` or `mode:kind:side` key (FR-048). */
export const countSchema = z.object({
  alone: z.number().int().min(0),
  withHelp: z.number().int().min(0),
  /** The last outcomes, newest last, at most 10. */
  window: z.array(outcomeSchema).max(WINDOW_MAX),
});
export type Count = z.infer<typeof countSchema>;

/** `mathplane.progress.v1`: attempt records, the current level and recent outcomes per mode, and the counters. */
export const progressSchema = z.object({
  version: z.literal(1),
  attempts: z.array(attemptRecordSchema).max(MAX_ATTEMPTS),
  /** The current level per mode (FR-031). */
  levels: z.object({ treffer: levelSchema, bauenMalen: levelSchema }),
  /** The last current-level outcomes per mode, newest last, at most 6. */
  recent: z.object({ treffer: z.array(outcomeSchema).max(RECENT_MAX), bauenMalen: z.array(outcomeSchema).max(RECENT_MAX) }),
  counts: z.record(z.string(), countSchema),
});
export type Progress = z.infer<typeof progressSchema>;

/** No task played yet: level 1 in both modes. The round start clamps the level to the parent's range. */
export function emptyProgress(): Progress {
  const perMode = <T>(make: () => T) => Object.fromEntries(MODES.map((m) => [m, make()])) as Record<Mode, T>;
  return { version: 1, attempts: [], levels: { treffer: 1, bauenMalen: 1 }, recent: perMode((): Outcome[] => []), counts: {} };
}

/** `mathplane.records.v1`: personal bests keyed `treffer:<bombs>` or `bauenMalen:<tasks>` (research R16). */
export const recordsSchema = z.object({
  version: z.literal(1),
  best: z.record(z.string(), z.number().int().min(0)),
});
export type Records = z.infer<typeof recordsSchema>;

export function emptyRecords(): Records {
  return { version: 1, best: {} };
}

/** The Hangar categories a child chooses from (data-model.md "Hangar"). */
export const HANGAR_CATEGORIES = ['planeColor', 'tail', 'smoke', 'bomb', 'hat'] as const;
export type HangarCategory = (typeof HANGAR_CATEGORIES)[number];

/**
 * The free default item of each category. core/rewards/items.ts (T020) lists the items and must contain these ids;
 * they are defined here so a new Hangar does not depend on the item list.
 */
export const STARTER: Record<HangarCategory, string> = {
  planeColor: 'planeColor.red',
  tail: 'tail.none',
  smoke: 'smoke.white',
  bomb: 'bomb.classic',
  hat: 'hat.none',
};

/** `mathplane.hangar.v1`: stars, bought items and the chosen look. Free items are owned without being listed. */
export const hangarSchema = z.object({
  version: z.literal(1),
  stars: z.number().int().min(0),
  owned: z.array(z.string()),
  chosen: z.object({
    planeColor: z.string(),
    tail: z.string(),
    smoke: z.string(),
    bomb: z.string(),
    hat: z.string(),
  }),
});
export type Hangar = z.infer<typeof hangarSchema>;

/** A new player: no stars, nothing bought, the free default items. */
export function emptyHangar(): Hangar {
  return { version: 1, stars: 0, owned: [], chosen: { ...STARTER } };
}

/** The content a task was made from (core/tasks/levels.ts `Content`), so a restored round makes the same task. */
export const contentSchema = z.object({
  kind: z.enum(TASK_KINDS),
  level: levelSchema,
  plan: z
    .object({ size: z.union([z.literal(2), z.literal(3)]), minStack: z.number().int().min(0), maxStack: z.number().int().min(0) })
    .optional(),
  sides: z.array(z.enum(SIDES)).optional(),
  mixed: z.boolean().optional(),
});

/**
 * `mathplane.round.v1`, version 1: the running round, kept on refresh (data-model.md "Round", core/round/
 * RoundController.ts). The task is not stored: it is made again from `content` and the seed of task `taskIndex`.
 * `ruleState` is the mode rules' own state of the task (typed crates, painted squares, slots); the rules check it when
 * the round is restored. Version 1 of the game never stored the earlier placeholder shape, so no migration is needed.
 */
export const roundSchema = z.object({
  version: z.literal(1),
  mode: modeSchema,
  seed: z.number().int(),
  /** The level of the mode when the round was saved. */
  level: levelSchema,
  elapsedMs: z.number().min(0),
  bombsTotal: z.number().int().min(0),
  bombsLeft: z.number().int().min(0),
  hits: z.number().int().min(0),
  tasksTotal: z.number().int().min(0),
  tasksDone: z.number().int().min(0),
  solvedAlone: z.number().int().min(0),
  /** Stars earned in this round so far. */
  stars: z.number().int().min(0),
  /** How many tasks the round has started, counting the current one. */
  taskIndex: z.number().int().min(0),
  previousKind: z.enum(TASK_KINDS).nullable(),
  content: contentSchema,
  /** True when the current task was solved and the next one has not started. */
  solved: z.boolean(),
  misses: z.number().int().min(0),
  helpStep: z.number().int().min(0).max(3),
  /** Play time of the round when the current task started. */
  taskStartMs: z.number().min(0),
  marked: z.array(z.string()),
  ruleState: z.unknown(),
});
export type StoredRound = z.infer<typeof roundSchema>;
