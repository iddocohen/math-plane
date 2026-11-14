/**
 * Where the parts of a "Malen" or "Male an" task stand in the 1600 by 1000 world (contracts/screens.md "Bauen und
 * Malen"), and what a tap on the grid hits. Pure, so it has unit tests.
 *
 * - The building stands on the field as in "Bauen" (bauenLayout.ts `FIELD`), the eye beside it.
 * - The card with the paint grid stands on the right, between x 960 and 1500 (GRID_CARD).
 *
 * Grid squares are `{ row, col }`, row 0 at the top. Points of a mixed view are in grid units with y up, as
 * core/geometry/mixed.ts has them.
 */
import type { Square } from './bauenLayout';

/**
 * The grid card: its middle on x, its top, the largest grid side and square, and the card's margins. The side lets a
 * grid 4 squares high (stacks of 4) keep squares of 95 units, which an iPad held upright (768 px for 1600 units) shows
 * at 45.6 CSS px, above the 44 px a finger needs (critique P7, tests/e2e/devices.spec.ts).
 */
export const GRID_CARD = { cx: 1230, y: 390, side: 380, cellMax: 110, title: 54, pad: 32, under: 46 } as const;

export interface GridBox {
  /** The card. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** The grid's top left corner and the side of one square. */
  x0: number;
  y0: number;
  c: number;
}

/** The card and the grid of a view `cols` squares wide and `rows` high. */
export function gridBox(cols: number, rows: number): GridBox {
  const c = Math.min(GRID_CARD.cellMax, Math.floor(GRID_CARD.side / Math.max(cols, rows, 1)));
  const width = cols * c + GRID_CARD.pad * 2;
  const height = GRID_CARD.title + rows * c + GRID_CARD.under;
  const x = GRID_CARD.cx - width / 2;
  return { x, y: GRID_CARD.y, width, height, x0: x + GRID_CARD.pad, y0: GRID_CARD.y + GRID_CARD.title, c };
}

/** The grid square under world point (x, y), or null. */
export function gridSquareAt(cols: number, rows: number, x: number, y: number): Square | null {
  const { x0, y0, c } = gridBox(cols, rows);
  const col = Math.floor((x - x0) / c);
  const row = Math.floor((y - y0) / c);
  return row >= 0 && row < rows && col >= 0 && col < cols ? { row, col } : null;
}

/** The point of a view (grid units, y up) under world point (x, y), or null outside the grid. */
export function viewPointAt(cols: number, rows: number, x: number, y: number): { x: number; y: number } | null {
  const { x0, y0, c } = gridBox(cols, rows);
  const vx = (x - x0) / c;
  const vy = rows - (y - y0) / c;
  return vx >= 0 && vx <= cols && vy >= 0 && vy <= rows ? { x: vx, y: vy } : null;
}

/** The world point of the view point (vx, vy) (grid units, y up). */
export function worldOfViewPoint(cols: number, rows: number, vx: number, vy: number): [number, number] {
  const { x0, y0, c } = gridBox(cols, rows);
  return [x0 + vx * c, y0 + (rows - vy) * c];
}
