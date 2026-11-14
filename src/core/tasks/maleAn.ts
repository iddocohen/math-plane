/**
 * "Male an" (FR-023, FR-025 to FR-027, research R6 and R8): the task and the check of the colored outlines.
 *
 * - `generateMaleAn` builds a building with mixed pieces seen from one side of the content. With cylinders and spheres
 *   off (`content.mixed` false) it has boxes only. Every piece shows at least a quarter of its outline from that side,
 *   so each region can be tapped (research R6).
 * - A region is the visible outline of one piece, named by the piece's index (`hitTest` returns it). Its mark id is
 *   `"r<index>"`.
 * - The palette is the building's distinct colors in the fixed order of `PIECE_COLORS` (research R8).
 * - `checkRegions` lists every region whose chosen color differs from its piece's color, empty regions included.
 */
import { generateMixed, hitTest, mixedView, type MixedBuilding, type MixedView } from '../geometry/mixed';
import type { PlanLimits } from '../geometry/plan';
import type { Rng } from '../rng';
import type { Level, Side } from '../types';
import { PIECE_COLORS } from './colors';
import type { MaleAnTask } from './types';

/** The grid of "Male an" buildings when the content gives none: 3×3, pieces up to 3 high. */
export const MALE_AN_PLAN: PlanLimits = { size: 3, minStack: 0, maxStack: 3 };

/** The color chosen for each piece's region, by piece index; null for a region not filled yet. */
export type RegionColors = (string | null)[];

interface Ident {
  id: string;
  seed: number;
  level: Level;
}

/** The mark id of the region of piece `index`. */
export function regionId(index: number): string {
  return `r${index}`;
}

/** The building's distinct colors in the order of `PIECE_COLORS`. */
export function paletteOf(b: MixedBuilding): string[] {
  const used = new Set(b.pieces.map((p) => p.color));
  return [...PIECE_COLORS.filter((c) => used.has(c)), ...[...used].filter((c) => !(PIECE_COLORS as readonly string[]).includes(c))];
}

export function generateMaleAn(rng: Rng, ident: Ident, sides: readonly Side[], mixed: boolean, limits: PlanLimits = MALE_AN_PLAN): MaleAnTask {
  const side = sides.length > 0 ? rng.pick(sides) : 'vorn';
  const building = generateMixed(rng, { size: limits.size, maxStack: Math.max(2, limits.maxStack), sides: [side], mixed });
  return { ...ident, kind: 'maleAn', mode: 'bauenMalen', side, building, view: mixedView(building, side), palette: paletteOf(building) };
}

/** The pieces that show in `view`, by index, in the order of their outlines (back to front). */
export function regionsOf(view: Pick<MixedView, 'outlines'>): number[] {
  return [...new Set(view.outlines.map((o) => o.pieceIndex))];
}

/** Samples per grid unit when looking for a point inside a region. */
const SAMPLES = 8;

/**
 * A point of the view (grid units, y up) inside the visible part of piece `index`'s region: the middle of its visible
 * samples when that lies in the region, else the visible sample nearest to that middle. Null when nothing shows.
 * Views use it to place a tap in tests and a color dot of the help (US5).
 */
export function regionPoint(view: Pick<MixedView, 'outlines' | 'width' | 'height'>, index: number): { x: number; y: number } | null {
  const inside: Array<{ x: number; y: number }> = [];
  for (let sy = 0; sy < view.height * SAMPLES; sy++) {
    for (let sx = 0; sx < view.width * SAMPLES; sx++) {
      const p = { x: (sx + 0.5) / SAMPLES, y: (sy + 0.5) / SAMPLES };
      if (hitTest(view, p.x, p.y) === index) inside.push(p);
    }
  }
  if (inside.length === 0) return null;
  const mid = { x: inside.reduce((s, p) => s + p.x, 0) / inside.length, y: inside.reduce((s, p) => s + p.y, 0) / inside.length };
  if (hitTest(view, mid.x, mid.y) === index) return mid;
  const dist = (p: { x: number; y: number }) => (p.x - mid.x) ** 2 + (p.y - mid.y) ** 2;
  return inside.reduce((best, p) => (dist(p) < dist(best) ? p : best));
}

/** The regions of `task` whose color in `colors` differs from the piece's color, empty ones included (research R8). */
export function checkRegions(task: Pick<MaleAnTask, 'building' | 'view'>, colors: RegionColors): number[] {
  return regionsOf(task.view)
    .filter((i) => colors[i] !== task.building.pieces[i]!.color)
    .sort((a, b) => a - b);
}
