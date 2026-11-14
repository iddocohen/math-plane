/**
 * The tasks of each kind (data-model.md "Task"). Every task carries the fields of `TaskBase` (core/round/rules.ts);
 * the kinds add what they show and what is right.
 *
 * "Treffer" tasks have `choices` that stand in the field slots and `rightIndexes`, the choices a bomb may hit to solve
 * the task. Every kind has one right choice so far: a view card that two sides show is offered once (research R7).
 */
import type { MixedBuilding, MixedView } from '../geometry/mixed';
import type { Plan } from '../geometry/plan';
import type { CubeView } from '../geometry/views';
import type { TaskBase } from '../round/rules';
import type { FlatShape, Side, Solid } from '../types';

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

/**
 * "Bauplan finden" (FR-018, research R5): the plan card and 3 cube buildings, the right one and 2 close variants.
 * `choices` are the plans of the buildings on the field.
 */
export interface BauplanFindenTask extends TaskBase {
  kind: 'bauplanFinden';
  mode: 'treffer';
  /** The plan on the card. */
  plan: Plan;
  choices: Plan[];
  /** One `#rrggbb` color per building, all different. */
  colors: string[];
  rightIndexes: number[];
}

/** A view card of "Ansicht finden": a cube view (grid) or a mixed view (outlines). */
export interface ViewCard {
  view: CubeView | MixedView;
  /** The sides of the building this card shows, for the miss line ("Das ist die Ansicht von links."); may be empty. */
  shows: Side[];
}

/** True for a card with a cube view (a grid of squares). */
export function isCubeCard(view: CubeView | MixedView): view is CubeView {
  return 'cells' in view;
}

/** True for a building with mixed pieces, false for a cube plan. */
export function isMixedBuilding(building: Plan | MixedBuilding): building is MixedBuilding {
  return !Array.isArray(building);
}

/**
 * "Ansicht finden" (FR-019, research R7): one building on the field and 3 view cards; the banner asks for the view
 * from `side`. `rightIndexes` holds the card that equals that view.
 */
export interface AnsichtFindenTask extends TaskBase {
  kind: 'ansichtFinden';
  mode: 'treffer';
  side: Side;
  /** A cube building (its plan) or a building with mixed pieces. */
  building: Plan | MixedBuilding;
  /** The color of a cube building; the pieces of a mixed building have their own. */
  color: string;
  choices: ViewCard[];
  rightIndexes: number[];
}

/** Every "Treffer" task. */
export type TrefferTask = KoerperTask | FormenTask | BauplanFindenTask | AnsichtFindenTask;

/** Every task the generator makes so far. */
export type Task = TrefferTask;

/** True for a task with choices to bomb. */
export function isTrefferTask(task: TaskBase): task is TrefferTask {
  return task.mode === 'treffer' && Array.isArray((task as Partial<TrefferTask>).rightIndexes) && Array.isArray((task as Partial<TrefferTask>).choices);
}
