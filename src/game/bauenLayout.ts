/**
 * Where the parts of a "Bauen" task stand in the 1600 by 1000 world (contracts/screens.md "Bauen und Malen"), and which
 * square a tap hits (FR-024b). Pure, so it has unit tests.
 *
 * - The "So soll es aussehen" card on the left (TARGET_CARD).
 * - The field with the building the child builds, its ground middle at (560, 640) (FIELD).
 * - The plan card "Bauplan" on the right, between x 960 and 1500 (PLAN_INPUT).
 *
 * Squares are `{ row, col }`: row 0 is the back, the last row is "vorn".
 */
import type { Plan } from '../core/geometry/plan';
import { buildingProjector, towerOutline, type Point, type Projector } from './iso';

export interface Square {
  row: number;
  col: number;
}

export type Size = 2 | 3;

/** The field: the ground middle of the building, and the cube width per plan size. */
export const FIELD = { x: 560, y: 640, cube: { 2: 80, 3: 66 } } as const;

/**
 * The card with the finished building: its box, the cube width per plan size, and how far down the card the building's
 * ground middle is, so a stack of 4 stays below the title.
 */
export const TARGET_CARD = { x: 40, y: 400, width: 300, height: 360, cube: { 2: 40, 3: 34 }, groundY: 285 } as const;

/** The plan card: its middle on x, its top, and the side of one plan square per plan size. */
export const PLAN_INPUT = { cx: 1230, y: 400, cell: { 2: 112, 3: 92 }, title: 54, pad: 32, under: 46 } as const;

export function sizeOf(plan: Plan): Size {
  return plan.length >= 3 ? 3 : 2;
}

/** The projector of the field's building over a plan of `size`. */
export function fieldProjector(size: Size): Projector {
  return buildingProjector(size, size, FIELD.x, FIELD.y, FIELD.cube[size]);
}

/** The plan card's box and its grid: top left corner (x0, y0) and square side `c`. */
export function planInputBox(size: Size): { x: number; y: number; width: number; height: number; x0: number; y0: number; c: number } {
  const c = PLAN_INPUT.cell[size];
  const width = size * c + PLAN_INPUT.pad * 2;
  const height = PLAN_INPUT.title + size * c + PLAN_INPUT.under;
  const x = PLAN_INPUT.cx - width / 2;
  return { x, y: PLAN_INPUT.y, width, height, x0: x + PLAN_INPUT.pad, y0: PLAN_INPUT.y + PLAN_INPUT.title, c };
}

/** The plan square under world point (x, y), or null. */
export function planSquareAt(size: Size, x: number, y: number): Square | null {
  const { x0, y0, c } = planInputBox(size);
  const col = Math.floor((x - x0) / c);
  const row = Math.floor((y - y0) / c);
  return row >= 0 && row < size && col >= 0 && col < size ? { row, col } : null;
}

/** True when `p` lies inside the polygon `poly` (ray casting). */
export function insidePolygon(poly: readonly Point[], p: Point): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * The square of the field under world point (x, y): a tower drawn there, or its ground tile when it has no cube. The
 * nearest square to the viewer wins, as it is drawn on top. `heights` are the stacks on the field now.
 */
export function fieldSquareAt(heights: readonly (readonly number[])[], x: number, y: number): Square | null {
  const size = sizeOf(heights as Plan);
  const P = fieldProjector(size);
  let best: Square | null = null;
  let depth = -1;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const outline = towerOutline(P, row, col, heights[row]?.[col] ?? 0);
      if (row + col > depth && insidePolygon(outline, [x, y])) {
        best = { row, col };
        depth = row + col;
      }
    }
  }
  return best;
}
