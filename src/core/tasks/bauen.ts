/**
 * "Bauen" (FR-021, research R4): the task and the check of a written plan.
 *
 * - `generateBauen` builds a readable cube building within the content's plan limits: 2×2 with stacks 1 to 3 on level
 *   1, 3×3 with stacks 0 to 3 on level 2, both capped by the parent's largest plan and highest stack (levels.ts).
 * - `checkPlan` compares the written plan with the building. A square left empty counts as wrong, even where the
 *   building has no stack, so the child writes every square, a 0 too.
 *
 * Squares are named `"row,col"`, the mark ids of the rules and the views (game/iso.ts).
 */
import { generateCubePlan, type Plan, type PlanLimits } from '../geometry/plan';
import type { Rng } from '../rng';
import type { Level } from '../types';
import { PIECE_COLORS } from './colors';
import type { BauenTask } from './types';

/** Plans of "Bauen" when the content gives none (FR-028 level 1). */
export const BAUEN_PLAN: PlanLimits = { size: 2, minStack: 1, maxStack: 3 };

/** A written plan: a height per square, or null for a square not written yet. */
export type PlanInput = (number | null)[][];

/** The id of the square in `row`, `col`. */
export function squareId(row: number, col: number): string {
  return `${row},${col}`;
}

export function generateBauen(rng: Rng, ident: { id: string; seed: number; level: Level }, limits: PlanLimits = BAUEN_PLAN): BauenTask {
  const target = generateCubePlan(rng, limits);
  return { ...ident, kind: 'bauen', mode: 'bauenMalen', target, color: rng.pick(PIECE_COLORS) };
}

/** The squares of `input` that differ from `target`, as `"row,col"` in reading order; empty squares count as wrong. */
export function checkPlan(target: Plan, input: PlanInput): string[] {
  const wrong: string[] = [];
  target.forEach((row, r) =>
    row.forEach((h, c) => {
      const typed = input[r]?.[c];
      if (typed === null || typed === undefined || typed !== h) wrong.push(squareId(r, c));
    }),
  );
  return wrong;
}
