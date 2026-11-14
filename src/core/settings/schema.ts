// Adapted from math-soccer src/core/settings/schema.ts: the Mathe-Flieger settings groups (FR-051).
import { z } from 'zod';
import { LEVELS, SIDES, TASK_KINDS, type Side, type TaskKind } from '../types';
import { BOMBS_MAX, BOMBS_MIN, MAX_PLANS, MAX_STACKS, TASKS_MAX, TASKS_MIN } from './defaults';

/**
 * Structural schema of the stored settings, version 1 (stored under `mathplane.settings.v1`, data-model.md
 * "Settings"). Rules across fields (level order, at least one side) live in validate.ts; the limits of bombs and tasks
 * per round are checked here too, so stored settings outside them are invalid on load.
 */

/** "Stufe am Anfang" and "Schwerste Stufe" of one mode. */
export const levelRangeSchema = z.object({ start: z.literal(LEVELS), hardest: z.literal(LEVELS) });

const flags = <K extends string>(keys: readonly K[]) =>
  z.object(Object.fromEntries(keys.map((k) => [k, z.boolean()])) as Record<K, z.ZodBoolean>);

export const settingsSchema = z.object({
  version: z.literal(1),
  /** The level range per mode (FR-031). */
  levels: z.object({ treffer: levelRangeSchema, bauenMalen: levelRangeSchema }),
  adaptive: z.boolean(),
  /** "Themen": which task kinds may appear. */
  kinds: flags<TaskKind>(TASK_KINDS),
  /** "Gebäude" (FR-032): largest plan, highest stack, sides used, cylinders and spheres. */
  buildings: z.object({
    maxPlan: z.literal(MAX_PLANS),
    maxStack: z.literal(MAX_STACKS),
    sides: flags<Side>(SIDES),
    mixedPieces: z.boolean(),
  }),
  /** "Runde": bombs of a "Treffer" round and tasks of a "Bauen und Malen" round. */
  round: z.object({
    bombs: z.number().int().min(BOMBS_MIN).max(BOMBS_MAX),
    tasks: z.number().int().min(TASKS_MIN).max(TASKS_MAX),
  }),
  sound: z.object({ effects: z.boolean(), speech: z.boolean() }),
  numberPad: z.enum(['auto', 'always', 'never']),
  showClock: z.boolean(),
  showRecords: z.boolean(),
  pointAfterFullHelp: z.boolean(),
  hangar: z.boolean(),
});

export type Settings = z.infer<typeof settingsSchema>;
export type LevelRange = z.infer<typeof levelRangeSchema>;
