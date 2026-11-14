/** Shared types of the engine-free core (data-model.md, contracts/core-api.md). */

/** The two game modes: "Treffer" and "Bauen und Malen". */
export const MODES = ['treffer', 'bauenMalen'] as const;
export type Mode = (typeof MODES)[number];

/** The difficulty levels of each mode (FR-028). */
export const LEVELS = [1, 2, 3, 4, 5] as const;
export type Level = (typeof LEVELS)[number];

/**
 * The sides a building is viewed from (research R3). `rechts` and `links` are the side views, `oben` the footprint.
 */
export const SIDES = ['vorn', 'oben', 'rechts', 'links'] as const;
export type Side = (typeof SIDES)[number];

/** The task kinds (data-model.md "TaskKind"); later topics add kinds here (FR-055). */
export const TASK_KINDS = ['koerper', 'formen', 'bauplanFinden', 'ansichtFinden', 'bauen', 'malen', 'maleAn'] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

/** The solids of "Körper finden". */
export const SOLIDS = ['wuerfel', 'quader', 'zylinder', 'kugel', 'pyramide'] as const;
export type Solid = (typeof SOLIDS)[number];

/** The flat shapes of "Formen finden". */
export const FLAT_SHAPES = ['kreis', 'dreieck', 'quadrat', 'rechteck'] as const;
export type FlatShape = (typeof FLAT_SHAPES)[number];

/** How a task went: right on the first try without help, or not (FR-035, research R12). */
export const OUTCOMES = ['alone', 'withHelp'] as const;
export type Outcome = (typeof OUTCOMES)[number];
