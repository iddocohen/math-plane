/**
 * The mode-specific part of a round (research R18). `RoundController` keeps phases, help, misses, outcomes, stars,
 * pause, time and the stored round; a rules object makes the tasks of its mode and decides what a tap, a typed height,
 * a painted square or "Fertig" means. `TrefferRules` (core/round/TrefferRules.ts) and `BauenMalenRules`
 * (core/round/BauenMalenRules.ts) implement these interfaces; tests use stubs.
 *
 * Rules are pure: they return new state and never keep any of their own, so the controller can save and restore it.
 */
import type { Rng } from '../rng';
import type { Settings } from '../settings/schema';
import type { Content } from '../tasks/levels';
import type { Level, Mode, Side, TaskKind } from '../types';

/** What every task has (data-model.md "Task"); the kinds add their own fields in core/tasks/types.ts. */
export interface TaskBase {
  id: string;
  kind: TaskKind;
  mode: Mode;
  level: Level;
  seed: number;
  /** The side asked about, for view tasks; recorded with the attempt (FR-047). */
  side?: Side;
}

/** What `createTask` gets: the content picked by the controller, and the identity the task must carry. */
export interface TaskRequest {
  content: Content;
  settings: Settings;
  /** Seeded from the round seed and the task's number, so a restored round makes the same task. */
  rng: Rng;
  id: string;
  seed: number;
}

/** The part both modes share. `T` is the task, `S` the rules' state of one task (slots, typed heights, colors). */
export interface RulesBase<T extends TaskBase, S> {
  /** Makes the task for `request.content`, with `id`, `seed`, `kind`, `mode` and `level` from the request. */
  createTask(request: TaskRequest): T;
  /** The state of a task that has just appeared. */
  createState(task: T, rng: Rng): S;
  /** The stored state of `task` checked for use, or null when it does not fit, so the task starts fresh. */
  restoreState(task: T, raw: unknown): S | null;
  /**
   * The right answer as text for the test hook `data-answer` (contracts/screens.md "Test hooks"), for example the
   * slot of the right choice or the plan; the app shows it only with `?test=1`. Rules without it show nothing.
   */
  answer?(task: T, state: S): string;
}

/** "Treffer" (FR-008, FR-014, FR-015, research R9). */
export interface TrefferRules<T extends TaskBase = TaskBase, S = unknown> extends RulesBase<T, S> {
  readonly mode: 'treffer';
  /** The choice standing in `slot`, or null for a slot that holds none (the tap is then ignored). */
  choiceAt(task: T, state: S, slot: number): number | null;
  /** True when bombing `choice` is right. A view task with several `rightIndexes` counts each as a hit. */
  isHit(task: T, choice: number): boolean;
  /** The state after a miss on `choice`: the choices change places, and at least the one hit moves (FR-008). */
  afterMiss(task: T, state: S, choice: number, rng: Rng): S;
  /** The slots in their new order after `afterMiss`, for the `slotsShuffled` event. */
  slots(state: S): number[];
}

/** An input of "Bauen und Malen" (FR-020 to FR-023). Later tasks may add inputs here. */
export type BauenMalenInput =
  | { type: 'typeHeight'; row: number; col: number; height: number }
  | { type: 'clearHeight'; row: number; col: number }
  | { type: 'togglePaint'; row: number; col: number }
  | { type: 'pickColor'; color: string }
  | { type: 'fillRegion'; index: number };

/** A change the views animate, reported by `BauenMalenRules.apply`. */
export type CratesChanged = { type: 'cratesChanged'; row: number; col: number; from: number; to: number };

/** The result of one input: the new state, crates to animate, and the marks the input made stale. */
export interface InputResult<S> {
  state: S;
  events?: CratesChanged[];
  /** Marks (from `check`) that the input changed, so they disappear. */
  unmark?: string[];
}

/** "Bauen und Malen" (FR-020 to FR-023). */
export interface BauenMalenRules<T extends TaskBase = TaskBase, S = unknown> extends RulesBase<T, S> {
  readonly mode: 'bauenMalen';
  /** Applies one input; null when the input does not apply to this task (it is then ignored). */
  apply(task: T, state: S, input: BauenMalenInput): InputResult<S> | null;
  /**
   * "Fertig": right, or the cells or regions to mark (FR-009, FR-021 to FR-023). Mark ids are the rules' own, for
   * example `"1,2"` for a square or `"r3"` for a region.
   */
  check(task: T, state: S): { right: boolean; marked: string[] };
}

export type ModeRules<T extends TaskBase = TaskBase, S = unknown> = TrefferRules<T, S> | BauenMalenRules<T, S>;
