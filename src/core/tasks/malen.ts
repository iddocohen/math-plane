/**
 * "Malen" (FR-022, FR-024, research R3 and R4): the task and the check of a painted view.
 *
 * - `generateMalen` builds a readable cube building within the content's plan limits and picks a side from the
 *   content's sides (the parent's sides, levels.ts). The view from that side must be worth painting: not all filled,
 *   not empty, and at least two of its columns differ (prototype `newMalen`). Up to `GENERATE_TRIES` buildings are
 *   tried; then a built-in plan that gives such a view. When no plan within the limits can (a 2×2 plan has every
 *   square filled, so its view from above is all filled), another side of the content is used, and "vorn" as the last
 *   way out.
 * - Side views are `gridHeight` rows high: the parent's highest stack, so every side view has the same grid
 *   (data-model.md "CubeView").
 * - `checkPaint` compares the painted squares with the view. Squares are named `"row,col"`, row 0 at the top.
 */
import { FALLBACK_PLANS, GENERATE_TRIES, generateCubePlan, meetsRules, type Plan, type PlanLimits } from '../geometry/plan';
import { cubeView, type CubeView } from '../geometry/views';
import type { Rng } from '../rng';
import type { Level, Side } from '../types';
import { squareId } from './bauen';
import { PIECE_COLORS } from './colors';
import type { MalenTask } from './types';

/** Plans of "Malen" when the content gives none: 3×3 with stacks 0 to 3, as the prototype's `genBuilding(3)`. */
export const MALEN_PLAN: PlanLimits = { size: 3, minStack: 0, maxStack: 3 };

/** The painted squares of a view, `paint[row][col]`, row 0 at the top. */
export type Paint = boolean[][];

/** True when `view` is worth painting: some squares filled, some empty, and at least two columns differ (FR-024). */
export function worthPainting(view: CubeView): boolean {
  const all = view.cells.flat();
  if (!all.includes(true) || !all.includes(false)) return false;
  const cols = view.cells[0]?.length ?? 0;
  const columns = new Set(Array.from({ length: cols }, (_, c) => view.cells.map((row) => (row[c] ? '#' : '.')).join('')));
  return columns.size >= 2;
}

interface Ident {
  id: string;
  seed: number;
  level: Level;
}

/** A building whose view from `side` is worth painting, or null when none within `limits` gives one. */
function buildingFor(rng: Rng, side: Side, limits: PlanLimits, gridHeight: number): Plan | null {
  for (let i = 0; i < GENERATE_TRIES; i++) {
    const p = generateCubePlan(rng, limits);
    if (worthPainting(cubeView(p, side, gridHeight))) return p;
  }
  const fits = FALLBACK_PLANS[limits.size].filter((p) => meetsRules(p, limits) && worthPainting(cubeView(p, side, gridHeight)));
  console.warn(`malen: using a built-in plan for ${JSON.stringify(limits)} from ${side}`);
  return fits.length > 0 ? rng.pick(fits).map((row) => [...row]) : null;
}

export function generateMalen(rng: Rng, ident: Ident, sides: readonly Side[], limits: PlanLimits = MALEN_PLAN, gridHeight: number = limits.maxStack): MalenTask {
  const height = Math.max(gridHeight, limits.maxStack);
  const asked = sides.length > 0 ? rng.pick(sides) : 'vorn';
  const order: Side[] = [asked, ...rng.shuffled(sides.filter((s) => s !== asked)), 'vorn'];
  for (const side of order) {
    const building = buildingFor(rng, side, limits, height);
    if (building === null) continue;
    return { ...ident, kind: 'malen', mode: 'bauenMalen', side, building, expected: cubeView(building, side, height), color: rng.pick(PIECE_COLORS) };
  }
  throw new RangeError(`malen: no building fits ${JSON.stringify(limits)}`);
}

/** An empty paint grid of the size of `view`. */
export function emptyPaint(view: CubeView): Paint {
  return view.cells.map((row) => row.map(() => false));
}

/** The squares of `paint` that differ from `expected`, as `"row,col"` in reading order (FR-009, FR-022). */
export function checkPaint(expected: CubeView, paint: Paint): string[] {
  const wrong: string[] = [];
  expected.cells.forEach((row, r) =>
    row.forEach((on, c) => {
      if ((paint[r]?.[c] ?? false) !== on) wrong.push(squareId(r, c));
    }),
  );
  return wrong;
}
