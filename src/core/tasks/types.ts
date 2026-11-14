/**
 * The tasks of each kind (data-model.md "Task"). Every task carries the fields of `TaskBase` (core/round/rules.ts);
 * the kinds add what they show and what is right.
 *
 * "Treffer" tasks have `choices` that stand in the field slots and `rightIndexes`, the choices a bomb may hit to solve
 * the task. "Körper finden" and "Formen finden" have one right choice; view tasks (US2) may have more when two sides
 * look the same (research R7).
 */
import type { TaskBase } from '../round/rules';
import type { FlatShape, Solid } from '../types';

/** How one flat shape lies on the field (FR-024c, research R17). */
export interface ShapeLook {
  /** Size factor around 1. */
  scale: number;
  /** Turn in degrees, from -20 to 20. */
  turn: number;
  /** Long side over short side: 1.6 to 2.2 for a Rechteck, 1 for the other shapes. */
  aspect: number;
}

/** "Körper finden" (FR-016): 4 different solids in different colors. */
export interface KoerperTask extends TaskBase {
  kind: 'koerper';
  mode: 'treffer';
  choices: Solid[];
  /** The solid the banner asks for ("Triff den Zylinder!"). */
  target: Solid;
  /** One `#rrggbb` color per choice, all different. */
  colors: string[];
  rightIndexes: number[];
}

/** "Formen finden" (FR-017): Kreis, Dreieck, Quadrat and Rechteck, each once, in different colors. */
export interface FormenTask extends TaskBase {
  kind: 'formen';
  mode: 'treffer';
  choices: FlatShape[];
  target: FlatShape;
  colors: string[];
  /** One look per choice. */
  looks: ShapeLook[];
  rightIndexes: number[];
}

/** Every "Treffer" task. US2 adds "Bauplan finden" and "Ansicht finden" here. */
export type TrefferTask = KoerperTask | FormenTask;

/** Every task the generator makes so far. */
export type Task = TrefferTask;

/** True for a task with choices to bomb. */
export function isTrefferTask(task: TaskBase): task is TrefferTask {
  return task.mode === 'treffer' && Array.isArray((task as Partial<TrefferTask>).rightIndexes) && Array.isArray((task as Partial<TrefferTask>).choices);
}
