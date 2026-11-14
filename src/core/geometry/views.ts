/**
 * Views of cube buildings (data-model.md "CubeView", research R3 and R7). A view is a grid of filled squares, row 0 at
 * the top. Side views have the ground in the bottom row ("unten"); the top view has "vorn" in the bottom row.
 */
import type { Side } from '../types';
import type { Plan } from './plan';

export interface CubeView {
  side: Side;
  /** `cells[row][col]`, row 0 at the top. */
  cells: boolean[][];
  /** Rows of the grid: the grid height asked for side views, the plan's rows for `oben`. */
  height: number;
  /** The filled grid as text (research R7); equal views have equal signatures, whatever side they come from. */
  signature: string;
}

/** Anything with a signature: cube views now, mixed views later (research R7). */
export interface View {
  signature: string;
}

/** The grid as text: `#` for a filled square, `.` for an empty one, rows joined with `/` from the top. */
export function signature(cells: readonly (readonly boolean[])[]): string {
  return cells.map((row) => row.map((c) => (c ? '#' : '.')).join('')).join('/');
}

/** True when both views show the same grid (research R7). */
export function viewsEqual(a: View, b: View): boolean {
  return a.signature === b.signature;
}

/** The heights seen from `side`, left to right as the viewer sees them (research R3). */
function columnHeights(p: Plan, side: Exclude<Side, 'oben'>): number[] {
  const rows = p.length;
  const cols = p[0]?.length ?? 0;
  const maxOf = (values: number[]) => Math.max(0, ...values);
  if (side === 'vorn') return Array.from({ length: cols }, (_, j) => maxOf(p.map((row) => row[j]!)));
  // rechts: the viewer stands at the right and looks left, so their left is the front row.
  if (side === 'rechts') return Array.from({ length: rows }, (_, j) => maxOf(p[rows - 1 - j]!));
  // links: the hidden back-left side; column j is row j.
  return Array.from({ length: rows }, (_, j) => maxOf(p[j]!));
}

/**
 * The view of the cube building with plan `p` from `side` (research R3). Side views are `gridHeight` rows high, so every
 * side view of a level has the same size; a stack taller than the grid is cut at its top row. The top view is the plan
 * footprint, with the plan's rows, "vorn" at the bottom.
 */
export function cubeView(p: Plan, side: Side, gridHeight: number): CubeView {
  if (side === 'oben') {
    const cells = p.map((row) => row.map((h) => h > 0));
    return { side, cells, height: p.length, signature: signature(cells) };
  }
  const heights = columnHeights(p, side);
  const cells = Array.from({ length: gridHeight }, (_, r) => {
    const z = gridHeight - 1 - r;
    return heights.map((h) => h > z);
  });
  return { side, cells, height: gridHeight, signature: signature(cells) };
}

/** A view with the grid `cells`, for cards made from another view (research R7). */
export function viewFromCells(side: Side, cells: boolean[][]): CubeView {
  return { side, cells, height: cells.length, signature: signature(cells) };
}

/** The view seen in a mirror: left and right swap (a wrong card, research R7). */
export function mirrorCubeView(v: CubeView): CubeView {
  return viewFromCells(
    v.side,
    v.cells.map((row) => [...row].reverse()),
  );
}

/**
 * Views like `v` with one column changed (a wrong card, research R7): a side view with one column one square higher or
 * lower, the top view with one square switched. Views with no filled square are left out.
 */
export function oneColumnChanged(v: CubeView): CubeView[] {
  const rows = v.cells.length;
  const cols = v.cells[0]?.length ?? 0;
  const out: CubeView[] = [];
  const keep = (cells: boolean[][]) => {
    if (cells.some((row) => row.includes(true))) out.push(viewFromCells(v.side, cells));
  };
  if (v.side === 'oben') {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) keep(v.cells.map((row, i) => row.map((on, j) => (i === r && j === c ? !on : on))));
    return out;
  }
  for (let c = 0; c < cols; c++) {
    const height = v.cells.filter((row) => row[c]).length;
    for (const next of [height - 1, height + 1]) {
      if (next < 0 || next > rows) continue;
      keep(v.cells.map((row, i) => row.map((on, j) => (j === c ? rows - 1 - i < next : on))));
    }
  }
  return out;
}
